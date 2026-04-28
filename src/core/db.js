const mongoose = require('mongoose');
const config = require('../config');

const connectDB = async () => {
  try {
    if (!config.mongoUri) {
      console.warn('MongoDB URI не задан, пропускаем подключение к БД');
      return;
    }
    
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB успешно подключена');
  } catch (error) {
    console.error('Ошибка подключения к MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
