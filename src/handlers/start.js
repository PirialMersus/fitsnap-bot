const { Markup } = require('telegraf');
const User = require('../models/User');

const startHandler = async (ctx) => {
  try {
    const { id: chatId, username, first_name: firstName, last_name: lastName } = ctx.from;

    // Ищем или создаем пользователя
    let user = await User.findOne({ chatId });
    
    if (!user) {
      user = new User({
        chatId,
        username,
        firstName,
        lastName,
      });
      await user.save();
    }

    const welcomeMessage = `
🌟 **Добро пожаловать в FitSnap!** 🌟

Привет, ${firstName || 'друг'}! Я — твой персональный AI-нутрициолог. Моя цель — сделать твой путь к здоровью легким и приятным. ✨

**Забудь про:**
❌ Поиск продуктов в базах данных
❌ Весы и взвешивание каждой порции
❌ Сложные расчеты КБЖУ в уме

**Как это работает? Всё очень просто:**
1️⃣ **Сфотографируй** свою тарелку 📸
2️⃣ **Отправь** фото мне в чат 📩
3️⃣ **Получи** детальный расчет калорий и БЖУ через секунду! ⚡️

Я всё запомню и внесу в твой личный дневник питания. 

*Готов начать? Просто отправь мне фото своего завтрака, обеда или ужина!* 👇
    `;

    const mainMenu = Markup.keyboard([
      ['📸 Добавить еду'],
      ['📊 Статистика за день', '📜 История']
    ]).resize();

    await ctx.replyWithMarkdown(welcomeMessage, mainMenu);
  } catch (error) {
    console.error('Ошибка в startHandler:', error);
    await ctx.reply('Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.');
  }
};

module.exports = startHandler;
