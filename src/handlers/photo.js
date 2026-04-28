const Meal = require('../models/Meal');
const { analyzeFoodPhoto } = require('../services/geminiService');

const photoHandler = async (ctx) => {
  const chatId = ctx.from.id;
  
  // Уведомляем пользователя, что процесс пошел
  const statusMessage = await ctx.replyWithMarkdown('✨ *Магия AI в действии...*\nАнализирую ваше блюдо, это займет всего пару секунд...');
  
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
    });
    
    await meal.save();

    // Формируем красивый ответ
    const replyText = `
🍽 **${foodData.name}**
⚖️ ~${foodData.weight} г

━━━━━━━━━━━━━━
🔥 **${foodData.calories} ккал**
━━━━━━━━━━━━━━

🟢 **Белки:** ${foodData.proteins} г
🟡 **Жиры:** ${foodData.fats} г
🔵 **Углеводы:** ${foodData.carbs} г

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

  } catch (error) {
    console.error('Ошибка в photoHandler:', error);
    
    await ctx.telegram.editMessageText(
      chatId,
      statusMessage.message_id,
      null,
      '❌ Извините, не удалось распознать еду на фото или произошла системная ошибка. Попробуйте сфотографировать блюдо с другого ракурса.'
    );
  }
};

module.exports = photoHandler;
