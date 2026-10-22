-- ==============================================================================
-- CONFIGURACIÓN COMPLETA Y CARGA DE DATOS (SUPABASE SQL EDITOR)
-- ==============================================================================
-- Ejecuta este script directamente en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/qrljpjfyhvytahpcdijf/sql
-- ==============================================================================

-- 1. HABILITAR PERMISOS DE LECTURA/ESCRITURA (Desactivar RLS para desarrollo/POS local)
ALTER TABLE IF EXISTS productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ventas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS detalle_ventas DISABLE ROW LEVEL SECURITY;

-- 2. INSERTAR CATÁLOGO DE PRODUCTOS DE LIBRERÍA
INSERT INTO productos (
    id, 
    codigo, 
    nombre, 
    descripcion, 
    categoria, 
    precio_compra, 
    precio_venta, 
    stock, 
    foto_url,
    created_at,
    updated_at
) VALUES 
-- Libros y Literatura
(
    'a1000000-0000-0000-0000-000000000101'::uuid,
    'LIB-101',
    'Cien Años de Soledad (Ed. Ilustrada)',
    'Obra cumbre de Gabriel García Márquez en tapa dura con ilustraciones conmemorativas.',
    'Libros y Literatura',
    38.00,
    59.90,
    24,
    '/uploads/lib-101.png',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),
(
    'a1000000-0000-0000-0000-000000000102'::uuid,
    'LIB-102',
    'El Principito (Edición de Lujo)',
    'Clásico de Antoine de Saint-Exupéry con acuarelas originales del autor restauradas.',
    'Libros y Literatura',
    22.50,
    39.90,
    35,
    '/uploads/lib-102.png',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),
(
    'a1000000-0000-0000-0000-000000000103'::uuid,
    'LIB-103',
    'Don Quijote de la Mancha (Ed. RAE)',
    'Edición conmemorativa de la Real Academia Española anotada con glosario crítico.',
    'Libros y Literatura',
    45.00,
    74.50,
    12,
    '/uploads/lib-103.png',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),
(
    'a1000000-0000-0000-0000-000000000104'::uuid,
    'LIB-104',
    'Ficciones - Jorge Luis Borges',
    'Colección emblemática de cuentos de la literatura fantástica hispanoamericana.',
    'Libros y Literatura',
    28.00,
    46.00,
    18,
    '/uploads/lib-101.png',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),

-- Papelería y Cuadernos
(
    'a2000000-0000-0000-0000-000000000201'::uuid,
    'PAP-201',
    'Cuaderno Profesional Rayado 100 Hojas Oxford',
    'Papel Optik Paper de 90g con espiral doble metálica y cubierta plástica lavable.',
    'Papelería y Cuadernos',
    9.80,
    16.50,
    50,
    '/uploads/pap-201.png',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),
(
    'a2000000-0000-0000-0000-000000000202'::uuid,
    'PAP-202',
    'Libreta Clásica Moleskine Cuero Negro A5',
    'Encuadernación cosida con bolsillo interior expandible, cierre elástico y cinta marcapáginas.',
    'Papelería y Cuadernos',
    42.00,
    68.00,
    18,
    '/uploads/pap-202.png',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),

-- Útiles de Escritorio
(
    'a3000000-0000-0000-0000-000000000301'::uuid,
    'UTI-301',
    'Set Bolígrafos Gel Pilot G2 0.7mm (Pack x4)',
    'Tinta gel líquida ultra suave de secado rápido en colores azul, negro, rojo y verde.',
    'Útiles de Escritorio',
    14.50,
    24.90,
    40,
    '/uploads/uti-301.png',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),
(
    'a3000000-0000-0000-0000-000000000302'::uuid,
    'UTI-302',
    'Resaltadores Pastel Stabilo Boss Original (Set x6)',
    'Tecnología antisecado hasta por 4 horas con doble ancho de trazo (2mm y 5mm).',
    'Útiles de Escritorio',
    18.00,
    29.90,
    30,
    '/uploads/uti-302.png',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),

-- Útiles Escolares y Técnicos
(
    'a3000000-0000-0000-0000-000000000303'::uuid,
    'UTI-303',
    'Calculadora Científica Casio fx-991LA CW',
    'Pantalla de alta resolución con 540 funciones matemáticas, matriciales y estadísticas.',
    'Útiles Escolares y Técnicos',
    75.00,
    119.00,
    15,
    '/uploads/uti-303.png',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),

