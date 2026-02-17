import fs from "fs";
import crypto from "crypto";

const FILE_PATH = "./processed.json";
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 часа
const MAX_RECORDS = 5000;

let processed = new Map();
// структура: hash -> timestamp

// ---------- Загрузка ----------
if (fs.existsSync(FILE_PATH)) {
  try {
    const data = JSON.parse(fs.readFileSync(FILE_PATH));
    processed = new Map(data);
  } catch (e) {
    processed = new Map();
  }
}

// ---------- Нормализация ----------
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")  // убрать ссылки
    .replace(/@\w+/g, "")           // убрать username
    .replace(/[^\p{L}\p{N}\s]/gu, "") // убрать эмодзи и спецсимволы
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Хэш ----------
function getHash(text) {
  return crypto
    .createHash("md5")
    .update(text)
    .digest("hex");
}

// ---------- Очистка старых ----------
function cleanup() {
  const now = Date.now();

  for (const [hash, timestamp] of processed) {
    if (now - timestamp > MAX_AGE) {
      processed.delete(hash);
    }
  }

  // ограничение размера
  if (processed.size > MAX_RECORDS) {
    const entries = [...processed.entries()]
      .sort((a, b) => a[1] - b[1]) // по времени
      .slice(-MAX_RECORDS);

    processed = new Map(entries);
  }
}

// ---------- Сохранение ----------
function save() {
  fs.writeFileSync(FILE_PATH, JSON.stringify([...processed]));
}

// ---------- Главная функция ----------
export function isDuplicate(text) {
  if (!text) return true;

  cleanup();

  const normalized = normalizeText(text);
  const hash = getHash(normalized);

  if (processed.has(hash)) {
    return true; // дубль
  }

  processed.set(hash, Date.now());
  save();

  return false;
}
