const { Markup } = require('telegraf');
const User = require('../models/User');
const Duel = require('../models/Duel');

const startHandler = async (ctx) => {
  try {
    const { id: chatId, username, first_name: firstName, last_name: lastName } = ctx.from;
    const payload = ctx.payload;

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

    if (payload && payload.startsWith('duel_')) {
      const inviterId = parseInt(payload.split('_')[1], 10);
      if (inviterId && inviterId !== chatId) {
        const inviter = await User.findOne({ chatId: inviterId });
        if (inviter) {
          const existingDuel = await Duel.findOne({
            $or: [
              { user1Id: inviterId, user2Id: chatId, status: 'active' },
              { user1Id: chatId, user2Id: inviterId, status: 'active' }
            ]
          });
          
          if (!existingDuel) {
            const newDuel = new Duel({
              user1Id: inviterId,
              user2Id: chatId
            });
            await newDuel.save();
            
            try {
              await ctx.telegram.sendMessage(
                inviterId, 
                `⚔️ **Ура!** ${firstName || username || 'Новый напарник'} принял твой вызов на дуэль питания! Теперь вы будете видеть приемы пищи друг друга.`,
                { parse_mode: 'Markdown' }
              );
            } catch (e) {
              console.error('Не удалось отправить уведомление инициатору дуэли', e);
            }
            
            await ctx.reply(`⚔️ **Дуэль началась!** Вы приняли вызов от ${inviter.firstName || inviter.username || 'Напарника'}. Теперь вы следите за питанием друг друга!`, { parse_mode: 'Markdown' });
          } else {
            await ctx.reply('Вы уже состоите в дуэли с этим пользователем! ⚔️');
          }
        }
      } else if (inviterId === chatId) {
        await ctx.reply('Вы не можете начать дуэль с самим собой! 😅');
      }
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
      ['📊 Статистика за день', '📜 История'],
      ['⚔️ Дуэли']
    ]).resize();


    await ctx.replyWithMarkdown(welcomeMessage, mainMenu);
  } catch (error) {
    console.error('Ошибка в startHandler:', error);
    await ctx.reply('Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.');
  }
};

module.exports = startHandler;
