const { Telegraf } = require('telegraf');
const config = require('../config');

if (!config.botToken) {
  console.error('BOT_TOKEN не задан! Бот не может быть запущен.');
  process.exit(1);
}

const bot = new Telegraf(config.botToken);

module.exports = bot;
