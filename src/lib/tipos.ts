// Tipos de datos de la cafetería.
// Reflejan exactamente las tablas que crea supabase/schema.sql.

export type EstadoMesa = 'libre' | 'ocupada' | 'cuenta';
export type EstadoPedido = 'abierto' | 'cerrado';

// Tabla "mesas"
export interface Mesa {
	id: string;
	numero: number;
	estado: EstadoMesa;
	// Hora a la que la mesa dejó de estar libre (null si está libre).
	ocupada_desde: string | null;
}

// Tabla "productos"
export interface Producto {
	id: string;
	nombre: string;
	precio: number;
}

// Tabla "pedidos"
export interface Pedido {
	id: string;
	mesa_id: string;
	estado: EstadoPedido;
	creado_en: string;
	cerrado_en: string | null;
}

// Tabla "pedido_items"
export interface PedidoItem {
	id: string;
	pedido_id: string;
	producto_id: string;
	cantidad: number;
	precio_unitario: number;
}

// Un pedido_item junto con el nombre del producto, que es como se pinta
// la lista dentro del panel de la mesa.
export interface LineaPedido extends PedidoItem {
	producto_nombre: string;
}