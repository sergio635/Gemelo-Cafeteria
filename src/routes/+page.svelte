<script lang="ts">
	// Página única de Gemelo Cafetería: la barra de indicadores, el plano con
	// las mesas y el panel lateral de la mesa seleccionada.
	import { onMount } from 'svelte';
	import Aviso from '#lib/componentes/Aviso.svelte';
	import Indicadores from '#lib/componentes/Indicadores.svelte';
	import Mesa from '#lib/componentes/Mesa.svelte';
	import PanelMesa from '#lib/componentes/PanelMesa.svelte';
	import cafeteria from '#lib/tienda/cafeteria.svelte.ts';
	import type { EstadoMesa } from '#lib/tipos.ts';

	// Al entrar en la página cargamos los datos y nos suscribimos a Realtime.
	// Al salir dejamos de escuchar para no dejar conexiones abiertas.
	onMount(() => {
		void cafeteria.iniciar();
		return () => cafeteria.parar();
	});

	const mesaSeleccionada = $derived(cafeteria.mesaSeleccionada);
	const lineas = $derived(
		mesaSeleccionada ? cafeteria.lineasDe(mesaSeleccionada.id) : []
	);
	const total = $derived(mesaSeleccionada ? cafeteria.totalDe(mesaSeleccionada.id) : 0);
</script>

<svelte:head>
	<title>Gemelo Cafetería</title>
</svelte:head>

<div class="min-h-dvh bg-slate-100 text-slate-900">
	<Indicadores
		mesasOcupadas={cafeteria.mesasOcupadas}
		totalMesas={cafeteria.mesas.length}
		porcentaje={cafeteria.porcentajeOcupacion}
		ventas={cafeteria.ventasHoy}
	/>

	<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
		{#if cafeteria.cargando}
			<p class="py-16 text-center text-slate-500">Cargando la cafetería…</p>
		{:else if cafeteria.error && cafeteria.mesas.length === 0}
			<!-- No hay datos: el problema es la conexión, así que mostramos el aviso entero. -->
			<Aviso
				titulo="No se puede conectar con Supabase"
				mensaje={cafeteria.error}
				boton="Reintentar"
				alPulsar={() => void cafeteria.refrescar()}
			/>
		{:else}
			<h2 class="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">
				Plano del local · toca una mesa
			</h2>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{#each cafeteria.mesas as mesa (mesa.id)}
					<Mesa
						{mesa}
						minutos={cafeteria.minutosOcupada(mesa.id)}
						seleccionada={mesaSeleccionada?.id === mesa.id}
						alElegir={(mesaId) => cafeteria.abrirMesa(mesaId)}
					/>
				{/each}
			</div>

			{#if cafeteria.error}
				<!-- Hay datos pero una acción ha fallado: solo lo avisamos abajo. -->
				<p class="mt-4 rounded-xl bg-rose-100 px-4 py-3 text-sm text-rose-800">
					{cafeteria.error}
				</p>
			{/if}
		{/if}
	</main>

	{#if mesaSeleccionada}
		<PanelMesa
			mesa={mesaSeleccionada}
			productos={cafeteria.productos}
			{lineas}
			{total}
			minutos={cafeteria.minutosOcupada(mesaSeleccionada.id)}
			guardando={cafeteria.guardando}
			alCerrar={() => cafeteria.cerrarPanel()}
			alAñadir={(productoId) => cafeteria.anadir(mesaSeleccionada.id, productoId)}
			alRestar={(itemId) => cafeteria.restar(itemId)}
			alQuitar={(itemId) => cafeteria.quitar(itemId)}
			alCambiarEstado={(estado: EstadoMesa) =>
				cafeteria.cambiarEstado(mesaSeleccionada.id, estado)}
		/>
	{/if}
</div>