-- Arte y Bellas Artes
(
    'a4000000-0000-0000-0000-000000000401'::uuid,
    'ART-401',
    'Caja de Acuarelas Winsor & Newton Cotman (12 Pastillas)',
    'Pigmentos finos de grado artístico con pincel de bolsillo incorporado y paleta desmontable.',
    'Arte y Bellas Artes',
    58.00,
    95.00,
    8,
    '/uploads/art-401.png',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
),
(
    'a4000000-0000-0000-0000-000000000402'::uuid,
    'ART-402',
    'Bloc de Dibujo Canson Mix Media A4 (300g/m²)',
    'Papel de grano fino apto para acuarela, gouache, acrílico, tinta y carboncillo.',
    'Arte y Bellas Artes',
    24.00,
    42.00,
    22,
    '/uploads/art-402.png',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
)
ON CONFLICT (codigo) DO UPDATE 
SET 
    nombre = EXCLUDED.nombre,
    precio_compra = EXCLUDED.precio_compra,
    precio_venta = EXCLUDED.precio_venta,
    stock = EXCLUDED.stock,
    foto_url = EXCLUDED.foto_url;


-- 3. INSERTAR VENTAS HISTÓRICAS
INSERT INTO ventas (
    id, 
    numero_ticket, 
    fecha, 
    cliente_nombre, 
    cliente_documento, 
    metodo_pago, 
    subtotal, 
    impuesto, 
    total_venta, 
    costo_total, 
    ganancia_total, 
    notas,
    created_at
) VALUES 
(
    'f1000000-0000-0000-0000-000000000001'::uuid,
    'TKT-100101',
    NOW() - INTERVAL '7 days',
    'Mariana Morales',
    'DNI 45892134',
    'Tarjeta de Débito',
    99.80,
    0.00,
    99.80,
    60.50,
    39.30,
    'Compra de libros escolares y lectura conmemorativa',
    NOW() - INTERVAL '7 days'
),
(
    'f1000000-0000-0000-0000-000000000002'::uuid,
    'TKT-100102',
    NOW() - INTERVAL '6 days',
    'Carlos Benavides',
    'DNI 10293847',
    'Efectivo',
    65.90,
    0.00,
    65.90,
    37.80,
    28.10,
    'Material de escritorio y cuadernos',
    NOW() - INTERVAL '6 days'
),
(
    'f1000000-0000-0000-0000-000000000003'::uuid,
    'TKT-100103',
    NOW() - INTERVAL '5 days',
    'Lucía Fernández',
    'S/N',
    'Transferencia / Yape',
    137.00,
    0.00,
    137.00,
    82.00,
    55.00,
    'Kit de arte: acuarelas profesionales y bloc Canson',
    NOW() - INTERVAL '5 days'
),
(
    'f1000000-0000-0000-0000-000000000004'::uuid,
    'TKT-100104',
    NOW() - INTERVAL '4 days',
    'Alejandro Vega',
    'DNI 72819203',
    'Tarjeta de Crédito',
    119.00,
    0.00,
    119.00,
    75.00,
    44.00,
    'Calculadora científica para universidad',
    NOW() - INTERVAL '4 days'
),
(
    'f1000000-0000-0000-0000-000000000005'::uuid,
    'TKT-100105',
    NOW() - INTERVAL '3 days',
    'Sofía Quispe',
    'S/N',
    'Efectivo',
    97.90,
    0.00,
    97.90,
    60.50,
    37.40,
    'Libro Gabriel García Márquez y resaltadores',
    NOW() - INTERVAL '3 days'
),
(
    'f1000000-0000-0000-0000-000000000006'::uuid,
    'TKT-100106',
    NOW() - INTERVAL '2 days',
    'Jorge Valdivia',
    'DNI 08761234',
    'Transferencia / Yape',
    110.50,
    0.00,
    110.50,
    64.30,
    46.20,
    'Libreta Moleskine y cuadernos Oxford',
    NOW() - INTERVAL '2 days'
),
(
    'f1000000-0000-0000-0000-000000000007'::uuid,
    'TKT-100107',
    NOW() - INTERVAL '1 day',
    'Patricia Mendoza',
    'S/N',
    'Tarjeta de Débito',
    54.80,
    0.00,
    54.80,
    32.50,
    22.30,
    'Bolígrafos Pilot G2 y resaltadores Stabilo',
    NOW() - INTERVAL '1 day'
),
(
    'f1000000-0000-0000-0000-000000000008'::uuid,
    'TKT-100108',
    NOW() - INTERVAL '2 hours',
    'Cliente Mostrador',
    'S/N',
    'Efectivo',
    114.40,
    0.00,
    114.40,
    67.50,
    46.90,
    'Quijote de la Mancha y clásico infantil',
    NOW() - INTERVAL '2 hours'
)
ON CONFLICT (numero_ticket) DO NOTHING;


