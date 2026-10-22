const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { isConfigured, supabaseBucket } = require('./src/config/supabase');
const productsRouter = require('./src/routes/products');
const salesRouter = require('./src/routes/sales');
const statsRouter = require('./src/routes/stats');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Rutas de API
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/stats', statsRouter);

// Endpoint de estado del sistema
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Sistema de Gestión de Librería',
    version: '1.0.0',
    storage_mode: isConfigured ? 'Supabase Cloud (PostgreSQL & Storage)' : 'Local Persistente / Híbrido (Listo para Supabase)',
    bucket: supabaseBucket,
    timestamp: new Date().toISOString()
  });
});

// Fallback SPA para cualquier otra ruta
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('⚠️ Error no controlado:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor.'
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`📚 SISTEMA DE LIBRERÍA - SERVIDOR ACTIVO`);
  console.log(`🚀 URL: http://localhost:${PORT}`);
  console.log(`📊 Modo de Almacenamiento: ${isConfigured ? 'Supabase' : 'Local Híbrido (db.json)'}`);
  console.log(`====================================================`);
});
