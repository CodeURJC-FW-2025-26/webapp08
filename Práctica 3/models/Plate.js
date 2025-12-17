const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' }
}, { _id: true });

const PlateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v){
        // starts with a capital letter A–Z (supports basic Latin characters)
        return /^[A-ZÀ-Ý]/.test(v);
      },
      message: props => `${props.value} debe comenzar con letra mayúscula`
    }
  },
  type: { type: String, required: true }, // Starter, Main, Sushi, etc.
  description: { type: String, required: true, minlength: 10, maxlength: 1000 },
  price: { type: Number, required: true, min: 0 },
  duration: { type: Number, min: 0, default: 0 }, // minutes
  allergens: { type: [String], default: [] },
  images: { type: [String], default: [] }, // relative paths: /uploads/filename.jpg
  order: { type: Number, default: 9999 },  // lower = appears earlier
  // previously: ingredients: { type: [IngredientSchema], default: [] },
  ingredients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Plate', PlateSchema);
