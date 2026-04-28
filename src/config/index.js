require('dotenv').config();

const config = {
  botToken: process.env.BOT_TOKEN,
  mongoUri: process.env.MONGO_URI,
  geminiApiKey: process.env.GEMINI_API_KEY,
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  webhookDomain: process.env.WEBHOOK_DOMAIN,
};

const requiredKeys = ['botToken', 'mongoUri', 'geminiApiKey'];
for (const key of requiredKeys) {
  if (!config[key]) {
    console.warn(`Внимание: Не задана переменная окружения ${key}`);
  }
}

module.exports = config;
