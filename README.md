# 📚 Sistema de Gestión de Librería: POS & Estadísticas de Demanda

Sistema fullstack moderno para librerías y papelerías desarrollado con **Node.js**, **Supabase**, **HTML5 Semántico**, **Vanilla CSS (Glassmorphism & Dark UI)** y **JavaScript ES6+**.

---

## 🌟 Características Principales

1. **🛒 Módulo de Registro de Ventas (Punto de Venta - POS)**:
   - Catálogo interactivo de libros y artículos de librería con fotos en formato **PNG**.
   - Búsqueda en tiempo real por código (SKU) y por título/descripción.
   - Filtros dinámicos por categorías (Libros y Literatura, Papelería, Útiles de Escritorio, Útiles Escolares, Arte).
   - Ticket de venta en vivo con ajuste de cantidades, validación rigurosa de stock disponible (evita sobreventas) y cálculo automático de ganancia y márgenes.
   - Emisión de ticket digital/imprimible con número de comprobante, desglose de ítems, cliente y método de pago.
   - Descuento atómico de inventario en cada venta.

2. **📊 Módulo de Estadísticas de Demanda de Productos**:
   - **KPIs en tiempo real**: Ingresos totales, Ganancia neta acumulada, Margen porcentual, Unidades despachadas y Valorización de inventario.
   - **Top Productos Más Demandados**: Gráfico de barras horizontales (Chart.js) ordenado por volumen de unidades vendidas e ingresos.
   - **Demanda por Categoría**: Gráfico Doughnut con distribución porcentual de ventas por sección.
   - **Evolución Temporal de la Demanda**: Gráfico de líneas que ilustra la curva de demanda diaria y la recaudación.
   - **Alertas de Reabastecimiento Predictivo**: Matriz que identifica productos con alta velocidad de compra y stock crítico ($\le 10$ unidades), clasificando el nivel de urgencia (`CRÍTICO`, `ALTO`, `MEDIO`) y sugiriendo la orden de compra.
   - Selector de rango de fechas (7, 14, 30 días e histórico).

3. **📦 Módulo de Inventario y Catálogo**:
   - Registro de productos con código único, precio de compra, precio de venta, stock en entero positivo y foto **PNG**.
   - Soporte para subida de archivos `.png` o selección de plantillas PNG temáticas pregeneradas.
   - Edición de stock y eliminación con confirmación.

---

## 🏗️ Arquitectura y Estructura del Proyecto

```
proyectoFinal/
├── .env                        # Variables de entorno (puerto y credenciales de Supabase)
├── .env.example                # Plantilla de variables de entorno
├── package.json                # Dependencias y scripts de ejecución
├── server.js                   # Servidor Express y endpoints de API REST
├── supabase_schema.sql         # Script SQL con tablas, RPC transaccional y bucket de Supabase
├── src/
│   ├── config/
│   │   └── supabase.js         # Cliente de Supabase con fallback local automático
│   ├── db/
│   │   ├── database.js         # Capa de datos unificada (Supabase + Local Store)
│   │   └── initialProducts.js  # Catálogo inicial de librería
│   └── routes/
│       ├── products.js         # Endpoints CRUD de productos + subida de fotos PNG
│       ├── sales.js            # Endpoints de ventas transaccionales
│       └── stats.js            # Endpoints de analítica y demanda
├── public/
│   ├── index.html              # SPA con interfaz visual de alto impacto
│   ├── css/
│   │   └── styles.css          # Diseño Vanilla CSS moderno (Glassmorphism & Dark UI)
│   ├── js/
│   │   ├── api.js              # Cliente HTTP fetch para API
│   │   ├── pos.js              # Lógica de registro de ventas y ticket POS
│   │   ├── stats.js            # Lógica de analítica y gráficos con Chart.js
│   │   ├── inventory.js        # Lógica de gestión de catálogo y validaciones
│   │   └── app.js              # Coordinador de pestañas y notificaciones
│   └── uploads/                # Directorio de fotos PNG de los productos
```

---

## 🚀 Puesta en Marcha Rápida

### 1. Iniciar el Servidor Local
El sistema cuenta con un motor local híbrido preconfigurado para que puedas probar todas las funciones de inmediato sin necesidad de crear una cuenta en Supabase al instante:

```bash
# Iniciar servidor
npm start

# O modo desarrollo con recarga automática:
npm run dev
```

La aplicación estará disponible en: **`http://localhost:3000`**

---

## ☁️ Conexión con Supabase (Opcional / Producción)

Para conectar tu proyecto de Supabase en la nube:

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Dirígete al **SQL Editor** en Supabase y ejecuta el contenido de [`supabase_schema.sql`](file:///Users/cesarjr/Documents/Cesar/DMC/VibeConding/Antigravity/proyectoFinal/supabase_schema.sql). Esto creará:
   - La tabla `productos` con restricciones de integridad y clave única en `codigo`.
   - Las tablas `ventas` y `detalle_ventas`.
   - La función transaccional `registrar_venta_transaccional` con bloqueo de filas (`FOR UPDATE`) para asegurar decrementos atómicos de stock.
   - El bucket de almacenamiento `productos-fotos` con políticas de lectura y escritura.
3. Copia tus credenciales en el archivo `.env`:
   ```env
   PORT=3000
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_KEY=tu-anon-key-o-service-role-key
   SUPABASE_BUCKET=productos-fotos
   ```
4. Reinicia el servidor con `npm start`. La aplicación detectará automáticamente Supabase y la insignia superior cambiará a **"🟢 Supabase Activo"**.
