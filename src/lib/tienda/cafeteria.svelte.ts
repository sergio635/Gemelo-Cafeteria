// Store de la cafetería (estado global de la aplicación).
// Aquí se guardan las mesas, el menú y los pedidos, y aquí se llama a Supabase.
// Los componentes solo leen este store y llaman a sus métodos: nunca importan
// el cliente de Supabase directamente.

import { browser } from '$app/env';
import {
	anadirProducto as anadirProductoSupabase,
	cambiarEstadoMesa as cambiarEstadoMesaSupabase,
	cargarItemsPedido,
	cargarMesas,
	cargarPedidos,
	cargarProductos,
	escucharCambios,
	faltaConfiguracion,
	quitarProducto as quitarProductoSupabase,
	restarProducto as restarProductoSupabase,
	ventasDelDia as ventasDelDiaSupabase
} from '../supabase';
import type { EstadoMesa, LineaPedido, Mesa, Pedido, PedidoItem, Producto } from '../tipos';

// Devuelve el inicio y el fin del día de HOY en la zona horaria del navegador.
// Importante: se usa la fecha local del usuario, nunca UTC, para que las ventas
// del día sean las del día que ve en su pantalla.
function inicioYFinDeHoy(): { inicio: string; fin: string } {
	const ahora = new Date();
	const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
	const fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
	return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}

class Cafeteria {
	// --- Estado de la interfaz ---
	cargando = $state(true);
	error = $state<string | null>(null);
	guardando = $state(false);
	mesaSeleccionadaId = $state<string | null>(null);
	// Reloj local: avanza cada 30 s para que el tiempo de ocupación se actualice solo.
	ahora = $state(Date.now());

	// --- Datos que vienen de Supabase ---
	mesas = $state<Mesa[]>([]);
	productos = $state<Producto[]>([]);
	pedidos = $state<Pedido[]>([]);
	items = $state<PedidoItem[]>([]);
	ventasHoy = $state(0);

	// Campos internos que NO necesita ver la interfaz.
	nombres = $derived(new Map(this.productos.map((p) => [p.id, p.nombre])));
	refrescando = false;
	pendiente = false;
	temporizador: ReturnType<typeof setTimeout> | null = null;
	reloj: ReturnType<typeof setInterval> | null = null;
	pararEscucha: (() => void) | null = null;

	// --- Indicadores de la barra superior ---
	mesasOcupadas = $derived(this.mesas.filter((m) => m.estado !== 'libre').length);

	porcentajeOcupacion = $derived(
		this.mesas.length === 0 ? 0 : Math.round((this.mesasOcupadas / this.mesas.length) * 100)
	);

	// --- Datos de la mesa abierta en el panel ---
	mesaSeleccionada = $derived(
		this.mesas.find((m) => m.id === this.mesaSeleccionadaId) ?? null
	);

	/** El pedido abierto de una mesa (o null si la mesa está libre). */
	pedidoAbierto(mesaId: string): Pedido | null {
		return (
			this.pedidos.find((p) => p.mesa_id === mesaId && p.estado === 'abierto') ?? null
		);
	}

	/** Las líneas del pedido abierto de una mesa, ya con el nombre del producto. */
	lineasDe(mesaId: string): LineaPedido[] {
		const pedido = this.pedidoAbierto(mesaId);
		if (!pedido) return [];

		// Si el mismo producto se pide dos veces, mostramos una sola línea con
		// la cantidad sumada.
		const lineas = new Map<string, LineaPedido>();
		for (const item of this.items) {
			if (item.pedido_id !== pedido.id) continue;
			const clave = `${item.producto_id}-${item.precio_unitario}`;
			const yaExiste = lineas.get(clave);
			if (yaExiste) {
				yaExiste.cantidad += item.cantidad;
			} else {
				lineas.set(clave, {
					...item,
					producto_nombre: this.nombres.get(item.producto_id) ?? 'Producto borrado'
				});
			}
		}

		return [...lineas.values()].sort((a, b) =>
			a.producto_nombre.localeCompare(b.producto_nombre, 'es')
		);
	}

	/** Total a pagar de una mesa: cantidad × precio_unitario de cada línea. */
	totalDe(mesaId: string): number {
		return this.lineasDe(mesaId).reduce(
			(suma, linea) => suma + linea.cantidad * linea.precio_unitario,
			0
		);
	}

	/**
	 * Minutos que lleva ocupada una mesa. La hora la guarda la propia mesa
	 * (ocupada_desde): cuenta tanto si se ocupó a mano como al pedir algo.
	 * Null si está libre o no tiene fecha registrada.
	 */
	minutosOcupada(mesaId: string): number | null {
		const mesa = this.mesas.find((m) => m.id === mesaId);
		if (!mesa || mesa.estado === 'libre' || !mesa.ocupada_desde) return null;
		const inicio = new Date(mesa.ocupada_desde).getTime();
		return Math.max(0, Math.floor((this.ahora - inicio) / 60000));
	}

