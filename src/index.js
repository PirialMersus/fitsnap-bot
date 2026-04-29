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
const { duelMenuHandler, deleteDuelHandler } = require('./handlers/duel');
const User = require('./models/User');

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
    bot.hears('⚔️ Дуэли', duelMenuHandler);

    // Обработка кнопки комментария
    bot.action(/comment_(.+)/, async (ctx) => {
      const targetChatId = ctx.match[1];
      const chatId = ctx.from.id;

      await User.updateOne({ chatId }, { state: `awaiting_comment_${targetChatId}` });
      await ctx.answerCbQuery();
      await ctx.reply('Напиши свой комментарий к этому приему пищи (отправь его следующим сообщением):');
    });

    // Обработка удаления дуэли
    bot.action(/delete_duel_(.+)/, deleteDuelHandler);

    // Обработка остальных текстовых сообщений
    bot.on('text', async (ctx) => {
      const chatId = ctx.from.id;
      const text = ctx.message.text;

      const user = await User.findOne({ chatId });

      if (user && user.state && user.state.startsWith('awaiting_comment_')) {
        const targetChatId = parseInt(user.state.split('_')[2], 10);
        const authorName = user.firstName || user.username || 'Напарник';

        try {
          await ctx.telegram.sendMessage(
            targetChatId,
            `💬 **Комментарий от ${authorName}:**\n\n"${text}"`,
            { parse_mode: 'Markdown' }
          );
          await ctx.reply('✅ Комментарий отправлен напарнику!');
        } catch (e) {
          console.error('Не удалось отправить комментарий', e);
          await ctx.reply('❌ Ошибка при отправке комментария (возможно напарник заблокировал бота).');
        }

        // Сбрасываем стейт
        await User.updateOne({ chatId }, { state: 'idle' });
        return;
      }

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
