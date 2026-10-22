const express = require('express');
const router = express.Router();
const Database = require('../db/database');

// GET /api/stats/demand - Estadísticas completas de demanda de productos
router.get('/demand', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days, 10) : 14;
    const stats = await Database.getDemandStatistics({ days });

    res.json({
      success: true,
      periodo_dias: days,
      data: stats
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
