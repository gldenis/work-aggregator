import { TelegramClient } from '@mtcute/node'
import { Dispatcher } from '@mtcute/dispatcher'
import path from 'node:path';
import { fileURLToPath } from 'url';
import * as fs from 'node:fs'

// Чаты и, при необходимости, их топики
// если для чата массив пустой или отсутствует — разрешены все сообщения
const monitoredSources = {
  '-1002863458813': [2], // только топики
  '-1001779588634': [45042], // только топики
  '-1001616204072': undefined, // 𝘽𝙚𝙧𝙡𝙞𝙣 𝙥𝙖𝙧𝙖𝙙𝙞𝙨𝙚🎼ЧАТ БЕРЛИН
  '-1002137211488': undefined, // Svoi.Berlin
  '-1001589772550': undefined, // Berlin helps Ukrainians
  '-1001641170995': [56554, 56735,56738, 56557], // Доска объявлений Германии/Alles
  '-1001221376441': undefined, // Германия Берлин Чат
  '-1002360167407': undefined, // УКРАИНЦЫ В БЕРЛИНЕ | ЧАТ🇩🇪
  '-1001752185026': undefined, // Берлин новости объявления Германия
  '-1001394981443': undefined, // Берлин чатик 🇩🇪 | CHATIK
  // '-1002633667190': [],         // весь чат, все топики
  '-1003426768600': undefined,  // Українці в Берліні | Raven
  // '-1001613340921': undefined,  // Українці у Берліні / Украинцы в Берлине / Бер
  '-1002633667190': undefined,  // test (без топиков или любые)
  // '-1001819751519': undefined,  // весь чат (без топиков или любые)
  // '-1001262407168': undefined,  // весь чат (без топиков или любые)
};

const targetChatId = -1002694799076; // чат для пересылки

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    message.replyToMessage?.threadId ??
    null
  );
}

const tg = new TelegramClient({
  apiId: 22009789,
  apiHash: "320581df07b95ea18333cd10f41b92cd",
  reconnectRetries: 5,
})
const dp = Dispatcher.for(tg)

let counter = 0;

dp.onNewMessage(async (msg) => {
  const message = msg.text;
  if (!msg || !message) return;

  const chatId = msg?.chat.id

  // не отслеживаем этот чат
  if (!monitoredSources.hasOwnProperty(chatId)) return;

  const allowedThreads = monitoredSources[chatId];
  const threadId = getThreadId(msg);


  if (Array.isArray(allowedThreads) && allowedThreads.length > 0) {
    if (!threadId || !allowedThreads.includes(threadId)) return;
  }

  const text = msg.text;
  if (!text) return;

  // await msg.forwardTo({ toChatId: targetChatId})

  if (messageMatches(text)) {
    try {
      await msg.forwardTo({ toChatId: targetChatId})
      console.log(`📤 Переслано сообщение из ${chatId}${threadId ? `, thread ${threadId}` : ''}`);
    } catch (error) {
      console.error('❌ Ошибка пересылки:', error);
    }
  }
})

const self = await tg.start({
  phone: async () => "+491719242469",
  code: async () => {
    process.stdout.write('Code: ');
    return await new Promise(r =>
      process.stdin.once('data', d => r(d.toString().trim()))
    );
  },
  onError: (err) => console.error(err),
})
console.log(`✨ logged in as ${self.displayName}`)