	// --- Acciones de la interfaz ---

	abrirMesa(mesaId: string) {
		this.mesaSeleccionadaId = mesaId;
		this.error = null;
	}

	cerrarPanel() {
		this.mesaSeleccionadaId = null;
	}

	/** Añade un producto (cantidad 1) al pedido de la mesa. */
	async anadir(mesaId: string, productoId: string) {
		await this.ejecutar(async () => {
			await anadirProductoSupabase(mesaId, productoId, 1);
		});
	}

	/** Resta una unidad de una línea del pedido (si llega a 0, la línea desaparece). */
	async restar(itemId: string) {
		await this.ejecutar(async () => {
			await restarProductoSupabase(itemId);
		});
	}

	/** Quita por completo una línea del pedido, tenga las unidades que tenga. */
	async quitar(itemId: string) {
		await this.ejecutar(async () => {
			await quitarProductoSupabase(itemId);
		});
	}

	/**
	 * Cambia el estado de la mesa. Si el estado es 'libre' se cierra el pedido
	 * abierto y la mesa queda lista para el siguiente cliente.
	 */
	async cambiarEstado(mesaId: string, estado: EstadoMesa) {
		await this.ejecutar(async () => {
			await cambiarEstadoMesaSupabase(mesaId, estado);
			if (estado === 'libre') this.mesaSeleccionadaId = null;
		});
	}

	// --- Arranque, carga de datos y Realtime ---

	async iniciar() {
		if (faltaConfiguracion) {
			this.error =
				'Falta la configuración de Supabase. Copia el archivo .env.example a .env y rellena PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY. Después reinicia "npm run dev".';
			this.cargando = false;
			return;
		}

		await this.refrescar();

		if (browser && !this.pararEscucha) {
			this.pararEscucha = escucharCambios(() => {
				// Varios cambios a la vez -> esperamos un momento para refrescar una vez.
				if (this.temporizador) clearTimeout(this.temporizador);
				this.temporizador = setTimeout(() => void this.refrescar(), 250);
			});
		}

		// Reloj local: hace avanzar los minutos de las mesas sin tocar la base de datos.
		if (browser && !this.reloj) {
			this.reloj = setInterval(() => {
				this.ahora = Date.now();
			}, 30_000);
		}
	}

	/** Vuelve a leer todo de la base de datos. */
	async refrescar() {
		// Si ya estamos cargando, esperamos: así nunca se quedan datos viejos.
		if (this.refrescando) {
			this.pendiente = true;
			return;
		}

		this.refrescando = true;
		try {
			const { inicio, fin } = inicioYFinDeHoy();
			const [mesas, productos, pedidos, items, ventas] = await Promise.all([
				cargarMesas(),
				cargarProductos(),
				cargarPedidos(),
				cargarItemsPedido(),
				ventasDelDiaSupabase(inicio, fin)
			]);
			this.mesas = mesas;
			this.productos = productos;
			this.pedidos = pedidos;
			this.items = items;
			this.ventasHoy = ventas;
			this.error = null;
		} catch (fallo) {
			this.error =
				fallo instanceof Error
					? fallo.message
					: 'No se pudo conectar con Supabase. Revisa el archivo .env y que el proyecto esté activo.';
		} finally {
			this.refrescando = false;
			this.cargando = false;
			if (this.pendiente) {
				this.pendiente = false;
				void this.refrescar();
			}
		}
	}

	/** Deja de escuchar los cambios de Supabase (al salir de la página). */
	parar() {
		if (this.temporizador) clearTimeout(this.temporizador);
		if (this.reloj) clearInterval(this.reloj);
		this.reloj = null;
		if (this.pararEscucha) this.pararEscucha();
		this.pararEscucha = null;
	}

	// Ejecuta una escritura: avisa mientras guarda y refresca al terminar.
	private async ejecutar(accion: () => Promise<void>) {
		this.guardando = true;
		try {
			await accion();
			await this.refrescar();
		} catch (fallo) {
			this.error =
				fallo instanceof Error ? fallo.message : 'La operación no se pudo completar.';
		} finally {
			this.guardando = false;
		}
	}
}

// Una sola instancia para toda la aplicación.
const cafeteria = new Cafeteria();
export default cafeteria;

// Formatea un número como euros: 3.5 -> "3,50 €"
export function euros(cantidad: number): string {
	return new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: 'EUR'
	}).format(cantidad);
}

// A partir de estos minutos, el tiempo de una mesa se muestra destacado.
export const MINUTOS_MESA_LENTA = 45;

// Formatea una duración en minutos: 0 -> "ahora", 25 -> "25 min", 85 -> "1 h 25 min"
export function tiempoTranscurrido(minutos: number): string {
	if (minutos < 1) return 'ahora';
	if (minutos < 60) return `${minutos} min`;
	const horas = Math.floor(minutos / 60);
	const resto = minutos % 60;
	return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}