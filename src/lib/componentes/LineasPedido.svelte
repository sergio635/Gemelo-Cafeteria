<script lang="ts">
	// Las líneas del pedido de una mesa: qué se ha pedido, cuántas unidades
	// y a qué precio se pidió (ese precio ya no cambia aunque el menú suba).
	// Cada línea permite restar una unidad (−) o quitar el producto entero (✕).
	import { euros } from '#lib/tienda/cafeteria.svelte.ts';
	import type { LineaPedido } from '#lib/tipos.ts';

	interface Props {
		lineas: LineaPedido[];
		guardando: boolean;
		alRestar: (itemId: string) => void;
		alQuitar: (itemId: string) => void;
	}

	let { lineas, guardando, alRestar, alQuitar }: Props = $props();
</script>

<div>
	<h3 class="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
		Pedido de la mesa
	</h3>

	{#if lineas.length === 0}
		<p class="text-sm text-slate-500">
			Aún no hay nada pedido. Toca un producto del menú para empezar.
		</p>
	{:else}
		<ul class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
			{#each lineas as linea (linea.id)}
				<li class="flex items-center justify-between gap-3 px-3 py-2">
					<div class="min-w-0">
						<p class="truncate text-sm font-medium text-slate-900">
							{linea.cantidad} × {linea.producto_nombre}
						</p>
						<p class="text-xs text-slate-400 tabular-nums">
							{euros(linea.precio_unitario)} cada uno
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<button
							type="button"
							aria-label="Restar una unidad de {linea.producto_nombre}"
							disabled={guardando}
							onclick={() => alRestar(linea.id)}
							class="h-8 w-8 rounded-lg border border-slate-200 bg-white text-base leading-none
								font-bold text-slate-600 hover:border-slate-400
								disabled:cursor-not-allowed disabled:opacity-40"
						>
							−
						</button>
						<button
							type="button"
							aria-label="Quitar {linea.producto_nombre} del pedido"
							disabled={guardando}
							onclick={() => alQuitar(linea.id)}
							class="h-8 w-8 rounded-lg border border-rose-200 bg-white text-xs font-bold
								text-rose-600 hover:border-rose-400
								disabled:cursor-not-allowed disabled:opacity-40"
						>
							✕
						</button>
						<span class="text-right text-sm font-semibold text-slate-900 tabular-nums">
							{euros(linea.cantidad * linea.precio_unitario)}
						</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
