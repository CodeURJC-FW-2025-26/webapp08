require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const mustacheExpress = require('mustache-express');
const methodOverride = require('method-override');

const platesRouter = require('./routes/plates');

const Plate = require('./models/Plate');

const app = express();

// Configuración
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/zentao';
const UPLOAD_PATH = process.env.UPLOAD_PATH || 'uploads';

// View engine
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', path.join(__dirname, 'views'));
app.engine('mustache', mustacheExpress(path.join(__dirname, 'views', 'partials')));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method')); // para soporte PUT/DELETE via forms
// servir archivos estáticos desde /public en la raíz URL (ej: /css/Style.css => ./public/css/Style.css)
app.use(express.static(path.join(__dirname, 'public')));

// permitir además el prefijo /public en las URLs (para compatibilidad con rutas en la BD que contienen "/public/images/...")
// ejemplo: /public/images/nigiri.jpg -> ./public/images/nigiri.jpg
app.use('/public', express.static(path.join(__dirname, 'public')));

// servir uploads subidos por el usuario
app.use('/uploads', express.static(path.join(__dirname, UPLOAD_PATH)));

// Conexión a MongoDB
mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> {
    console.log('MongoDB conectado');
    const runSeed = require('./seed/seed.js');
    runSeed(); // inserta sólo si la colección está vacía
  })
  .catch(err => console.error('MongoDB error:', err));

// Rutas
app.use('/', platesRouter);

// Página 404 simple
app.use((req, res) => {
  res.status(404).render('main', { errorMessage: 'Página no encontrada' });
});

app.listen(PORT, () => console.log(`Servidor arrancado en http://localhost:${PORT}`));
