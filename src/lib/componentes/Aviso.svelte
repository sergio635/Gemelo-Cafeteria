<script lang="ts">
	// Aviso de error o de carga. Evita que se vea una pantalla rota cuando
	// falta el .env o no se puede conectar con Supabase.
	interface Props {
		titulo: string;
		mensaje: string;
		boton?: string;
		alPulsar?: () => void;
	}

	let { titulo, mensaje, boton, alPulsar }: Props = $props();
</script>

<div class="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-sm">
	<div class="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-2xl">
		☕
	</div>
	<div class="space-y-1">
		<h2 class="text-lg font-bold text-slate-900">{titulo}</h2>
		<p class="text-sm text-slate-600">{mensaje}</p>
	</div>
	{#if boton && alPulsar}
		<button
			type="button"
			onclick={alPulsar}
			class="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
		>
			{boton}
		</button>
	{/if}
</div>