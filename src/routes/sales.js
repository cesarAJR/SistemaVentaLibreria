const express = require('express');
const router = express.Router();
const Database = require('../db/database');

// POST /api/sales - Registrar nueva venta (POS)
router.post('/', async (req, res) => {
  try {
    const { items, cliente_nombre, cliente_documento, metodo_pago, notas } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe incluir al menos un producto en el ticket de venta.'
      });
    }

    // Registrar venta transaccionalmente (con validación y descuento atómico de stock)
    const saleResult = await Database.registerSale({
      items,
      cliente_nombre,
      cliente_documento,
      metodo_pago,
      notas
    });

    res.status(201).json({
      success: true,
      message: 'Venta registrada con éxito y stock descontado.',
      data: saleResult
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// GET /api/sales - Listado de ventas
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const sales = await Database.getSales({ limit });
    res.json({
      success: true,
      count: sales.length,
      data: sales
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
