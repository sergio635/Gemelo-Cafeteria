-- ============================================================================
-- Gemelo Cafetería · Esquema de la base de datos (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Cómo usarlo:
--   1. Abre tu proyecto en https://supabase.com
--   2. Ve a "SQL Editor" -> "New query"
--   3. Pega este archivo entero y pulsa "Run".
--
-- Es seguro ejecutarlo varias veces: nunca duplica las mesas ni los productos.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------

-- Las mesas del local. El estado decide de qué color se pinta en el plano.
-- ocupada_desde guarda cuándo dejó de estar libre (null si está libre):
-- es la fuente única para el tiempo de ocupación que muestra la app.
create table if not exists public.mesas (
  id            uuid primary key default gen_random_uuid(),
  numero        integer not null unique,
  estado        text not null default 'libre'
                check (estado in ('libre', 'ocupada', 'cuenta')),
  ocupada_desde timestamptz
);

-- Para bases de datos ya creadas: añade la columna si falta.
alter table public.mesas
  add column if not exists ocupada_desde timestamptz;

-- El menú de la cafetería.
create table if not exists public.productos (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  precio numeric(10, 2) not null check (precio >= 0)
);

-- Un pedido por servicio. Nace 'abierto' y pasa a 'cerrado' al pagar.
create table if not exists public.pedidos (
  id         uuid primary key default gen_random_uuid(),
  mesa_id    uuid not null references public.mesas (id) on delete cascade,
  estado     text not null default 'abierto'
             check (estado in ('abierto', 'cerrado')),
  creado_en  timestamptz not null default now(),
  cerrado_en timestamptz
);

-- Las líneas del pedido. Guardan el precio del producto en el momento de pedirlo,
-- así que si mañana sube el café, los pedidos de hoy no cambian.
create table if not exists public.pedido_items (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.pedidos (id) on delete cascade,
  producto_id     uuid not null references public.productos (id),
  cantidad        integer not null default 1 check (cantidad > 0),
  precio_unitario numeric(10, 2) not null check (precio_unitario >= 0)
);

-- Índices para que las consultas sean rápidas.
create index if not exists pedidos_mesa_id_idx
  on public.pedidos (mesa_id);

create index if not exists pedido_items_pedido_id_idx
  on public.pedido_items (pedido_id);

-- Regla del negocio: una mesa solo puede tener un pedido abierto a la vez.
create unique index if not exists pedidos_abierto_unico
  on public.pedidos (mesa_id)
  where estado = 'abierto';

-- Mesas que ya estaban ocupadas: heredan la hora de su pedido abierto
-- (si lo tienen) para que el tiempo de ocupación no empiece de cero.
update public.mesas m
set ocupada_desde = (
  select min(p.creado_en)
  from public.pedidos p
  where p.mesa_id = m.id and p.estado = 'abierto'
)
where m.estado <> 'libre' and m.ocupada_desde is null;


-- ---------------------------------------------------------------------------
-- 2. Datos iniciales: 6 mesas libres y 5 productos
-- ---------------------------------------------------------------------------

insert into public.mesas (numero, estado)
values (1, 'libre'),
       (2, 'libre'),
       (3, 'libre'),
       (4, 'libre'),
       (5, 'libre'),
       (6, 'libre')
on conflict (numero) do nothing;

insert into public.productos (nombre, precio)
values ('Café con leche', 1.60),
       ('Corte espresso', 1.20),
       ('Capuchino',      2.10),
       ('Tostada tomate', 3.50),
       ('Medialunas',    1.00)
on conflict (nombre) do nothing;


-- ---------------------------------------------------------------------------
-- 3. Seguridad: RLS abierta (esta versión no tiene login)
--    Cualquiera que abra la app puede leer y escribir, como en un mostrador.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

alter table public.mesas        enable row level security;
alter table public.productos    enable row level security;
alter table public.pedidos      enable row level security;
alter table public.pedido_items enable row level security;

-- Tabla mesas
drop policy if exists "lectura para todos" on public.mesas;
create policy "lectura para todos" on public.mesas
  for select to anon, authenticated using (true);

drop policy if exists "escritura para todos" on public.mesas;
create policy "escritura para todos" on public.mesas
  for all to anon, authenticated using (true) with check (true);

-- Tabla productos
drop policy if exists "lectura para todos" on public.productos;
create policy "lectura para todos" on public.productos
  for select to anon, authenticated using (true);

drop policy if exists "escritura para todos" on public.productos;
create policy "escritura para todos" on public.productos
  for all to anon, authenticated using (true) with check (true);

-- Tabla pedidos
drop policy if exists "lectura para todos" on public.pedidos;
create policy "lectura para todos" on public.pedidos
  for select to anon, authenticated using (true);

drop policy if exists "escritura para todos" on public.pedidos;
create policy "escritura para todos" on public.pedidos
  for all to anon, authenticated using (true) with check (true);

-- Tabla pedido_items
drop policy if exists "lectura para todos" on public.pedido_items;
create policy "lectura para todos" on public.pedido_items
  for select to anon, authenticated using (true);

drop policy if exists "escritura para todos" on public.pedido_items;
create policy "escritura para todos" on public.pedido_items
  for all to anon, authenticated using (true) with check (true);


-- ---------------------------------------------------------------------------
-- 4. Funciones de apoyo
--    Son pequeñas reglas del negocio que se ejecutan enteras en la base de
--    datos, para que nunca se queden datos a medias si algo falla.
-- ---------------------------------------------------------------------------

-- Añade un producto al pedido abierto de la mesa (y abre el pedido si no había).
create or replace function public.anadir_producto(
  p_mesa_id    uuid,
  p_producto_id uuid,
  p_cantidad   integer default 1
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_precio    numeric(10, 2);
begin
  if p_cantidad is null or p_cantidad < 1 then
    raise exception 'La cantidad debe ser 1 o mayor.';
  end if;

  select precio into v_precio
  from public.productos
  where id = p_producto_id;

  if v_precio is null then
    raise exception 'Ese producto no existe.';
  end if;

  -- Si la mesa no tiene pedido abierto, se abre uno nuevo.
  select id into v_pedido_id
  from public.pedidos
  where mesa_id = p_mesa_id and estado = 'abierto'
  order by creado_en desc
  limit 1;

  if v_pedido_id is null then
    insert into public.pedidos (mesa_id, estado)
    values (p_mesa_id, 'abierto')
    returning id into v_pedido_id;
  end if;

  insert into public.pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
  values (v_pedido_id, p_producto_id, p_cantidad, v_precio);

  -- La mesa queda ocupada. Si estaba pidiendo la cuenta, vuelve a 'ocupada'.
  -- ocupada_desde solo se pone si no había: conserva la hora real de ocupación.
  update public.mesas
  set estado = 'ocupada',
      ocupada_desde = coalesce(ocupada_desde, now())
  where id = p_mesa_id;
end;
$$;

-- Resta una unidad de una línea del pedido. Si solo quedaba una, borra la
-- línea (la cantidad nunca puede quedar en 0, el check de la tabla lo prohíbe).
create or replace function public.restar_producto(
  p_item_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cantidad integer;
begin
  select cantidad into v_cantidad
  from public.pedido_items
  where id = p_item_id;

  if v_cantidad is null then
    raise exception 'Esa línea del pedido no existe.';
  end if;

  if v_cantidad > 1 then
    update public.pedido_items
    set cantidad = cantidad - 1
    where id = p_item_id;
  else
    delete from public.pedido_items
    where id = p_item_id;
  end if;
end;
$$;

-- Quita un producto del pedido: borra todas las líneas de ese pedido con el
-- mismo producto y precio (puede haber varias si se pidió en varias tandas).
-- Si el pedido se queda sin líneas sigue abierto y la mesa ocupada:
-- pueden pedir algo más. La mesa solo se libera al cerrarla.
create or replace function public.quitar_producto(
  p_item_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pedido_id   uuid;
  v_producto_id uuid;
  v_precio      numeric(10, 2);
begin
  select pedido_id, producto_id, precio_unitario
  into v_pedido_id, v_producto_id, v_precio
  from public.pedido_items
  where id = p_item_id;

  if v_pedido_id is null then
    raise exception 'Esa línea del pedido no existe.';
  end if;

  delete from public.pedido_items
  where pedido_id = v_pedido_id
    and producto_id = v_producto_id
    and precio_unitario = v_precio;
end;
$$;

-- Cambia el estado de la mesa. Si el estado es 'libre', además cierra el
-- pedido abierto (si lo hay) y devuelve el total cobrado por esa mesa.
create or replace function public.cambiar_estado_mesa(
  p_mesa_id uuid,
  p_estado  text
)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_total     numeric(10, 2) := 0;
begin
  if p_estado not in ('libre', 'ocupada', 'cuenta') then
    raise exception 'Estado desconocido: %', p_estado;
  end if;

  if p_estado = 'libre' then
    select id into v_pedido_id
    from public.pedidos
    where mesa_id = p_mesa_id and estado = 'abierto'
    order by creado_en desc
    limit 1;

    if v_pedido_id is not null then
      select coalesce(sum(cantidad * precio_unitario), 0) into v_total
      from public.pedido_items
      where pedido_id = v_pedido_id;

      update public.pedidos
      set estado = 'cerrado', cerrado_en = now()
      where id = v_pedido_id;
    end if;

    update public.mesas
    set estado = 'libre', ocupada_desde = null
    where id = p_mesa_id;
    return v_total;
  end if;

  -- Al pasar a ocupada o cuenta se anota la hora de inicio (si no había ya).
  update public.mesas
  set estado = p_estado,
      ocupada_desde = coalesce(ocupada_desde, now())
  where id = p_mesa_id;
  return v_total;
end;
$$;

-- Suma lo cobrado por los pedidos cerrados entre dos instantes (el día de hoy).
create or replace function public.ventas_del_dia(
  p_inicio timestamptz,
  p_fin    timestamptz
)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_total numeric(10, 2);
begin
  select coalesce(sum(i.cantidad * i.precio_unitario), 0) into v_total
  from public.pedido_items i
  join public.pedidos p on p.id = i.pedido_id
  where p.estado = 'cerrado'
    and p.cerrado_en >= p_inicio
    and p.cerrado_en < p_fin;

  return v_total;
end;
$$;


-- ---------------------------------------------------------------------------
-- 5. Realtime: la app se entera sola de los cambios, sin recargar
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mesas'
  ) then
    alter publication supabase_realtime add table public.mesas;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pedidos'
  ) then
    alter publication supabase_realtime add table public.pedidos;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pedido_items'
  ) then
    alter publication supabase_realtime add table public.pedido_items;
  end if;
end $$;