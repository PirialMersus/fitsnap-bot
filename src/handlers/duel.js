const { Markup } = require('telegraf');
const Duel = require('../models/Duel');
const User = require('../models/User');

const duelMenuHandler = async (ctx) => {
  try {
    const chatId = ctx.from.id;
    const botInfo = ctx.botInfo;

    const inviteLink = `https://t.me/${botInfo.username}?start=duel_${chatId}`;

    // Ищем активные дуэли
    const activeDuels = await Duel.find({
      $or: [{ user1Id: chatId }, { user2Id: chatId }],
      status: 'active'
    });

    let duelsMessage = `⚔️ **Ваши Дуэли**\n\n`;

    if (activeDuels.length === 0) {
      duelsMessage += `У вас пока нет активных дуэлей.\n\n`;
    } else {
      duelsMessage += `У вас активных напарников: **${activeDuels.length}**\n\n`;
      // Можно было бы подгрузить имена напарников, но для простоты просто покажем кол-во
    }

    duelsMessage += `Пригласите друзей, родственников или коллег, чтобы вместе следить за питанием! Отправьте им эту ссылку:\n\n\`${inviteLink}\`\n\nКак только они перейдут по ссылке и запустят бота, дуэль начнется автоматически. Вы будете получать фото их приемов пищи и сможете их комментировать!`;

    await ctx.reply(duelsMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Ошибка в duelMenuHandler:', error);
    await ctx.reply('Произошла ошибка при загрузке дуэлей. Пожалуйста, попробуйте позже.');
  }
};

module.exports = duelMenuHandler;
