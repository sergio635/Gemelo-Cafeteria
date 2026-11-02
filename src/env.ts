// Variables de entorno de la aplicación. Se leen del archivo .env.
// "public: true" significa que la variable puede usarse en el navegador,
// por eso las dos empiezan por PUBLIC_.
//
// El esquema (schema) devuelve '' cuando la variable no existe, para que la app
// pueda arrancar y enseñar un aviso en vez de romperse.

import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: {
		public: true,
		description: 'URL del proyecto de Supabase',
		schema: (valor) => valor ?? ''
	},
	PUBLIC_SUPABASE_ANON_KEY: {
		public: true,
		description: 'Clave anónima (anon public key) de Supabase',
		schema: (valor) => valor ?? ''
	}
});