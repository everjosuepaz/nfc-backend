require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Revisa tu archivo .env'
  );
}

// Cliente único, compartido por toda la app. Usa la service_role key
// a propósito: este backend es el único que debe poder escribir.
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
