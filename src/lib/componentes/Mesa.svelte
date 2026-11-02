<script lang="ts">
	// Una mesa del plano. Muestra su número, un punto de color con su estado
	// y el tiempo que lleva ocupada (en ámbar si supera el límite). Sirve de
	// botón para abrir el panel lateral de esa mesa.
	import { ESTADOS_MESA } from '#lib/estados.ts';
	import { MINUTOS_MESA_LENTA, tiempoTranscurrido } from '#lib/tienda/cafeteria.svelte.ts';
	import type { Mesa } from '#lib/tipos.ts';

	interface Props {
		mesa: Mesa;
		minutos?: number | null;
		seleccionada?: boolean;
		alElegir: (mesaId: string) => void;
	}

	let { mesa, minutos = null, seleccionada = false, alElegir }: Props = $props();

	const aspecto = $derived(ESTADOS_MESA[mesa.estado]);
	const urgente = $derived(minutos !== null && minutos >= MINUTOS_MESA_LENTA);
</script>

<button
	type="button"
	onclick={() => alElegir(mesa.id)}
	aria-label="Mesa {mesa.numero}: {aspecto.texto}"
	aria-pressed={seleccionada}
	class="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border-2
		{aspecto.mesa}
		{seleccionada ? 'ring-2 ring-slate-900 ring-offset-2' : urgente ? 'ring-2 ring-amber-500 ring-offset-2' : ''}
		transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
>
	<span class="text-3xl font-bold tabular-nums sm:text-4xl">{mesa.numero}</span>
	<span class="flex items-center gap-1.5 text-xs font-medium sm:text-sm">
		<span class="h-2 w-2 rounded-full {aspecto.punto}"></span>
		{aspecto.texto}
	</span>
	{#if minutos !== null}
		<!-- Línea aparte para que el texto del estado no desborde en móvil. -->
		<span class="text-xs tabular-nums {urgente ? 'font-semibold text-amber-700' : 'text-slate-500'}">
			{tiempoTranscurrido(minutos)}
		</span>
	{/if}
</button>