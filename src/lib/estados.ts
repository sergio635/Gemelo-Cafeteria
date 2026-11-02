// Aspecto y texto de cada estado de mesa.
// ESTE ES EL ÚNICO SITIO donde están los colores: si quieres cambiar cómo se ve
// una mesa, cambias solo aquí y se actualiza toda la aplicación.

import type { EstadoMesa } from './tipos';

interface AspectoEstado {
	// Texto corto que sale en la mesa y en el panel.
	texto: string;
	// Descripción un poco más larga, para el panel lateral.
	descripcion: string;
	// Clases Tailwind del botón de la mesa.
	mesa: string;
	// Clases Tailwind del pequeño punto de color.
	punto: string;
	// Clases Tailwind de la etiqueta de estado dentro del panel.
	etiqueta: string;
}

export const ESTADOS_MESA: Record<EstadoMesa, AspectoEstado> = {
	libre: {
		texto: 'Libre',
		descripcion: 'La mesa está libre y sin pedidos.',
		mesa: 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100',
		punto: 'bg-emerald-500',
		etiqueta: 'bg-emerald-100 text-emerald-800'
	},
	ocupada: {
		texto: 'Ocupada',
		descripcion: 'La mesa tiene clientes comiendo o tomando algo.',
		mesa: 'bg-amber-50 border-amber-400 text-amber-900 hover:bg-amber-100',
		punto: 'bg-amber-500',
		etiqueta: 'bg-amber-100 text-amber-800'
	},
	cuenta: {
		texto: 'Pidiendo la cuenta',
		descripcion: 'La mesa ha pedido que le lleven la cuenta.',
		mesa: 'bg-rose-50 border-rose-400 text-rose-900 hover:bg-rose-100',
		punto: 'bg-rose-500',
		etiqueta: 'bg-rose-100 text-rose-800'
	}
};

// Los tres estados en el orden en que aparecen en los botones.
export const LISTA_ESTADOS: EstadoMesa[] = ['libre', 'ocupada', 'cuenta'];