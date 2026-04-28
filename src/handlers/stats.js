const Meal = require('../models/Meal');

const statsHandler = async (ctx) => {
  try {
    const chatId = ctx.from.id;
    
    // Начало текущего дня
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Конец текущего дня
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const meals = await Meal.find({
      chatId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    if (meals.length === 0) {
      return ctx.reply('За сегодня еще нет записей. Отправь мне фото своей еды, чтобы начать отслеживание! 🍽️');
    }

    const totals = meals.reduce((acc, meal) => {
      acc.calories += meal.calories;
      acc.proteins += meal.proteins;
      acc.fats += meal.fats;
      acc.carbs += meal.carbs;
      return acc;
    }, { calories: 0, proteins: 0, fats: 0, carbs: 0 });

    const statsMessage = `
📊 **Ваша статистика за сегодня:**

🔥 Калории: **${totals.calories}** ккал
🟢 Белки: **${totals.proteins.toFixed(1)}** г
🟡 Жиры: **${totals.fats.toFixed(1)}** г
🔵 Углеводы: **${totals.carbs.toFixed(1)}** г

🍽 Всего приемов пищи: **${meals.length}**
    `;

    await ctx.replyWithMarkdown(statsMessage);
  } catch (error) {
    console.error('Ошибка в statsHandler:', error);
    await ctx.reply('Не удалось получить статистику. Попробуйте позже.');
  }
};

module.exports = statsHandler;