-- 4. INSERTAR DETALLES DE VENTAS (PARA ALIMENTAR GRÁFICOS Y DEMANDA)
INSERT INTO detalle_ventas (
    id,
    venta_id,
    producto_id,
    codigo,
    nombre_producto,
    cantidad,
    precio_unitario,
    costo_unitario,
    subtotal,
    ganancia,
    created_at
) VALUES
-- Detalles Venta 1 (TKT-100101)
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000001'::uuid,
    'a1000000-0000-0000-0000-000000000101'::uuid,
    'LIB-101',
    'Cien Años de Soledad (Ed. Ilustrada)',
    1,
    59.90,
    38.00,
    59.90,
    21.90,
    NOW() - INTERVAL '7 days'
),
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000001'::uuid,
    'a1000000-0000-0000-0000-000000000102'::uuid,
    'LIB-102',
    'El Principito (Edición de Lujo)',
    1,
    39.90,
    22.50,
    39.90,
    17.40,
    NOW() - INTERVAL '7 days'
),

-- Detalles Venta 2 (TKT-100102)
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000002'::uuid,
    'a2000000-0000-0000-0000-000000000201'::uuid,
    'PAP-201',
    'Cuaderno Profesional Rayado 100 Hojas Oxford',
    2,
    16.50,
    9.80,
    33.00,
    13.40,
    NOW() - INTERVAL '6 days'
),
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000302'::uuid,
    'UTI-302',
    'Resaltadores Pastel Stabilo Boss Original (Set x6)',
    1,
    29.90,
    18.00,
    29.90,
    11.90,
    NOW() - INTERVAL '6 days'
),

-- Detalles Venta 3 (TKT-100103)
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000003'::uuid,
    'a4000000-0000-0000-0000-000000000401'::uuid,
    'ART-401',
    'Caja de Acuarelas Winsor & Newton Cotman (12 Pastillas)',
    1,
    95.00,
    58.00,
    95.00,
    37.00,
    NOW() - INTERVAL '5 days'
),
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000003'::uuid,
    'a4000000-0000-0000-0000-000000000402'::uuid,
    'ART-402',
    'Bloc de Dibujo Canson Mix Media A4 (300g/m²)',
    1,
    42.00,
    24.00,
    42.00,
    18.00,
    NOW() - INTERVAL '5 days'
),

-- Detalles Venta 4 (TKT-100104)
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000004'::uuid,
    'a3000000-0000-0000-0000-000000000303'::uuid,
    'UTI-303',
    'Calculadora Científica Casio fx-991LA CW',
    1,
    119.00,
    75.00,
    119.00,
    44.00,
    NOW() - INTERVAL '4 days'
),

-- Detalles Venta 5 (TKT-100105)
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000005'::uuid,
    'a1000000-0000-0000-0000-000000000101'::uuid,
    'LIB-101',
    'Cien Años de Soledad (Ed. Ilustrada)',
    1,
    59.90,
    38.00,
    59.90,
    21.90,
    NOW() - INTERVAL '3 days'
),
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000005'::uuid,
    'a3000000-0000-0000-0000-000000000302'::uuid,
    'UTI-302',
    'Resaltadores Pastel Stabilo Boss Original (Set x6)',
    1,
    29.90,
    18.00,
    29.90,
    11.90,
    NOW() - INTERVAL '3 days'
),

-- Detalles Venta 6 (TKT-100106)
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000006'::uuid,
    'a2000000-0000-0000-0000-000000000202'::uuid,
    'PAP-202',
    'Libreta Clásica Moleskine Cuero Negro A5',
    1,
    68.00,
    42.00,
    68.00,
    26.00,
    NOW() - INTERVAL '2 days'
),
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000006'::uuid,
    'a2000000-0000-0000-0000-000000000201'::uuid,
    'PAP-201',
    'Cuaderno Profesional Rayado 100 Hojas Oxford',
    2,
    16.50,
    9.80,
    33.00,
    13.40,
    NOW() - INTERVAL '2 days'
),

-- Detalles Venta 7 (TKT-100107)
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000007'::uuid,
    'a3000000-0000-0000-0000-000000000301'::uuid,
    'UTI-301',
    'Set Bolígrafos Gel Pilot G2 0.7mm (Pack x4)',
    1,
    24.90,
    14.50,
    24.90,
    10.40,
    NOW() - INTERVAL '1 day'
),
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000007'::uuid,
    'a3000000-0000-0000-0000-000000000302'::uuid,
    'UTI-302',
    'Resaltadores Pastel Stabilo Boss Original (Set x6)',
    1,
    29.90,
    18.00,
    29.90,
    11.90,
    NOW() - INTERVAL '1 day'
),

-- Detalles Venta 8 (TKT-100108)
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000008'::uuid,
    'a1000000-0000-0000-0000-000000000103'::uuid,
    'LIB-103',
    'Don Quijote de la Mancha (Ed. RAE)',
    1,
    74.50,
    45.00,
    74.50,
    29.50,
    NOW() - INTERVAL '2 hours'
),
(
    gen_random_uuid(),
    'f1000000-0000-0000-0000-000000000008'::uuid,
    'a1000000-0000-0000-0000-000000000102'::uuid,
    'LIB-102',
    'El Principito (Edición de Lujo)',
    1,
    39.90,
    22.50,
    39.90,
    17.40,
    NOW() - INTERVAL '2 hours'
);
