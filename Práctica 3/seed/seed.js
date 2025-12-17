// seed/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const Plate = require('../models/Plate');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/zentao';

// Sample data (make sure the file names exist in public/images)
const samplePlates = [
  { title: 'Nigiri de Salmón flambeado', type: 'Sushi', description: 'Increíble nigiri de salmón fresco, ligeramente flameado y servido con salsa de soja.', price: 11.95, duration: 15, allergens: ['Gluten','Pescado','Soja','Sésamo'], images: ['/images/nigiri.png'], order: 1 },
  { title: 'Tempura Uramaki', type: 'Sushi', description: 'Deliciosos rollos de sushi fritos, rellenos de pescado y verduras.', price: 14.75, duration: 18, allergens: ['Gluten','Crustáceos','Sésamo','Sulfitos','Huevos'], images: ['/images/crispy.jpg'], order: 2 },
  { title: 'Rollitos de Primavera', type: 'Entrante', description: 'Crujiente rollito relleno de verduras frescas y carne, acompañado de salsa agridulce.', price: 8.50, duration: 15, allergens: ['Gluten','Soja'], images: ['/images/rollito-de-primavera.webp'], order: 3 },
  { title: 'Crab Rangoon al estilo ZenTao', type: 'Entrante', description: 'Deliciosos wontons rellenos de carne de cangrejo y queso crema, fritos hasta dorarse.', price: 16.85, duration: 20, allergens: ['Crustáceos','Gluten','Lácteos'], images: ['/images/Crab-Rangoon_ExtraLarge700_ID-1620552.jpg'], order: 4 },
  { title: 'Jiao-Zi (8 unidades)', type: 'Entrante', description: 'Delicadas empanadillas chinas al vapor, rellenas de sabor oriental.', price: 8.00, duration: 10, allergens: ['Gluten'], images: ['/images/Jiaozi.jpg'], order: 5 },
  { title: 'Sopa de Wan-Tun', type: 'Principal', description: 'Sopa tradicional china con wan-tun rellenos y verduras.', price: 6.50, duration: 12, allergens: ['Gluten','Soja'], images: ['/images/Wantun.jpg'], order: 6 },
  { title: 'Arroz Tres Delicias', type: 'Principal', description: 'Sabroso arroz frito con huevo, verduras y jamón.', price: 5.50, duration: 10, allergens: ['Huevos'], images: ['/images/tresdelicias.jpg'], order: 7 },
  { title: "Tallarines coreanos 'Udón' con gambas", type: 'Principal', description: 'Fideos udón con gambas y verduras salteadas.', price: 8.75, duration: 12, allergens: ['Crustáceos','Gluten'], images: ['/images/Udon.webp'], order: 8 },
  { title: 'Tou-Fu a la cazuela', type: 'Principal', description: 'Tou-fu tierno en cazuela con hortalizas salteadas y especias.', price: 9.25, duration: 15, allergens: ['Soja','Gluten'], images: ['/images/Toufu.webp'], order: 9 },
  { title: 'Langostinos fritos imperiales', type: 'Principal', description: 'Crujientes langostinos rebozados al estilo oriental, servidos con salsa agridulce.', price: 15.00, duration: 30, allergens: ['Crustáceos','Gluten','Huevos'], images: ['/images/langostinos.webp'], order: 10 },
  { title: 'Ternera con salsa de ostras', type: 'Principal', description: 'Tiras de ternera al wok con verduras y salsa de ostras.', price: 8.95, duration: 15, allergens: ['Moluscos','Gluten','Soja'], images: ['/images/ternera.jpg'], order: 11 },
  { title: 'Pato a la naranja', type: 'Principal', description: 'Pato tierno con salsa de naranja aromática.', price: 10.50, duration: 15, allergens: ['Gluten','Soja','Dióxido de azufre y sulfitos'], images: ['/images/patonaranja.jpg'], order: 12 },
  { title: 'Botella de agua', type: 'Bebida', description: 'Botella de agua de 500ml.', price: 2.00, duration: 0, allergens: [], images: ['/images/agua.jpg'], order: 13 },
  { title: 'Bola de helado', type: 'Postres', description: 'Bola de helado con sabor a elegir.', price: 3.00, duration: 0, allergens: [], images: ['/images/bolasdehelado.jpeg'], order: 14 },
  { title: 'Nata con nueces', type: 'Postres', description: 'Nata cremosa con crujientes nueces.', price: 4.00, duration: 0, allergens: ['Nueces'], images: ['/images/nataconnueces.jpg'], order: 15 }
];

async function seedData() {
  try {
    const count = await Plate.countDocuments();
    if (count > 0) {
      console.log(`La colección 'plates' ya contiene ${count} documentos. No se insertará seed.`);
      return;
    }

    console.log('Insertando datos de ejemplo (seed)...');
    await Plate.insertMany(samplePlates);
    console.log('Seed insertado correctamente.');
  } catch (err) {
    console.error('Error en seed:', err);
    throw err;
  }
}

// We export the function so we can do `await require('./seed/seed.js')` from app.js
module.exports = seedData;

// If the script is executed directly with node (node seed/seed.js), connect and run it.
if (require.main === module) {
  mongoose.connect(MONGO_URL)
    .then(async () => {
      console.log('Mongo conectado (seed standalone)');
      await seedData();
      mongoose.disconnect();
    })
    .catch(err => {
      console.error('Error seed standalone:', err);
    });
}

