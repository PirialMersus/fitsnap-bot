const express = require('express');
const config = require('../config');
const bot = require('./bot');

const app = express();

app.use(express.json());

// Простой эндпоинт для UptimeRobot, чтобы сервер не засыпал на бесплатном тарифе Render
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

const startServer = async () => {
  const isProduction = config.nodeEnv === 'production';

  if (isProduction && config.webhookDomain) {
    // В production используем Webhook
    const secretPath = `/telegraf/${bot.secretPathComponent()}`;
    
    // Подключаем Webhook middleware от Telegraf
    app.use(bot.webhookCallback(secretPath));
    
    // Запускаем Express сервер
    app.listen(config.port, async () => {
      console.log(`Express сервер запущен на порту ${config.port} (Production mode)`);
      // Устанавливаем вебхук в Telegram
      await bot.telegram.setWebhook(`${config.webhookDomain}${secretPath}`);
      console.log(`Webhook установлен на ${config.webhookDomain}${secretPath}`);
    });
  } else {
    // В development (или если нет WEBHOOK_DOMAIN) используем Long Polling
    app.listen(config.port, () => {
      console.log(`Express сервер запущен на порту ${config.port} (Development mode - UptimeRobot Endpoint Active)`);
    });
    
    // Удаляем старый вебхук перед запуском Long Polling (чтобы избежать конфликтов)
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    
    bot.launch();
    console.log('Бот запущен в режиме Long Polling');
  }
};

// Глобальная обработка остановки
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { app, startServer };
