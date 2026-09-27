const express = require('express');
const multer = require('multer');
const { getSouvenir, activateSouvenir } = require('./souvenirController');

const router = express.Router();

// Guardamos los archivos en memoria (Buffer) para subirlos directo a
// Supabase Storage, sin escribir nada al disco del servidor.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB por foto
});

// El chip NFC apunta aquí: https://tudominio.com/v/PARIS-00001
router.get('/v/:souvenir_id', getSouvenir);

// El formulario de activación (Modo Carga) llama a este endpoint.
// 'photos' debe coincidir con el name= del input file en el frontend.
router.post('/api/souvenirs/activate', upload.array('photos', 15), activateSouvenir);

module.exports = router;
