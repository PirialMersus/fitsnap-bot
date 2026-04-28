const connectDB = require('./core/db');
const bot = require('./core/bot');
const { startServer } = require('./core/server');

// Middlewares
const rateLimitMiddleware = require('./middlewares/rateLimit');

// Handlers
const startHandler = require('./handlers/start');
const photoHandler = require('./handlers/photo');
const statsHandler = require('./handlers/stats');
const historyHandler = require('./handlers/history');

const bootstrap = async () => {
  try {
    // 1. Подключаемся к БД
    await connectDB();

    // 2. Настраиваем меню команд
    await bot.telegram.setMyCommands([
      { command: 'start', description: '🏠 Главная / Помощь' },
    ]);

    // 3. Настраиваем middleware
    bot.use(rateLimitMiddleware);

    // 3. Регистрируем обработчики
    bot.start(startHandler);
    bot.on('photo', photoHandler);

    // Обработчики кнопок меню
    bot.hears('📸 Добавить еду', (ctx) => {
      ctx.reply('Просто отправьте мне фотографию вашей еды, и я всё посчитаю! 🍽️');
    });
    bot.hears('📊 Статистика за день', statsHandler);
    bot.hears('📜 История', historyHandler);

    // Обработка остальных текстовых сообщений
    bot.on('text', (ctx) => {
      ctx.reply('Я понимаю только фотографии еды или команды из меню. Пожалуйста, отправь фото! 📸');
    });

    // 4. Запускаем сервер (Express) и бота (через webhook или long polling)
    await startServer();

  } catch (error) {
    console.error('Критическая ошибка при запуске бота:', error);
    process.exit(1);
  }
};

bootstrap();
