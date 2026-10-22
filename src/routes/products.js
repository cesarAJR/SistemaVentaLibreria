const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('../db/database');
const { supabase, isConfigured, supabaseBucket } = require('../config/supabase');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Storage Configuration - Strict PNG filter
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const code = (req.body.codigo || 'prod').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `${code}-${uniqueSuffix}.png`);
  }
});

const fileFilter = (req, file, cb) => {
  // Solo permitir archivos PNG
  if (file.mimetype === 'image/png' || path.extname(file.originalname).toLowerCase() === '.png') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes en formato PNG (.png) para los productos de la librería.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Helper para subir archivo a Supabase Storage si está activo
async function uploadToSupabaseStorage(filePath, fileName) {
  if (isConfigured && supabase) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const { data, error } = await supabase.storage
        .from(supabaseBucket)
        .upload(`productos/${fileName}`, fileBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from(supabaseBucket)
          .getPublicUrl(`productos/${fileName}`);
        return publicUrlData.publicUrl;
      }
    } catch (err) {
      console.warn('Error subiendo imagen a Supabase Storage:', err.message);
    }
  }
  return null;
}

// GET /api/products - Listar productos
router.get('/', async (req, res) => {
  try {
    const { category, search, lowStock } = req.query;
    let products = await Database.getProducts({ category, search });
    if (lowStock === 'true') {
      products = products.filter(p => p.stock <= 10);
    }
    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/products/categories - Obtener categorías únicas
router.get('/categories', async (req, res) => {
  try {
    const products = await Database.getProducts();
    const categories = Array.from(new Set(products.map(p => p.categoria))).filter(Boolean);
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/products/:id - Obtener un producto
router.get('/:id', async (req, res) => {
  try {
    const product = await Database.getProductById(req.params.id) || await Database.getProductByCode(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado.' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/products - Crear nuevo producto con foto PNG
router.post('/', upload.single('foto'), async (req, res) => {
  try {
    const { codigo, nombre, descripcion, categoria, precio_compra, precio_venta, stock, preset_foto } = req.body;

    let foto_url = preset_foto || '/uploads/lib-101.png';

    // Si se subió un archivo PNG
    if (req.file) {
      const relativeLocalUrl = `/uploads/${req.file.filename}`;
      // Intentar subir a Supabase Storage si está activo
      const supabaseUrl = await uploadToSupabaseStorage(req.file.path, req.file.filename);
      foto_url = supabaseUrl || relativeLocalUrl;
    }

    const created = await Database.createProduct({
      codigo,
      nombre,
      descripcion,
      categoria,
      precio_compra,
      precio_venta,
      stock,
      foto_url
    });

    res.status(201).json({ success: true, message: 'Producto registrado exitosamente.', data: created });
  } catch (err) {
    // Si hubo archivo subido y falló la creación, limpiar archivo
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/products/:id - Actualizar producto
router.put('/:id', upload.single('foto'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) {
      const relativeLocalUrl = `/uploads/${req.file.filename}`;
      const supabaseUrl = await uploadToSupabaseStorage(req.file.path, req.file.filename);
      updates.foto_url = supabaseUrl || relativeLocalUrl;
    }

    const updated = await Database.updateProduct(req.params.id, updates);
    res.json({ success: true, message: 'Producto actualizado.', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/products/:id - Eliminar producto
router.delete('/:id', async (req, res) => {
  try {
    await Database.deleteProduct(req.params.id);
    res.json({ success: true, message: 'Producto eliminado del catálogo.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
