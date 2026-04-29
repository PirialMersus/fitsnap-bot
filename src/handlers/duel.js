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

    const buttons = [];

    if (activeDuels.length === 0) {
      duelsMessage += `У вас пока нет активных дуэлей.\n\n`;
    } else {
      duelsMessage += `👥 **Ваши текущие пары:**\n`;
      
      const escapeMarkdown = (text) => {
        return text ? text.replace(/[_*`[\]()]/g, '\\$&') : '';
      };

      for (const duel of activeDuels) {
        const partnerId = duel.user1Id === chatId ? duel.user2Id : duel.user1Id;
        const partner = await User.findOne({ chatId: partnerId });
        
        const name = partner ? (partner.firstName || partner.username || 'Напарник') : 'Удаленный аккаунт';
        const username = partner && partner.username ? ` (@${escapeMarkdown(partner.username)})` : '';
        const displayName = escapeMarkdown(name);
        
        duelsMessage += `\n👤 ${displayName}${username}`;
        
        buttons.push([Markup.button.callback(`❌ Удалить ${name}`, `delete_duel_${duel._id}`)]);
      }
      duelsMessage += `\n\n`;
    }

    duelsMessage += `Пригласите друзей, родственников или коллег, чтобы вместе следить за питанием! Отправьте им эту ссылку:\n\n\`${inviteLink}\`\n\nКак только они перейдут по ссылке и запустят бота, дуэль начнется автоматически. Вы будете получать фото их приемов пищи и сможете их комментировать!`;

    if (buttons.length > 0) {
      await ctx.reply(duelsMessage, { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      });
    } else {
      await ctx.reply(duelsMessage, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Ошибка в duelMenuHandler:', error);
    await ctx.reply('Произошла ошибка при загрузке дуэлей. Пожалуйста, попробуйте позже.');
  }
};

const deleteDuelHandler = async (ctx) => {
  try {
    const duelId = ctx.match[1];
    
    const duel = await Duel.findById(duelId);
    if (!duel) {
      return ctx.answerCbQuery('Дуэль не найдена или уже удалена.');
    }

    duel.status = 'finished';
    await duel.save();

    await ctx.answerCbQuery('Пара успешно удалена.');
    
    // Обновляем сообщение меню дуэлей
    // Для этого вызываем duelMenuHandler, но так как он отправляет новое сообщение, 
    // возможно лучше было бы редактировать текущее. 
    // Но duelMenuHandler в текущем виде делает reply.
    // Отредактируем текущее сообщение, чтобы оно соответствовало новому состоянию.
    
    await ctx.editMessageText('✅ Пара удалена. Обновляю список...');
    
    // Небольшая задержка перед обновлением меню
    setTimeout(async () => {
      try {
        await duelMenuHandler(ctx);
      } catch (e) {
        console.error('Ошибка при обновлении меню после удаления:', e);
      }
    }, 1000);

  } catch (error) {
    console.error('Ошибка в deleteDuelHandler:', error);
    await ctx.answerCbQuery('Произошла ошибка при удалении.');
  }
};

module.exports = {
  duelMenuHandler,
  deleteDuelHandler
};
