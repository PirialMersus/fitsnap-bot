const { GoogleGenerativeAI } = require('@google/generative-ai');
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
  
  // Если MIME тип не определен или является общим потоком, ставим image/jpeg (стандарт для фото в Telegram)
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
 * Анализирует фото еды и возвращает JSON с БЖУ и калориями
 * @param {string} photoUrl - URL фотографии
 * @returns {Promise<Object>}
 */
const analyzeFoodPhoto = async (photoUrl) => {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY не задан!');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    // Очищаем ответ от возможных маркдаун-тегов ```json ... ```
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Ошибка при анализе фото через Gemini:', error);
    throw new Error('Не удалось проанализировать фото.');
  }
};

module.exports = {
  analyzeFoodPhoto
};
