const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { supabase, isConfigured, supabaseBucket } = require('../config/supabase');
const initialProducts = require('./initialProducts');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Generate realistic seed sales for demand analytics
function generateSeedSales(products) {
  const sales = [];
  const details = [];
  const now = new Date();

  // Quantities demand distribution per product code to create realistic demand graphs
  const demandWeights = {
    'LIB-101': 18,
    'UTI-301': 28,
    'PAP-201': 35,
    'LIB-102': 14,
    'UTI-302': 22,
    'PAP-202': 9,
    'ART-401': 6,
    'ART-402': 11,
    'LIB-103': 7,
    'UTI-303': 5
  };

  const paymentMethods = ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Transferencia / Yape'];
  let ticketIndex = 1000;

  // Distribute over the past 14 days
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const saleDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    // 2 to 4 sales per day
    const salesInDay = 2 + Math.floor(Math.random() * 3);

    for (let s = 0; s < salesInDay; s++) {
      ticketIndex++;
      const saleId = crypto.randomUUID();
      const numItems = 1 + Math.floor(Math.random() * 3);
      const chosenCodes = Object.keys(demandWeights)
        .sort(() => 0.5 - Math.random())
        .slice(0, numItems);

      let saleSubtotal = 0;
      let saleCost = 0;
      let saleItems = [];

      chosenCodes.forEach(code => {
        const prod = products.find(p => p.codigo === code);
        if (!prod) return;
        const qty = 1 + Math.floor(Math.random() * 2);
        const subtotal = Math.round(prod.precio_venta * qty * 100) / 100;
        const cost = Math.round(prod.precio_compra * qty * 100) / 100;
        const profit = Math.round((subtotal - cost) * 100) / 100;

        saleSubtotal += subtotal;
        saleCost += cost;

        const detail = {
          id: crypto.randomUUID(),
          venta_id: saleId,
          producto_id: prod.id,
          codigo: prod.codigo,
          nombre_producto: prod.nombre,
          cantidad: qty,
          precio_unitario: prod.precio_venta,
          costo_unitario: prod.precio_compra,
          subtotal: subtotal,
          ganancia: profit,
          created_at: saleDate.toISOString()
        };
        details.push(detail);
        saleItems.push(detail);
      });

      saleSubtotal = Math.round(saleSubtotal * 100) / 100;
      saleCost = Math.round(saleCost * 100) / 100;
      const profitTotal = Math.round((saleSubtotal - saleCost) * 100) / 100;

      const sale = {
        id: saleId,
        numero_ticket: `TKT-${ticketIndex}`,
        fecha: saleDate.toISOString(),
        cliente_nombre: 'Cliente Mostrador',
        cliente_documento: 'S/N',
        metodo_pago: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        subtotal: saleSubtotal,
        impuesto: 0,
        total_venta: saleSubtotal,
        costo_total: saleCost,
        ganancia_total: profitTotal,
        notas: 'Venta inicial simulada de librería',
        created_at: saleDate.toISOString(),
        items: saleItems
      };
      sales.push(sale);
    }
  }

  return { sales, details };
}

