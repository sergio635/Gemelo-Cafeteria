<script lang="ts">
	// Menú de la cafetería: la lista de productos que se pueden pedir.
	// Cada botón añade una unidad de ese producto al pedido de la mesa.
	import { euros } from '#lib/tienda/cafeteria.svelte.ts';
	import type { Producto } from '#lib/tipos.ts';

	interface Props {
		productos: Producto[];
		guardando: boolean;
		alAñadir: (productoId: string) => void;
	}

	let { productos, guardando, alAñadir }: Props = $props();
</script>

<div>
	<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Menú</h3>

	{#if productos.length === 0}
		<p class="text-sm text-slate-500">No hay productos en la base de datos todavía.</p>
	{:else}
		<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each productos as producto (producto.id)}
				<li>
					<button
						type="button"
						onclick={() => alAñadir(producto.id)}
						disabled={guardando}
						class="flex w-full flex-col items-start rounded-xl border border-slate-200 bg-white
							px-3 py-2 text-left hover:border-slate-400 hover:bg-slate-50
							disabled:cursor-not-allowed disabled:opacity-50"
					>
						<span class="text-sm font-medium text-slate-900">{producto.nombre}</span>
						<span class="text-xs text-slate-500 tabular-nums">{euros(producto.precio)}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>