const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const config = require('../config');
const axios = require('axios');

let genAI;
if (config.geminiApiKey) {
  genAI = new GoogleGenerativeAI(config.geminiApiKey);
}

/**
 * Скачивает изображение по URL и возвращает объект для Gemini API
 */
const fetchImageForGemini = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  let mimeType = response.headers['content-type'];

  if (!mimeType || mimeType === 'application/octet-stream') {
    mimeType = 'image/jpeg';
  }

  return {
    inlineData: {
      data: Buffer.from(response.data).toString('base64'),
      mimeType: mimeType
    }
  };
};

/**
 * Вспомогательная функция для повторных попыток при перегрузке API
 */
const retryRequest = async (fn, retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      const errorMessage = error.message.toLowerCase();
      const isRetryable = errorMessage.includes('503') || 
                          errorMessage.includes('overloaded') || 
                          errorMessage.includes('429') ||
                          errorMessage.includes('service unavailable');
      
      if (isRetryable && i < retries - 1) {
        console.warn(`Gemini перегружен (попытка ${i + 1}/${retries}). Ожидание ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
};

/**
 * Анализирует фото еды и возвращает JSON с БЖУ и калориями
 */
const analyzeFoodPhoto = async (photoUrl) => {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY не задан!');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ]
  });

  const prompt = `
Ты профессиональный нутрициолог. Посмотри на это фото еды и сделай оценку:
1. Название блюда (name).
2. Примерный вес в граммах (weight).
3. Общая калорийность в ккал (calories).
4. Белки в граммах (proteins).
5. Жиры в граммах (fats).
6. Углеводы в граммах (carbs).

Твой ответ ДОЛЖЕН быть строго в формате JSON, без маркдауна, без комментариев и без лишнего текста.
Пример:
{
  "name": "Яичница с беконом",
  "weight": 250,
  "calories": 450,
  "proteins": 25,
  "fats": 35,
  "carbs": 5
}
`;

  try {
    const imagePart = await fetchImageForGemini(photoUrl);
    
    const result = await retryRequest(() => model.generateContent([prompt, imagePart]));
    const response = await result.response;

    if (response.candidates && response.candidates[0].finishReason === 'SAFETY') {
      throw new Error('ИИ заблокировал анализ этого фото из-за фильтров безопасности. Попробуйте другое фото.');
    }

    const responseText = response.text();
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('ОШИБКА GEMINI API:', {
      message: error.message,
      stack: error.stack
    });

    if (error.message.includes('Text not available')) {
      throw new Error('ИИ не смог сгенерировать ответ. Возможно, изображение слишком размытое или заблокировано фильтрами.');
    }

    throw new Error(`Ошибка Gemini: ${error.message}`);
  }
};

module.exports = {
  analyzeFoodPhoto
};
