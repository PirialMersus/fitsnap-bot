const Meal = require('../models/Meal');
const { analyzeFoodPhoto } = require('../services/geminiService');

const photoHandler = async (ctx) => {
  const chatId = ctx.from.id;

  const escapeMarkdown = (text) => {
    return text ? text.replace(/[_*`[\]()]/g, '\\$&') : '';
  };

  // Уведомляем пользователя, что процесс пошел
  const statusMessage = await ctx.replyWithMarkdown('✨ *Магия AI в действии...*\nАнализирую ваше блюдо, это займет всего несколько секунд...');

  try {
    // Берем самое большое фото (оно всегда последнее в массиве)
    const photo = ctx.message.photo[ctx.message.photo.length - 1];

    // Получаем ссылку на файл в Telegram
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    const photoUrl = fileLink.href;

    // Отправляем фото в Gemini
    const foodData = await analyzeFoodPhoto(photoUrl);

    // Валидация ответа (базовая)
    if (!foodData.name || foodData.calories === undefined) {
      throw new Error('Gemini вернул неполные данные');
    }

    // Сохраняем в БД
    const meal = new Meal({
      chatId,
      name: foodData.name,
      weight: foodData.weight,
      calories: foodData.calories,
      proteins: foodData.proteins,
      fats: foodData.fats,
      carbs: foodData.carbs,
      healthScore: foodData.healthScore,
      compatibilityScore: foodData.compatibilityScore,
    });

    await meal.save();

    const getHealthIcon = (score) => {
      if (score >= 8) return '🥗 (Отлично)';
      if (score >= 5) return '⚖️ (Средне)';
      return '⚠️ (Не очень)';
    };

    // Формируем красивый ответ
    const replyText = `
🍽 **${escapeMarkdown(foodData.name)}**
⚖️ ~${foodData.weight} г

━━━━━━━━━━━━━━
🔥 **${foodData.calories} ккал**
━━━━━━━━━━━━━━

🟢 **Белки:** ${foodData.proteins} г
🟡 **Жиры:** ${foodData.fats} г
🔵 **Углеводы:** ${foodData.carbs} г

━━━━━━━━━━━━━━
🌟 **Полезность:** ${foodData.healthScore}/10 ${getHealthIcon(foodData.healthScore)}
🧬 **Совместимость:** ${foodData.compatibilityScore}/10
━━━━━━━━━━━━━━

✅ Запись сохранена в ваш дневник!
    `;

    // Редактируем статусное сообщение на результат
    await ctx.telegram.editMessageText(
      chatId,
      statusMessage.message_id,
      null,
      replyText,
      { parse_mode: 'Markdown' }
    );

    // --- ЛОГИКА ДУЭЛЕЙ ---
    // Ищем всех активных напарников
    const Duel = require('../models/Duel');
    const { Markup } = require('telegraf');

    const activeDuels = await Duel.find({
      $or: [{ user1Id: chatId }, { user2Id: chatId }],
      status: 'active'
    });

    if (activeDuels.length > 0) {
      const User = require('../models/User');
      const author = await User.findOne({ chatId });

      const authorName = escapeMarkdown(author?.firstName || author?.username || 'Твой напарник');
      const mealName = escapeMarkdown(foodData.name);

      const partnerCaption = `🍽 **${authorName} только что поел(а)!**\n\nБлюдо: ${mealName}\nКалории: ${foodData.calories} ккал\nПолезность: ${foodData.healthScore}/10 ${getHealthIcon(foodData.healthScore)}\n\nЧто думаешь об этом выборе?`;

      for (const duel of activeDuels) {
        const partnerId = duel.user1Id === chatId ? duel.user2Id : duel.user1Id;

        try {
          // Отправляем фото напарнику
          await ctx.telegram.sendPhoto(partnerId, photo.file_id, {
            caption: partnerCaption,
            reply_markup: Markup.inlineKeyboard([
              Markup.button.callback('💬 Прокомментировать', `comment_${chatId}`)
            ]).reply_markup
          });
        } catch (err) {
          console.error(`Не удалось отправить фото напарнику ${partnerId}:`, err.message);
        }
      }
    }


  } catch (error) {
    console.error('КРИТИЧЕСКАЯ ОШИБКА в photoHandler:', {
      message: error.message,
      stack: error.stack,
      data: error.response?.data // если ошибка от axios
    });

    // Пытаемся отправить более детальное сообщение пользователю (только для отладки)
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `❌ Ошибка: ${error.message}`
      : '❌ Извините, не удалось распознать еду на фото или произошла системная ошибка. Попробуйте сфотографировать блюдо с другого ракурса.';

    await ctx.telegram.editMessageText(
      chatId,
      statusMessage.message_id,
      null,
      errorMessage
    ).catch(e => console.error('Не удалось обновить статусное сообщение:', e.message));
  }
};

module.exports = photoHandler;