// Local Store Initialization
function initLocalStore() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (data && data.productos && data.productos.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn('Error leyendo db.json, reinicializando...');
    }
  }

  // Pre-populate products with UUIDs
  const prods = initialProducts.map(p => ({
    id: crypto.randomUUID(),
    ...p,
    stock: parseInt(p.stock, 10),
    precio_compra: parseFloat(p.precio_compra),
    precio_venta: parseFloat(p.precio_venta),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { sales, details } = generateSeedSales(prods);

  const initialData = {
    productos: prods,
    ventas: sales,
    detalle_ventas: details
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  console.log('📦 Base de datos local inicializada con catálogo de librería y ventas de muestra.');
  return initialData;
}

let localStore = initLocalStore();

function saveLocalStore() {
  fs.writeFileSync(DB_FILE, JSON.stringify(localStore, null, 2), 'utf-8');
}

// Database Service abstraction
const Database = {
  isSupabaseActive() {
    return isConfigured && supabase !== null;
  },

  // -------------------------------------------------------------
  // PRODUCTOS
  // -------------------------------------------------------------
  async getProducts(filters = {}) {
    if (this.isSupabaseActive()) {
      try {
        let query = supabase.from('productos').select('*').order('created_at', { ascending: false });
        if (filters.category && filters.category !== 'Todas') {
          query = query.eq('categoria', filters.category);
        }
        if (filters.search) {
          query = query.or(`nombre.ilike.%${filters.search}%,codigo.ilike.%${filters.search}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
          return data;
        }
        // Si Supabase aún no tiene registros, usar datos de catálogo local como respaldo
        if (data && data.length === 0 && !filters.search && (!filters.category || filters.category === 'Todas')) {
          return localStore.productos;
        }
        return data || [];
      } catch (err) {
        console.warn('Fallo consulta a Supabase, recurriendo a local:', err.message);
      }
    }

    // Local fallback
    let list = [...localStore.productos];
    if (filters.category && filters.category !== 'Todas') {
      list = list.filter(p => p.categoria.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q));
    }
    // Return sorted by updated_at or created_at desc
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getProductById(id) {
    if (this.isSupabaseActive()) {
      try {
        const { data, error } = await supabase.from('productos').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Fallo consulta a Supabase:', err.message);
      }
    }
    return localStore.productos.find(p => p.id === id) || null;
  },

  async getProductByCode(codigo) {
    if (this.isSupabaseActive()) {
      try {
        const { data, error } = await supabase.from('productos').select('*').eq('codigo', codigo.trim().toUpperCase()).single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('Fallo consulta a Supabase:', err.message);
      }
    }
    return localStore.productos.find(p => p.codigo.toUpperCase() === codigo.trim().toUpperCase()) || null;
  },

  async createProduct(productData) {
    // Validaciones
    if (!productData.codigo || !productData.nombre) {
      throw new Error('El código y el nombre del producto son requeridos.');
    }

    const cleanCode = productData.codigo.trim().toUpperCase();
    const existing = await this.getProductByCode(cleanCode);
    if (existing) {
      throw new Error(`Ya existe un producto con el código ${cleanCode}.`);
    }

    const stock = parseInt(productData.stock, 10);
    if (isNaN(stock) || stock < 0) {
      throw new Error('El stock debe ser un número entero mayor o igual a cero.');
    }

    const precioCompra = parseFloat(productData.precio_compra);
    const precioVenta = parseFloat(productData.precio_venta);

    if (isNaN(precioCompra) || precioCompra < 0) {
      throw new Error('El precio de compra debe ser mayor o igual a 0.');
    }
    if (isNaN(precioVenta) || precioVenta <= 0) {
      throw new Error('El precio de venta debe ser un número positivo.');
    }

    const cleanPayload = {
      id: crypto.randomUUID(),
      codigo: cleanCode,
      nombre: productData.nombre.trim(),
      descripcion: productData.descripcion ? productData.descripcion.trim() : '',
      categoria: productData.categoria || 'General',
      precio_compra: Math.round(precioCompra * 100) / 100,
      precio_venta: Math.round(precioVenta * 100) / 100,
      stock: stock,
      foto_url: productData.foto_url || productData.preset_foto || '/uploads/lib-101.png',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (this.isSupabaseActive()) {
      try {
        const { data, error } = await supabase.from('productos').insert([cleanPayload]).select().single();
        if (error) {
          console.error('Error insertando en Supabase:', error.message);
          throw new Error('Error en Supabase: ' + error.message);
        }
        // Keep local mirror updated
        localStore.productos.unshift(data);
        saveLocalStore();
        return data;
      } catch (err) {
        console.error('Error en Supabase createProduct:', err.message);
        throw err;
      }
    }

    localStore.productos.unshift(cleanPayload);
    saveLocalStore();
    return cleanPayload;
  },

  async updateProduct(id, updates) {
    const existing = await this.getProductById(id);
    if (!existing) {
      throw new Error('Producto no encontrado.');
    }

    if (updates.codigo && updates.codigo.toUpperCase() !== existing.codigo.toUpperCase()) {
      const other = await this.getProductByCode(updates.codigo);
      if (other && other.id !== id) {
        throw new Error(`El código ${updates.codigo} ya está en uso.`);
      }
    }

    const stock = updates.stock !== undefined ? parseInt(updates.stock, 10) : existing.stock;
    if (stock < 0 || isNaN(stock)) {
      throw new Error('El stock debe ser un entero positivo o cero.');
    }

    const precioCompra = updates.precio_compra !== undefined ? parseFloat(updates.precio_compra) : existing.precio_compra;
    const precioVenta = updates.precio_venta !== undefined ? parseFloat(updates.precio_venta) : existing.precio_venta;

    // Payload limpio conteniendo ÚNICAMENTE las columnas existentes en Supabase
    const cleanPayload = {
      codigo: updates.codigo ? updates.codigo.trim().toUpperCase() : existing.codigo,
      nombre: updates.nombre !== undefined ? updates.nombre.trim() : existing.nombre,
      descripcion: updates.descripcion !== undefined ? (updates.descripcion || '').trim() : existing.descripcion,
      categoria: updates.categoria || existing.categoria,
      precio_compra: isNaN(precioCompra) ? existing.precio_compra : Math.round(precioCompra * 100) / 100,
      precio_venta: isNaN(precioVenta) ? existing.precio_venta : Math.round(precioVenta * 100) / 100,
      stock: stock,
      foto_url: updates.foto_url || updates.preset_foto || existing.foto_url,
      updated_at: new Date().toISOString()
    };

    if (this.isSupabaseActive()) {
      try {
        const { data, error } = await supabase
          .from('productos')
          .update(cleanPayload)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error actualizando en Supabase:', error.message);
          throw new Error('Error en Supabase: ' + error.message);
        }

        const idx = localStore.productos.findIndex(p => p.id === id);
        if (idx !== -1) localStore.productos[idx] = data;
        saveLocalStore();
        return data;
      } catch (err) {
        console.error('Error en Supabase updateProduct:', err.message);
        throw err;
      }
    }

    const updated = {
      ...existing,
      ...cleanPayload
    };

    const idx = localStore.productos.findIndex(p => p.id === id);
    if (idx !== -1) {
      localStore.productos[idx] = updated;
      saveLocalStore();
    }
    return updated;
  },

  async deleteProduct(id) {
    if (this.isSupabaseActive()) {
      try {
        const { error } = await supabase.from('productos').delete().eq('id', id);
        if (error) {
          console.error('Error eliminando en Supabase:', error.message);
          throw new Error('Error en Supabase: ' + error.message);
        }
      } catch (err) {
        console.error('Error en Supabase deleteProduct:', err.message);
        throw err;
      }
    }
    localStore.productos = localStore.productos.filter(p => p.id !== id);
    saveLocalStore();
    return { success: true };
  },

  // -------------------------------------------------------------
  // REGISTRO DE VENTAS (POS) - TRANSACCIONAL
  // -------------------------------------------------------------
  async registerSale(payload) {
    const { items, cliente_nombre, cliente_documento, metodo_pago, notas } = payload;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('El ticket de venta debe contener al menos un producto.');
    }

    // Try Supabase RPC first if configured
    if (this.isSupabaseActive()) {
      try {
        const ticketNum = `TKT-${Date.now().toString().slice(-6)}`;
        let subtotal = 0, costoTotal = 0, gananciaTotal = 0;

        const preparedItems = items.map(item => {
          const st = Math.round(item.precio_unitario * item.cantidad * 100) / 100;
          const cost = Math.round(item.costo_unitario * item.cantidad * 100) / 100;
          const prof = Math.round((st - cost) * 100) / 100;
          subtotal += st;
          costoTotal += cost;
          gananciaTotal += prof;
          return {
            producto_id: item.producto_id,
            codigo: item.codigo,
            nombre_producto: item.nombre_producto,
            cantidad: parseInt(item.cantidad, 10),
            precio_unitario: item.precio_unitario,
            costo_unitario: item.costo_unitario,
            subtotal: st,
            ganancia: prof
          };
        });

        const { data, error } = await supabase.rpc('registrar_venta_transaccional', {
          p_numero_ticket: ticketNum,
          p_cliente_nombre: cliente_nombre || 'Cliente Mostrador',
          p_cliente_documento: cliente_documento || 'S/N',
          p_metodo_pago: metodo_pago || 'Efectivo',
          p_subtotal: subtotal,
          p_impuesto: 0,
          p_total_venta: subtotal,
          p_costo_total: costoTotal,
          p_ganancia_total: gananciaTotal,
          p_notas: notas || '',
          p_items: preparedItems
        });

        if (!error && data) {
          // Sync local products stock
          items.forEach(it => {
            const lp = localStore.productos.find(p => p.id === it.producto_id);
            if (lp) lp.stock -= it.cantidad;
          });
          saveLocalStore();
          return {
            success: true,
            numero_ticket: ticketNum,
            total_venta: subtotal,
            items_count: items.length
          };
        }
      } catch (err) {
        console.warn('Fallo ejecución RPC Supabase, ejecutando transacción local:', err.message);
      }
    }

    // Transacción Local Atómica
    // 1. Validar disponibilidad de stock estricta
    for (const item of items) {
      const prod = localStore.productos.find(p => p.id === item.producto_id || p.codigo === item.codigo);
      if (!prod) {
        throw new Error(`Producto con código ${item.codigo} no encontrado.`);
      }
      const qty = parseInt(item.cantidad, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Cantidad inválida para producto ${prod.nombre}.`);
      }
      if (prod.stock < qty) {
        throw new Error(`Stock insuficiente para "${prod.nombre}" (Código: ${prod.codigo}). Stock disponible: ${prod.stock}, Solicitado: ${qty}.`);
      }
    }

    // 2. Realizar descuento atómico y preparar detalle
    const saleId = crypto.randomUUID();
    const ticketNum = `TKT-${Date.now().toString().slice(-6)}`;
    const saleDate = new Date().toISOString();

    let subtotal = 0;
    let costoTotal = 0;
    const saleItems = [];

    for (const item of items) {
      const prod = localStore.productos.find(p => p.id === item.producto_id || p.codigo === item.codigo);
      const qty = parseInt(item.cantidad, 10);

      // Descontar stock
      prod.stock -= qty;
      prod.updated_at = saleDate;

      const itemSubtotal = Math.round(prod.precio_venta * qty * 100) / 100;
      const itemCosto = Math.round(prod.precio_compra * qty * 100) / 100;
      const itemGanancia = Math.round((itemSubtotal - itemCosto) * 100) / 100;

      subtotal += itemSubtotal;
      costoTotal += itemCosto;

      const detail = {
        id: crypto.randomUUID(),
        venta_id: saleId,
        producto_id: prod.id,
        codigo: prod.codigo,
        nombre_producto: prod.nombre,
        cantidad: qty,
        precio_unitario: prod.precio_venta,
        costo_unitario: prod.precio_compra,
        subtotal: itemSubtotal,
        ganancia: itemGanancia,
        created_at: saleDate
      };

      saleItems.push(detail);
      localStore.detalle_ventas.push(detail);
    }

    subtotal = Math.round(subtotal * 100) / 100;
    costoTotal = Math.round(costoTotal * 100) / 100;
    const gananciaTotal = Math.round((subtotal - costoTotal) * 100) / 100;

    const newSale = {
      id: saleId,
      numero_ticket: ticketNum,
      fecha: saleDate,
      cliente_nombre: (cliente_nombre && cliente_nombre.trim()) || 'Cliente Mostrador',
      cliente_documento: (cliente_documento && cliente_documento.trim()) || 'S/N',
      metodo_pago: metodo_pago || 'Efectivo',
      subtotal: subtotal,
      impuesto: 0,
      total_venta: subtotal,
      costo_total: costoTotal,
      ganancia_total: gananciaTotal,
      notas: (notas && notas.trim()) || '',
      created_at: saleDate,
      items: saleItems
    };

    localStore.ventas.unshift(newSale);
    saveLocalStore();

    return {
      success: true,
      venta_id: saleId,
      numero_ticket: ticketNum,
      total_venta: subtotal,
      ganancia_total: gananciaTotal,
      fecha: saleDate,
      cliente_nombre: newSale.cliente_nombre,
      items: saleItems
    };
  },

  async getSales(options = {}) {
    const limit = options.limit || 50;
    if (this.isSupabaseActive()) {
      try {
        const { data, error } = await supabase
          .from('ventas')
          .select('*, items:detalle_ventas(*)')
          .order('fecha', { ascending: false })
          .limit(limit);
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Error obteniendo ventas de Supabase:', err.message);
      }
    }
    return localStore.ventas.slice(0, limit);
  },

  // -------------------------------------------------------------
  // ESTADÍSTICAS DE DEMANDA DE PRODUCTOS
  // -------------------------------------------------------------
  async getDemandStatistics(options = {}) {
    let details = localStore.detalle_ventas || [];
    let products = localStore.productos || [];
    let sales = localStore.ventas || [];

    // Si Supabase está activo, consultar tablas de Supabase
    if (this.isSupabaseActive()) {
      try {
        const [pRes, sRes, dRes] = await Promise.all([
          supabase.from('productos').select('*'),
          supabase.from('ventas').select('*'),
          supabase.from('detalle_ventas').select('*')
        ]);
        if (!pRes.error && pRes.data && pRes.data.length > 0) {
          products = pRes.data;
        }
        if (!sRes.error && sRes.data && sRes.data.length > 0) {
          sales = sRes.data;
        }
        if (!dRes.error && dRes.data && dRes.data.length > 0) {
          details = dRes.data;
        }
      } catch (err) {
        console.warn('Error leyendo estadísticas de Supabase, usando local:', err.message);
      }
    }

    // Filter by date range if provided
    let filteredDetails = details;
    if (options.days) {
      const cutoff = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);
      filteredDetails = details.filter(d => new Date(d.created_at) >= cutoff);
    }

    // 1. Demanda acumulada por producto (Unidades vendidas y facturación)
    const productDemandMap = {};
    filteredDetails.forEach(d => {
      if (!productDemandMap[d.codigo]) {
        const prod = products.find(p => p.codigo === d.codigo);
        productDemandMap[d.codigo] = {
          producto_id: d.producto_id,
          codigo: d.codigo,
          nombre: d.nombre_producto,
          categoria: prod ? prod.categoria : 'General',
          stock_actual: prod ? prod.stock : 0,
          foto_url: prod ? prod.foto_url : '/uploads/lib-101.png',
          unidades_vendidas: 0,
          total_ingresos: 0,
          total_ganancia: 0,
          veces_ordenado: 0
        };
      }
      productDemandMap[d.codigo].unidades_vendidas += d.cantidad;
      productDemandMap[d.codigo].total_ingresos += d.subtotal;
      productDemandMap[d.codigo].total_ganancia += d.ganancia;
      productDemandMap[d.codigo].veces_ordenado += 1;
    });

    // Convert map to sorted array (top demanded first)
    const demandList = Object.values(productDemandMap)
      .map(item => ({
        ...item,
        total_ingresos: Math.round(item.total_ingresos * 100) / 100,
        total_ganancia: Math.round(item.total_ganancia * 100) / 100,
        // Alerta de reabastecimiento: alta demanda (>10 unidades) y stock bajo (<= 10 unidades)
        alerta_reabastecimiento: (item.stock_actual <= 10 && item.unidades_vendidas > 0)
      }))
      .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas);

    // 2. Demanda por Categoría de Librería
    const categoryDemand = {};
    demandList.forEach(d => {
      if (!categoryDemand[d.categoria]) {
        categoryDemand[d.categoria] = {
          categoria: d.categoria,
          unidades_vendidas: 0,
          ingresos: 0
        };
      }
      categoryDemand[d.categoria].unidades_vendidas += d.unidades_vendidas;
      categoryDemand[d.categoria].ingresos += d.total_ingresos;
    });

    // 3. Demanda Temporal (Últimos 14 días o según filtro)
    const dailyDemandMap = {};
    const daysToShow = options.days || 14;
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyDemandMap[key] = { fecha: key, unidades: 0, ingresos: 0, ventas_count: 0 };
    }

    filteredDetails.forEach(d => {
      const dateKey = d.created_at.split('T')[0];
      if (dailyDemandMap[dateKey]) {
        dailyDemandMap[dateKey].unidades += d.cantidad;
        dailyDemandMap[dateKey].ingresos += d.subtotal;
      }
    });

    sales.forEach(s => {
      const dateKey = s.fecha.split('T')[0];
      if (dailyDemandMap[dateKey]) {
        dailyDemandMap[dateKey].ventas_count += 1;
      }
    });

    const timeline = Object.values(dailyDemandMap).map(t => ({
      ...t,
      ingresos: Math.round(t.ingresos * 100) / 100
    }));

    // 4. Totales y KPIs Generales
    const totalUnidadesVendidas = demandList.reduce((acc, curr) => acc + curr.unidades_vendidas, 0);
    const totalIngresos = Math.round(demandList.reduce((acc, curr) => acc + curr.total_ingresos, 0) * 100) / 100;
    const totalGanancia = Math.round(demandList.reduce((acc, curr) => acc + curr.total_ganancia, 0) * 100) / 100;
    const margenPromedio = totalIngresos > 0 ? Math.round((totalGanancia / totalIngresos) * 1000) / 10 : 0;
    const stockTotalLibreria = products.reduce((acc, curr) => acc + curr.stock, 0);
    const valorInventarioVenta = Math.round(products.reduce((acc, curr) => acc + curr.stock * curr.precio_venta, 0) * 100) / 100;

    // Alertas críticas de stock
    const alertasStock = products
      .filter(p => p.stock <= 10)
      .map(p => {
        const stats = productDemandMap[p.codigo];
        return {
          codigo: p.codigo,
          nombre: p.nombre,
          stock: p.stock,
          categoria: p.categoria,
          foto_url: p.foto_url,
          unidades_vendidas: stats ? stats.unidades_vendidas : 0,
          nivel_urgencia: p.stock === 0 ? 'CRÍTICO' : (p.stock <= 5 ? 'ALTO' : 'MEDIO')
        };
      })
      .sort((a, b) => a.stock - b.stock);

    return {
      kpis: {
        total_ingresos: totalIngresos,
        total_ganancia: totalGanancia,
        margen_promedio_porcentaje: margenPromedio,
        total_unidades_vendidas: totalUnidadesVendidas,
        stock_total_libreria: stockTotalLibreria,
        valor_inventario: valorInventarioVenta,
        total_productos_catalogo: products.length,
        total_transacciones: sales.length
      },
      top_demandados: demandList.slice(0, 8),
      ranking_completo: demandList,
      distribucion_categoria: Object.values(categoryDemand),
      tendencia_temporal: timeline,
      alertas_reabastecimiento: alertasStock
    };
  }
};

module.exports = Database;
