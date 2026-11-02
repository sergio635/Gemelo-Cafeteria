# MEMORY.md — Gemelo Cafetería
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- v1 funcionando: plano 2D con 6 mesas (libre, ocupada, pidiendo la cuenta), panel lateral por mesa con pedido y total, y 3 indicadores (mesas ocupadas, % de ocupación, ventas del día).
- El panel permite añadir, restar (−) y quitar (✕) productos del pedido; restar a 0 elimina la línea.
- Cada mesa muestra el tiempo que lleva ocupada ("ahora", "25 min", "1 h 5 min"), también si se ocupó a mano sin pedido; a partir de 45 min se resalta en ámbar (anillo en la tarjeta y "Abierta a las HH:MM · X min" en negrita ámbar en el panel).
- Datos en Supabase (PostgreSQL) con Realtime: la pantalla se actualiza sola cuando cambian los datos.
- Esquema en `supabase/schema.sql`; conexión con `.env` (la base de datos ya creada y conectada).

## Decisiones (y por qué)
- Supabase como base de datos: trae Realtime incluido (clave en un gemelo digital) y ya lo conozco, sin backend propio.
- Tailwind para los estilos: tengo experiencia con él. Sin plugins ni UI kits.
- Sin React en la v1: SvelteKit + React en el mismo proyecto añade configuración; se añadirá después como componente aparte.
- RLS abierto al rol anónimo: aún no hay login, vale para desarrollar.
- `precio_unitario` guardado en cada ítem del pedido: los cambios de precio no alteran pedidos pasados.
- Ventas del día por fecha local del usuario, nunca UTC.
- Pedido vacío queda abierto con la mesa ocupada a propósito (pueden pedir algo más); solo se libera cerrando la mesa.
- `quitar_producto` borra el grupo (producto+precio) entero: `lineasDe` agrupa filas y la línea visible puede ser varias filas en la base.
- Restar/quitar no cambian el estado de la mesa (son correcciones del camarero); añadir sí la pone ocupada.
- Fuente única del tiempo de ocupación: `mesas.ocupada_desde` (se rellena al salir de libre, se conserva entre ocupada↔cuenta, se borra al liberar). Reloj local de 30 s en el store, cancelado en `parar()`; menos de 1 min se muestra como "ahora".

## Aprendizajes y errores a evitar
- Nunca `update cantidad = 0` en `pedido_items`: el `check (cantidad > 0)` lo rechaza; hay que borrar la fila.
- (La regla de re-ejecutar `schema.sql` tras cambiarlo pasó a AGENTS.md: si no, el frontend falla con PGRST202.)

## Próximos pasos
- Añadir un componente React dentro del proyecto SvelteKit (por ejemplo, el panel de pedidos).
- Antes de publicar: añadir autenticación y cerrar las políticas RLS.
