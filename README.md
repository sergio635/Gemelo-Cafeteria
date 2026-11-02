# Gemelo Cafetería

Gemelo digital de una cafetería: un plano 2D del local con el estado de cada
mesa y sus pedidos, actualizado en tiempo real con Supabase.

## Puesta en marcha

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor** pega y ejecuta `supabase/schema.sql`.
3. En **Project Settings → API** copia la *Project URL* y la *anon public key*.
4. Copia `.env.example` a `.env` y rellénalo con esos dos valores.
5. Arranca la app:

```sh
npm install
npm run dev
```

## Dónde tocar

| Quiero…                                | Archivo                              |
| -------------------------------------- | ------------------------------------ |
| Cambiar los colores de los estados      | `src/lib/estados.ts`                 |
| Cambiar una consulta o una escritura    | `src/lib/supabase.ts`                |
| Cambiar la lógica de la cafetería       | `src/lib/tienda/cafeteria.svelte.ts` |
| Cambiar el aspecto de un componente     | `src/lib/componentes/*.svelte`       |

Comprobación de tipos: `npm run check`.