# AGENTS.md — Gemelo Cafetería

Gemelo digital de una cafetería: una vista 2D del local donde se ve en tiempo real el estado de cada mesa, sus pedidos y las ventas del día. Proyecto en crecimiento por versiones pequeñas; el código debe poder entenderlo alguien que está empezando en frontend.

## Stack y estructura

- SvelteKit con TypeScript estricto, Tailwind para los estilos y Supabase (PostgreSQL + Realtime) como base de datos. Versiones exactas en `package.json`; usa la sintaxis de la versión de Svelte instalada.
- Única dependencia de datos: `@supabase/supabase-js`. No hay backend propio.
- `supabase/schema.sql`: fuente de verdad del esquema (tablas `mesas`, `productos`, `pedidos`, `pedido_items`), datos iniciales, políticas RLS y Realtime.
- `src/lib/supabase.ts`: único archivo que crea el cliente y habla con Supabase.
- Store de Svelte tipado (en `src/lib/componentes/`): estado compartido de mesas, pedidos y ventas; es lo que consumen los componentes.
- Componentes pequeños en `src/lib/` (`Mesa`, `PanelMesa`, `Indicadores`, etc), cada uno en su archivo con un comentario corto en español.
- Una sola página (`src/routes/+page.svelte`). React no está en esta versión; se añadirá más adelante como componente aparte.
- `.env` (no se sube a Git) y `.env.example` (nombres de variables, sin valores).

## Comandos

- Instalar: `npm install`
- Desarrollo: `npm run dev`
- Comprobar tipos: `npm run check`
- Compilar: `npm run build`
- Previsualizar el build: `npm run preview`
- No hay lint ni tests configurados.

## Convenciones

- Textos de la interfaz y comentarios en español. Nombres de variables y funciones descriptivos.
- Estilos solo con clases de Tailwind en los componentes. Nada de CSS propio, salvo el `@import "tailwindcss"` del archivo base.
- Los colores de los estados (libre, ocupada, pidiendo la cuenta) salen de un único lugar. No repitas clases de color por varios componentes.
- Diseño mobile-first: toda pantalla o componente nuevo debe verse bien en el móvil.
- Los componentes nunca llaman a Supabase directamente: pasan por el store y `src/lib/supabase.ts`.
- Archivo de referencia para componentes nuevos: `Mesa.svelte`.

## Reglas de dominio / trampas conocidas

- **Fechas:** las ventas del día son la suma de los pedidos con `estado = cerrado` cuyo `cerrado_en` cae en el día de hoy. Calcula siempre el inicio y el fin del día con la fecha local del usuario y envíalos a Supabase. Nunca uses UTC ni cortes el día con `toISOString().slice(0, 10)`.
- **Precios:** al añadir un producto a un pedido, guarda su precio en `pedido_items.precio_unitario`. El total de un pedido se calcula con ese campo, nunca con el precio actual de `productos`.
- **Cerrar una mesa:** el pedido pasa a `cerrado` (con `cerrado_en`) y la mesa vuelve a `libre`. Las dos cosas deben quedar coherentes; no dejes una mesa libre con un pedido abierto.
- **Pedido vacío:** si al restar o quitar líneas un pedido se queda sin ítems, el pedido sigue abierto y la mesa ocupada; no se libera sola (pueden pedir algo más). Nunca pongas `cantidad = 0` en `pedido_items` (el `check` lo prohíbe): borra la fila.
- **Tiempo de ocupación:** la fuente única es `mesas.ocupada_desde`. Se rellena al salir de `libre` (a mano o al añadir el primer producto), se conserva al alternar entre `ocupada` y `cuenta`, y vuelve a `null` al liberar la mesa.
- **Re-ejecutar `schema.sql`:** tras cambiar tablas o funciones de `supabase/schema.sql` hay que ejecutarlo de nuevo en el SQL Editor de Supabase; si no, el frontend falla con errores PGRST202 (función no encontrada).
- **Realtime:** la pantalla se actualiza sola con las suscripciones de Supabase. Cancela las suscripciones al destruir el componente o el store para no duplicar eventos.
- **RLS abierto:** las políticas permiten todo al rol anónimo porque aún no hay login. No las cierres ni añadas autenticación por tu cuenta.
- **Claves:** solo la clave pública (anon o publishable) va en el frontend. Nunca la `service_role`.
- **`.env`:** SvelteKit solo lo lee al arrancar; si cambia, hay que reiniciar `npm run dev`.

## Forma de trabajar

- Haz solo lo que se pide: no añadas funcionalidades, rutas, gráficas ni animaciones por tu cuenta.
- Si el cambio toca más de un archivo o la base de datos, explica primero el plan en pocas líneas y espera confirmación.
- Cambios pequeños y enfocados; no reescribas lo que ya funciona.
- Si refactorizas, elimina el código residual (imports, funciones, estilos y archivos que queden sin uso).
- Entrega siempre el contenido completo de los archivos modificados, no fragmentos.
- Al terminar, resume qué has cambiado y cualquier decisión que deba revisar.

## Límites

- ✅ Siempre: usar fecha local, mantener los textos en español, tipar con TypeScript estricto, pasar por `src/lib/supabase.ts` para cualquier acceso a datos.
- ⚠️ Pregunta antes: añadir dependencias nuevas (incluidos plugins de Tailwind), crear archivos o rutas nuevas, cambiar el esquema de la base de datos o `schema.sql`, cambiar el formato de los datos.
- 🚫 Nunca: escribir claves o URLs reales en el código, subir `.env` a Git, usar la `service_role` en el frontend, añadir UI kits (DaisyUI, shadcn, etc.), ORMs o librerías de estado, o añadir React sin que se pida.
- ✅ Siempre: actualizar `MEMORY.md` al terminar cada tarea.

## Verificación

- Ejecuta `npm run check` y `npm run build`: ambos deben terminar sin errores.
- Prueba con `npm run dev` y el `.env` relleno: se ven las mesas y el menú cargados desde la base de datos.
- Comprueba el tiempo real: cambia el estado de una mesa en el Table Editor de Supabase y la pantalla debe actualizarse sola, sin recargar.
- Comprueba el flujo completo: abrir mesa, añadir productos, ver el total, cerrarla y ver subir las ventas del día.
- Revisa la vista en ancho de móvil (DevTools → modo responsive).

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).