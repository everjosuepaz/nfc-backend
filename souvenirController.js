const supabase = require('./supabaseClient');

const BUCKET = process.env.BUCKET_NAME || 'souvenir-photos';

/**
 * GET /v/:souvenir_id
 * Punto de entrada al que apunta el chip NFC.
 *
 * - Si el ID nunca se ha visto -> lo crea como 'pending' (primer escaneo).
 * - Si existe y está 'pending' -> pide mostrar el formulario de activación.
 * - Si existe y está 'active'  -> devuelve datos + URLs públicas de las fotos.
 */
async function getSouvenir(req, res) {
  const { souvenir_id } = req.params;

  try {
    const { data: souvenir, error } = await supabase
      .from('souvenirs')
      .select('*')
      .eq('id', souvenir_id)
      .maybeSingle();

    if (error) throw error;

    // Caso 1: primer escaneo de este chip en la vida
    if (!souvenir) {
      const { error: insertError } = await supabase
        .from('souvenirs')
        .insert({ id: souvenir_id, status: 'pending' });

      if (insertError) throw insertError;

      return res.json({
        status: 'pending',
        souvenir_id,
        message: 'Primer escaneo. Muestra el formulario de activación.',
      });
    }

    // Caso 2: registrado pero aún sin fotos
    if (souvenir.status === 'pending') {
      return res.json({
        status: 'pending',
        souvenir_id: souvenir.id,
        message: 'Muestra el formulario de activación.',
      });
    }

    // Caso 3: ya activo -> traer sus fotos
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('souvenir_id', souvenir_id)
      .order('created_at', { ascending: true });

    if (photosError) throw photosError;

    const photoUrls = photos.map((p) => {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(p.storage_path);
      return data.publicUrl;
    });

    return res.json({
      status: 'active',
      souvenir: {
        id: souvenir.id,
        title: souvenir.title,
        travel_date: souvenir.travel_date,
        description: souvenir.description,
      },
      photos: photoUrls,
    });
  } catch (err) {
    console.error('[getSouvenir]', err);
    return res.status(500).json({ error: 'Error al consultar el souvenir' });
  }
}

/**
 * POST /api/souvenirs/activate
 * Recibe multipart/form-data:
 *   - souvenir_id, title, travel_date, description (campos de texto)
 *   - photos (uno o más archivos, campo 'photos')
 */
async function activateSouvenir(req, res) {
  const { souvenir_id, title, travel_date, description } = req.body;
  const files = req.files;

  if (!souvenir_id) {
    return res.status(400).json({ error: 'souvenir_id es requerido' });
  }
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Debes subir al menos una foto' });
  }

  try {
    // 1. Confirmar que el souvenir existe y no ha sido activado ya
    const { data: souvenir, error: fetchError } = await supabase
      .from('souvenirs')
      .select('id, status')
      .eq('id', souvenir_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!souvenir) {
      return res.status(404).json({ error: 'Souvenir no encontrado. Escanéalo primero.' });
    }
    if (souvenir.status === 'active') {
      return res.status(409).json({ error: 'Este souvenir ya fue activado' });
    }

    // 2. Subir cada foto al bucket, en una carpeta por souvenir_id
    const uploadedPaths = [];
    for (const file of files) {
      const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
      const path = `${souvenir_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file.buffer, { contentType: file.mimetype });

      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
    }

    // 3. Registrar las fotos en la tabla 'photos'
    const photoRows = uploadedPaths.map((storage_path) => ({
      souvenir_id,
      storage_path,
    }));

    const { error: insertPhotosError } = await supabase.from('photos').insert(photoRows);
    if (insertPhotosError) throw insertPhotosError;

    // 4. Marcar el souvenir como 'active' con sus datos
    const { error: updateError } = await supabase
      .from('souvenirs')
      .update({
        title: title || null,
        travel_date: travel_date || null,
        description: description || null,
        status: 'active',
      })
      .eq('id', souvenir_id);

    if (updateError) throw updateError;

    return res.json({
      success: true,
      souvenir_id,
      photos_uploaded: uploadedPaths.length,
    });
  } catch (err) {
    console.error('[activateSouvenir]', err);
    return res.status(500).json({ error: 'Error al activar el souvenir' });
  }
}

module.exports = { getSouvenir, activateSouvenir };
