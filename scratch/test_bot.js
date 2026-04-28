const connectDB = require('../src/core/db');
const bot = require('../src/core/bot');
const startHandler = require('../src/handlers/start');
const statsHandler = require('../src/handlers/stats');
const historyHandler = require('../src/handlers/history');
const photoHandler = require('../src/handlers/photo');
const rateLimitMiddleware = require('../src/middlewares/rateLimit');

// Мокаем контекст Telegraf
const createMockCtx = (updateType, data = {}) => {
  const ctx = {
    from: { id: 12345, first_name: 'TestUser' },
    chat: { id: 12345 },
    reply: async (text) => { console.log(`[BOT REPLY]: ${text}`); return { message_id: 1 }; },
    replyWithMarkdown: async (text) => { console.log(`[BOT REPLY MD]: ${text}`); return { message_id: 1 }; },
    telegram: {
      getFileLink: async () => ({ href: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' }), // Ссылка на тестовое фото салата
      editMessageText: async (cid, mid, res, text) => console.log(`[BOT EDIT]: ${text}`),
      setMyCommands: async () => {}
    }
  };

  if (updateType === 'command') {
    ctx.message = { text: data.text || '/start' };
  } else if (updateType === 'photo') {
    ctx.message = { photo: [{ file_id: 'test_file_id' }] };
  } else if (updateType === 'text') {
    ctx.message = { text: data.text };
  }

  return ctx;
};

const runTests = async () => {
  await connectDB();
  console.log('--- Начинаю тестирование ---');

  // 1. Тест /start
  console.log('\n[TEST 1] Команда /start:');
  const startCtx = createMockCtx('command', { text: '/start' });
  await startHandler(startCtx);

  // 2. Тест кнопки Статистика
  console.log('\n[TEST 2] Кнопка "Статистика":');
  const statsCtx = createMockCtx('text', { text: '📊 Статистика за день' });
  await statsHandler(statsCtx);

  // 3. Тест кнопки История
  console.log('\n[TEST 3] Кнопка "История":');
  const historyCtx = createMockCtx('text', { text: '📜 История' });
  await historyHandler(historyCtx);

  // 4. Тест Распознавания Фото (Gemini)
  console.log('\n[TEST 4] Отправка фото еды (Салат):');
  const photoCtx = createMockCtx('photo');
  await photoHandler(photoCtx);

  // 5. Тест Защиты от спама
  console.log('\n[TEST 5] Защита от спама (3 сообщения за 0.5 сек):');
  const spamCtx = createMockCtx('text', { text: 'Привет' });
  let passed = 0;
  const next = () => { passed++; return Promise.resolve(); };
  
  await rateLimitMiddleware(spamCtx, next);
  await rateLimitMiddleware(spamCtx, next);
  await rateLimitMiddleware(spamCtx, next);
  
  console.log(`Сообщений пропущено: ${passed} (должно быть 1)`);

  console.log('\n--- Тестирование завершено ---');
  process.exit(0);
};

runTests();
