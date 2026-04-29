const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  chatId: {
    type: Number,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  weight: {
    type: Number,
    required: true,
  },
  calories: {
    type: Number,
    required: true,
  },
  proteins: {
    type: Number,
    required: true,
  },
  fats: {
    type: Number,
    required: true,
  },
  carbs: {
    type: Number,
    required: true,
  },
  healthScore: {
    type: Number,
    default: 0,
  },
  compatibilityScore: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Meal', mealSchema);
