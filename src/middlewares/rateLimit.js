const messageCounts = new Map();

// Простая реализация in-memory rate limiter
// Ограничение: не более 1 сообщения в секунду от пользователя
const rateLimitMiddleware = (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const userRecord = messageCounts.get(userId);

  if (userRecord && now - userRecord < 1000) {
    // Если прошло меньше 1000 мс с последнего сообщения, игнорируем или предупреждаем
    // Для защиты от сильного спама можно просто не отвечать
    return;
  }

  // Обновляем время последнего сообщения
  messageCounts.set(userId, now);

  // Очистка старых записей, чтобы избежать утечек памяти
  // (В реальном проекте лучше использовать Redis или библиотеку lru-cache)
  if (messageCounts.size > 10000) {
    messageCounts.clear();
  }

  return next();
};

module.exports = rateLimitMiddleware;
