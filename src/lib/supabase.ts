// ÚNICA puerta de entrada a Supabase.
// Ningún componente habla con la base de datos directamente: todos usan el store
// (src/lib/tienda/cafeteria.svelte.ts) y el store usa este archivo.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';
import type { Mesa, Pedido, PedidoItem, Producto } from './tipos';

// Las credenciales vienen del archivo .env (nunca se escriben en el código).
const url = PUBLIC_SUPABASE_URL;
const anonKey = PUBLIC_SUPABASE_ANON_KEY;

// Si falta el .env lo detectamos aquí para poder avisar con un mensaje claro.
export const faltaConfiguracion = url === '' || anonKey === '';

// El cliente es null hasta que haya credenciales válidas.
export const supabase: SupabaseClient | null = faltaConfiguracion
	? null
	: createClient(url, anonKey, {
			auth: { persistSession: false }
		});

function cliente(): SupabaseClient {
	if (!supabase) {
		throw new Error(
			'No se encontró la configuración de Supabase. Copia .env.example a .env y rellena PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.'
		);
	}
	return supabase;
}

// --------------------------------------------------------------------------
// Lecturas
// --------------------------------------------------------------------------

export async function cargarMesas(): Promise<Mesa[]> {
	const { data, error } = await cliente().from('mesas').select('*').order('numero');
	if (error) throw new Error(`No se pudieron cargar las mesas: ${error.message}`);
	return (data ?? []) as Mesa[];
}

export async function cargarProductos(): Promise<Producto[]> {
	const { data, error } = await cliente().from('productos').select('*').order('nombre');
	if (error) throw new Error(`No se pudo cargar el menú: ${error.message}`);
	return (data ?? []) as Producto[];
}

export async function cargarPedidos(): Promise<Pedido[]> {
	const { data, error } = await cliente().from('pedidos').select('*');
	if (error) throw new Error(`No se pudieron cargar los pedidos: ${error.message}`);
	return (data ?? []) as Pedido[];
}

export async function cargarItemsPedido(): Promise<PedidoItem[]> {
	const { data, error } = await cliente().from('pedido_items').select('*');
	if (error) throw new Error(`No se pudieron cargar las líneas del pedido: ${error.message}`);
	return (data ?? []) as PedidoItem[];
}

// --------------------------------------------------------------------------
// Escrituras (usan funciones de supabase/schema.sql para que todo o nada)
// --------------------------------------------------------------------------

/** Añade un producto al pedido abierto de la mesa (crea el pedido si no existe). */
export async function anadirProducto(
	mesaId: string,
	productoId: string,
	cantidad: number
): Promise<void> {
	const { error } = await cliente().rpc('anadir_producto', {
		p_mesa_id: mesaId,
		p_producto_id: productoId,
		p_cantidad: cantidad
	});
	if (error) throw new Error(`No se pudo añadir el producto: ${error.message}`);
}

/** Resta una unidad de una línea del pedido (la borra si era la última). */
export async function restarProducto(itemId: string): Promise<void> {
	const { error } = await cliente().rpc('restar_producto', {
		p_item_id: itemId
	});
	if (error) throw new Error(`No se pudo restar el producto: ${error.message}`);
}

/** Quita por completo un producto del pedido (todas sus líneas del mismo precio). */
export async function quitarProducto(itemId: string): Promise<void> {
	const { error } = await cliente().rpc('quitar_producto', {
		p_item_id: itemId
	});
	if (error) throw new Error(`No se pudo quitar el producto: ${error.message}`);
}

/** Cambia el estado de la mesa. Si es 'libre', además cierra el pedido abierto. */
export async function cambiarEstadoMesa(mesaId: string, estado: string): Promise<number> {
	const { data, error } = await cliente().rpc('cambiar_estado_mesa', {
		p_mesa_id: mesaId,
		p_estado: estado
	});
	if (error) throw new Error(`No se pudo cambiar el estado de la mesa: ${error.message}`);
	return Number(data ?? 0);
}

/** Suma lo cobrado hoy entre los dos instantes que le pasa el store. */
export async function ventasDelDia(inicio: string, fin: string): Promise<number> {
	const { data, error } = await cliente().rpc('ventas_del_dia', {
		p_inicio: inicio,
		p_fin: fin
	});
	if (error) throw new Error(`No se pudieron calcular las ventas: ${error.message}`);
	return Number(data ?? 0);
}

// --------------------------------------------------------------------------
// Realtime: avisamos con un callback cada vez que algo cambia en la base.
// --------------------------------------------------------------------------

/** Escucha cambios y devuelve la función para dejar de escuchar. */
export function escucharCambios(alCambiar: () => void): () => void {
	const canal = cliente()
		.channel('gemelo-cafeteria')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, alCambiar)
		.on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, alCambiar)
		.on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, alCambiar)
		.subscribe();

	return () => {
		void cliente().removeChannel(canal);
	};
}