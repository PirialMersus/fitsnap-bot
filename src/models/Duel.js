const mongoose = require('mongoose');

const duelSchema = new mongoose.Schema({
  user1Id: {
    type: Number,
    required: true,
    index: true,
  },
  user2Id: {
    type: Number,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'finished'],
    default: 'active',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
});

// Индекс для быстрого поиска всех активных дуэлей пользователя
duelSchema.index({ user1Id: 1, status: 1 });
duelSchema.index({ user2Id: 1, status: 1 });

module.exports = mongoose.model('Duel', duelSchema);
