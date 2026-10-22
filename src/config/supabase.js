const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabaseBucket = process.env.SUPABASE_BUCKET || 'productos-fotos';

let supabase = null;
let isConfigured = false;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    isConfigured = true;
    console.log('✅ Cliente de Supabase inicializado correctamente.');
  } catch (err) {
    console.warn('⚠️ Error al inicializar cliente de Supabase:', err.message);
  }
} else {
  console.log('ℹ️ Modo Local / Persistente activo (Supabase no configurado en .env aún).');
}

module.exports = {
  supabase,
  isConfigured,
  supabaseBucket,
  supabaseUrl
};
