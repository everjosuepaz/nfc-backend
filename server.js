require('dotenv').config();
const express = require('express');
const cors = require('cors');
const souvenirRoutes = require('./souvenirRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/', souvenirRoutes);

app.get('/', (_req, res) => {
  res.send('Backend de souvenirs NFC funcionando ✅');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
