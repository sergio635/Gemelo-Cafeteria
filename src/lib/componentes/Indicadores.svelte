<script lang="ts">
	// Barra superior con los 3 indicadores grandes: mesas ocupadas,
	// porcentaje de ocupación y ventas acumuladas de hoy.
	import { euros } from '#lib/tienda/cafeteria.svelte.ts';

	interface Props {
		mesasOcupadas: number;
		totalMesas: number;
		porcentaje: number;
		ventas: number;
	}

	let { mesasOcupadas, totalMesas, porcentaje, ventas }: Props = $props();

	const indicadores = $derived([
		{
			nombre: 'Mesas ocupadas',
			valor: String(mesasOcupadas),
			detalle: `de ${totalMesas} mesas`,
			clases: 'bg-slate-900 text-white'
		},
		{
			nombre: 'Ocupación',
			valor: `${porcentaje} %`,
			detalle: 'del local ahora mismo',
			clases: 'bg-amber-100 text-amber-950'
		},
		{
			nombre: 'Ventas de hoy',
			valor: euros(ventas),
			detalle: 'pedidos ya cerrados',
			clases: 'bg-emerald-500 text-white'
		}
	]);
</script>

<header class="bg-white px-4 pt-5 pb-4 shadow-sm sm:px-6">
	<div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
		<div class="mr-auto">
			<h1 class="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
				Gemelo Cafetería
			</h1>
			<p class="text-sm text-slate-500">Plano del local en tiempo real</p>
		</div>

		<div class="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
			{#each indicadores as indicador (indicador.nombre)}
				<div
					class="rounded-2xl px-4 py-3 {indicador.clases} sm:min-w-40 sm:text-right"
				>
					<p class="text-xs font-medium tracking-wide uppercase opacity-80">
						{indicador.nombre}
					</p>
					<p class="text-2xl font-bold tabular-nums sm:text-3xl">{indicador.valor}</p>
					<p class="text-xs opacity-70">{indicador.detalle}</p>
				</div>
			{/each}
		</div>
	</div>
</header>