-- ============================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA DE LIBRERÍA (SUPABASE)
-- ============================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: PRODUCTOS
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100) NOT NULL DEFAULT 'General',
    precio_compra NUMERIC(10, 2) NOT NULL CHECK (precio_compra >= 0),
    precio_venta NUMERIC(10, 2) NOT NULL CHECK (precio_venta > 0),
    stock INTEGER NOT NULL CHECK (stock >= 0),
    foto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para optimizar búsquedas frecuentes por código y categoría
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);

-- 3. TABLA: VENTAS (CABECERA)
CREATE TABLE IF NOT EXISTS ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_ticket VARCHAR(50) NOT NULL UNIQUE,
    fecha TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    cliente_nombre VARCHAR(150) DEFAULT 'Cliente General',
    cliente_documento VARCHAR(50) DEFAULT 'S/N',
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'Efectivo',
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    impuesto NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_venta NUMERIC(10, 2) NOT NULL CHECK (total_venta >= 0),
    costo_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ganancia_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);

-- 4. TABLA: DETALLE_VENTAS
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
    codigo VARCHAR(50) NOT NULL,
    nombre_producto VARCHAR(200) NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario > 0),
    costo_unitario NUMERIC(10, 2) NOT NULL CHECK (costo_unitario >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    ganancia NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_detalle_venta_id ON detalle_ventas(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_producto_id ON detalle_ventas(producto_id);

-- 5. FUNCIÓN TRANSACCIONAL ATÓMICA: REGISTRAR VENTA Y DESCONTAR STOCK
CREATE OR REPLACE FUNCTION registrar_venta_transaccional(
    p_numero_ticket VARCHAR,
    p_cliente_nombre VARCHAR,
    p_cliente_documento VARCHAR,
    p_metodo_pago VARCHAR,
    p_subtotal NUMERIC,
    p_impuesto NUMERIC,
    p_total_venta NUMERIC,
    p_costo_total NUMERIC,
    p_ganancia_total NUMERIC,
    p_notas TEXT,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_venta_id UUID;
    v_item RECORD;
    v_stock_actual INTEGER;
    v_producto_id UUID;
BEGIN
    -- Validar que haya items
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La venta debe contener al menos un producto';
    END IF;

    -- 1. Insertar cabecera de la venta
    INSERT INTO ventas (
        numero_ticket,
        cliente_nombre,
        cliente_documento,
        metodo_pago,
        subtotal,
        impuesto,
        total_venta,
        costo_total,
        ganancia_total,
        notas
    ) VALUES (
        p_numero_ticket,
        p_cliente_nombre,
        p_cliente_documento,
        p_metodo_pago,
        p_subtotal,
        p_impuesto,
        p_total_venta,
        p_costo_total,
        p_ganancia_total,
        p_notas
    ) RETURNING id INTO v_venta_id;

    -- 2. Procesar cada item con bloqueo de fila (FOR UPDATE) para evitar condiciones de carrera
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        producto_id UUID,
        codigo VARCHAR,
        nombre_producto VARCHAR,
        cantidad INTEGER,
        precio_unitario NUMERIC,
        costo_unitario NUMERIC,
        subtotal NUMERIC,
        ganancia NUMERIC
    )
    LOOP
        -- Validar y bloquear producto en stock
        SELECT id, stock INTO v_producto_id, v_stock_actual
        FROM productos
        WHERE id = v_item.producto_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto con código % no encontrado en catálogo', v_item.codigo;
        END IF;

        IF v_stock_actual < v_item.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto % (Código: %). Disponible: %, Solicitado: %',
                v_item.nombre_producto, v_item.codigo, v_stock_actual, v_item.cantidad;
        END IF;

        -- Descontar stock
        UPDATE productos
        SET stock = stock - v_item.cantidad,
            updated_at = NOW()
        WHERE id = v_item.producto_id;

        -- Insertar detalle de venta
        INSERT INTO detalle_ventas (
            venta_id,
            producto_id,
            codigo,
            nombre_producto,
            cantidad,
            precio_unitario,
            costo_unitario,
            subtotal,
            ganancia
        ) VALUES (
            v_venta_id,
            v_item.producto_id,
            v_item.codigo,
            v_item.nombre_producto,
            v_item.cantidad,
            v_item.precio_unitario,
            v_item.costo_unitario,
            v_item.subtotal,
            v_item.ganancia
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'venta_id', v_venta_id,
        'numero_ticket', p_numero_ticket,
        'total_venta', p_total_venta
    );
END;
$$;

-- 6. CONFIGURACIÓN DEL BUCKET DE FOTOS PNG (SUPABASE STORAGE)
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos-fotos', 'productos-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso para el bucket (público para lectura, autenticado/anon para carga)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Lectura pública de fotos de productos'
    ) THEN
        CREATE POLICY "Lectura pública de fotos de productos"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'productos-fotos');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Subida de fotos de productos'
    ) THEN
        CREATE POLICY "Subida de fotos de productos"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'productos-fotos');
    END IF;
END $$;
