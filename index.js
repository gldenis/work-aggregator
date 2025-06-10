const fs = require('fs');
const path = require('path');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const input = require('input');

const apiId = 22009789; // ваш API ID
const apiHash = '320581df07b95ea18333cd10f41b92cd'; // ваш API HASH
const sessionFilePath = path.join(__dirname, 'session.txt');

// Загружаем сессию из файла (если есть)
let sessionString = '';
if (fs.existsSync(sessionFilePath)) {
  sessionString = fs.readFileSync(sessionFilePath, 'utf8');
}
const stringSession = new StringSession(sessionString);

// Чаты и, при необходимости, их топики
// если для чата массив пустой или отсутствует — разрешены все сообщения
const monitoredSources = {
  // '2863458813': [2], // только топики
  '1779588634': [45042], // только топики
  '1616204072': undefined, // 𝘽𝙚𝙧𝙡𝙞𝙣 𝙥𝙖𝙧𝙖𝙙𝙞𝙨𝙚🎼ЧАТ БЕРЛИН
  '2137211488': undefined, // Svoi.Berlin
  '1589772550': undefined, // Berlin helps Ukrainians
  '1641170995': [56554, 56738], // Доска объявлений Германии/Alles
  '1221376441': undefined, // Германия Берлин Чат
  '2360167407': undefined, // УКРАИНЦЫ В БЕРЛИНЕ | ЧАТ🇩🇪
  '1752185026': undefined, // Берлин новости объявления Германия
  '1394981443': undefined, // Берлин чатик 🇩🇪 | CHATIK
  // '-1002633667190': [],         // весь чат, все топики
  '2633667190': undefined,  // весь чат (без топиков или любые)
};


const targetChatId = -1002694799076; // чат для пересылки

function loadWordList(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return data
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line && !line.startsWith('#'));
  } catch (err) {
    console.error(`❌ Не удалось загрузить ${filePath}:`, err.message);
    return [];
  }
}

// Загрузка списков
const keywords = loadWordList(path.join(__dirname, 'keywords.txt'));
const blacklist = loadWordList(path.join(__dirname, 'blacklist.txt'));

function messageMatches(text) {
  const lowered = text.toLowerCase();
  const hasKeyword = keywords.some(word => lowered.includes(word));
  const hasBlacklisted = blacklist.some(word => lowered.includes(word));
  return hasKeyword && !hasBlacklisted;
}

function getThreadId(message) {
  return (
    message.forumTopicId ??
    message.replyTo?.forumTopicId ??
    message.replyToMsgId ??
    message.replyToTopMsgId ??
    message.threadId ??
    null
  );
}

(async () => {
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text('📱 Введите номер телефона: '),
    password: async () => await input.text('🔐 Пароль (если включено 2FA): '),
    phoneCode: async () => await input.text('💬 Введите код из Telegram: '),
    onError: (err) => console.error(err),
  });


  console.log('✅ Telegram клиент запущен!');
  console.log('🧾 Ваша сессия:', client.session.save());

  fs.writeFileSync(sessionFilePath, client.session.save());


  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || !message.message) return;

    const chat = await message.getChat();
    const chatId = chat.id.toString();


    // не отслеживаем этот чат
    if (!monitoredSources.hasOwnProperty(chatId)) return;

    const allowedThreads = monitoredSources[chatId];
    const threadId = getThreadId(message);


    if (Array.isArray(allowedThreads) && allowedThreads.length > 0) {
      if (!threadId || !allowedThreads.includes(threadId)) return;
    }

    const text = message.message;
    if (!text) return;

    if (messageMatches(text)) {
      try {
        await client.forwardMessages(targetChatId, {
          messages: [message.id],
          fromPeer: chat,
        });
        console.log(`📤 Переслано сообщение из ${chatId}${threadId ? `, thread ${threadId}` : ''}`);
      } catch (error) {
        console.error('❌ Ошибка пересылки:', error);
      }
    }
  }, new NewMessage({}));

})();
