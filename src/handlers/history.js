const Meal = require('../models/Meal');

const historyHandler = async (ctx) => {
  try {
    const chatId = ctx.from.id;
    
    const meals = await Meal.find({ chatId })
      .sort({ createdAt: -1 })
      .limit(5);

    if (meals.length === 0) {
      return ctx.reply('Ваша история пока пуста. Отправьте фото еды, чтобы сделать первую запись! 📸');
    }

    let historyMessage = '📜 **Последние 5 записей:**\n\n';
    
    meals.forEach((meal, index) => {
      const date = new Date(meal.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      historyMessage += `${index + 1}. [${date}] **${meal.name}** — ${meal.calories} ккал\n`;
    });

    await ctx.replyWithMarkdown(historyMessage);
  } catch (error) {
    console.error('Ошибка в historyHandler:', error);
    await ctx.reply('Не удалось загрузить историю. Попробуйте позже.');
  }
};

module.exports = historyHandler;
