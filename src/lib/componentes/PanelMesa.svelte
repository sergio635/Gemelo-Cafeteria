<script lang="ts">
	// Panel lateral de una mesa: cambiar su estado, añadir, restar o quitar
	// productos, ver el pedido, la hora de apertura y el total, y cerrarla para cobrar.
	import { ESTADOS_MESA, LISTA_ESTADOS } from '#lib/estados.ts';
	import LineasPedido from './LineasPedido.svelte';
	import MenuProductos from './MenuProductos.svelte';
	import { euros, MINUTOS_MESA_LENTA, tiempoTranscurrido } from '#lib/tienda/cafeteria.svelte.ts';
	import type { EstadoMesa, LineaPedido, Mesa, Producto } from '#lib/tipos.ts';

	interface Props {
		mesa: Mesa;
		productos: Producto[];
		lineas: LineaPedido[];
		total: number;
		minutos: number | null;
		guardando: boolean;
		alCerrar: () => void;
		alAñadir: (productoId: string) => void;
		alRestar: (itemId: string) => void;
		alQuitar: (itemId: string) => void;
		alCambiarEstado: (estado: EstadoMesa) => void;
	}

	let {
		mesa,
		productos,
		lineas,
		total,
		minutos,
		guardando,
		alCerrar,
		alAñadir,
		alRestar,
		alQuitar,
		alCambiarEstado
	}: Props = $props();

	const aspecto = $derived(ESTADOS_MESA[mesa.estado]);
	const hayPedidoAbierto = $derived(lineas.length > 0);
	const urgente = $derived(minutos !== null && minutos >= MINUTOS_MESA_LENTA);
</script>

<svelte:window onkeydown={(evento) => evento.key === 'Escape' && alCerrar()} />

<div class="fixed inset-0 z-40">
	<!-- Fondo semitransparente: al pulsarlo se cierra el panel. -->
	<button
		type="button"
		aria-label="Cerrar panel de la mesa"
		onclick={alCerrar}
		class="absolute inset-0 h-full w-full bg-slate-900/40"
	></button>

	<!-- En móvil sale desde abajo; en escritorio, desde la derecha. -->
	<aside
		class="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col gap-5 overflow-y-auto rounded-t-3xl
			bg-slate-50 p-4 pb-8 shadow-2xl
			sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 sm:max-h-none sm:rounded-t-none sm:rounded-l-3xl sm:p-6"
	>
		<!-- Cabecera del panel -->
		<header class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-2xl font-bold text-slate-900">Mesa {mesa.numero}</h2>
				<p
					class="mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold {aspecto.etiqueta}
						{urgente ? 'ring-2 ring-amber-500' : ''}"
				>
					{aspecto.texto}
				</p>
			</div>
			<button
				type="button"
				onclick={alCerrar}
				aria-label="Cerrar panel"
				class="rounded-full bg-white px-3 py-1.5 text-slate-500 shadow-sm hover:text-slate-900"
			>
				✕
			</button>
		</header>

		<p class="text-sm text-slate-500">{aspecto.descripcion}</p>

		{#if mesa.ocupada_desde}
			<p class="text-xs italic {urgente ? 'font-semibold text-amber-700' : 'text-slate-400'}">
				Abierta a las {new Date(mesa.ocupada_desde).toLocaleTimeString('es-ES', {
					hour: '2-digit',
					minute: '2-digit'
				})}
				{#if minutos !== null}
					· {tiempoTranscurrido(minutos)}
				{/if}
			</p>
		{/if}

		<!-- Cambiar el estado -->
		<section>
			<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
				Cambiar estado
			</h3>
			<div class="grid grid-cols-3 gap-2">
				{#each LISTA_ESTADOS as estado (estado)}
					<button
						type="button"
						onclick={() => alCambiarEstado(estado)}
						disabled={guardando || estado === mesa.estado}
						class="rounded-xl border px-2 py-2 text-xs font-semibold
							{estado === mesa.estado
							? 'border-slate-900 bg-slate-900 text-white'
							: 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}
							disabled:cursor-not-allowed"
					>
						{ESTADOS_MESA[estado].texto}
					</button>
				{/each}
			</div>
			<p class="mt-2 text-xs text-slate-400">
				Si la pones en «Libre», el pedido abierto se cierra y la mesa queda lista.
			</p>
		</section>

		<LineasPedido {lineas} {guardando} {alRestar} {alQuitar} />

		<MenuProductos {productos} {guardando} {alAñadir} />

		<!-- Total y cierre -->
		<footer class="mt-auto space-y-3 rounded-2xl bg-white p-4 shadow-sm">
			<div class="flex items-baseline justify-between">
				<span class="text-sm font-medium text-slate-500">Total de la mesa</span>
				<span class="text-2xl font-bold text-slate-900 tabular-nums">{euros(total)}</span>
			</div>

			<button
				type="button"
				onclick={() => alCambiarEstado('libre')}
				disabled={guardando || !hayPedidoAbierto || mesa.estado === 'libre'}
				class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white
					hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
			>
				{hayPedidoAbierto && mesa.estado !== 'libre'
					? `Cerrar mesa y cobrar ${euros(total)}`
					: 'Cerrar mesa'}
			</button>
		</footer>
	</aside>
</div>