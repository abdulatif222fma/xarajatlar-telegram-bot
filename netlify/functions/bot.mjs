import { getStore } from "@netlify/blobs";

const expensesStore = getStore("xarajatlar");
const usersStore = getStore("bot-users");
const adminStore = getStore("admin-state");

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = String(process.env.ADMIN_ID || "");

const api = (method) => `https://api.telegram.org/bot${TOKEN}/${method}`;

async function telegram(method, payload) {
  const response = await fetch(api(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!data.ok) console.error("Telegram API error:", method, data.description);
  return data;
}

function uzDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}
function uzMonth(date = new Date()) { return uzDate(date).slice(0, 7); }
function money(n) { return new Intl.NumberFormat("uz-UZ").format(n) + " so'm"; }

async function send(chatId, text, keyboard = mainKeyboard(), extra = {}) {
  return telegram("sendMessage", {
    chat_id: chatId, text, parse_mode: "HTML", reply_markup: keyboard, ...extra
  });
}
function mainKeyboard(isAdmin = false) {
  const rows = [
    [{ text: "➕ Xarajat qo‘shish" }, { text: "📅 Bugungi xarajatlar" }],
    [{ text: "🗓 Oylik hisobot" }, { text: "🔎 Sana bo‘yicha" }],
    [{ text: "📊 Oxirgi 7 kun" }, { text: "❓ Yordam" }]
  ];
  if (isAdmin) rows.push([{ text: "🛠 Admin panel" }]);
  return { keyboard: rows, resize_keyboard: true };
}
function dateKeyboard() {
  return { keyboard: [[{ text: "Bugun" }, { text: "Kecha" }], [{ text: "Bekor qilish" }], [{ text: "🏠 Menyu" }]], resize_keyboard: true };
}
async function getExpenses(userId) {
  return (await expensesStore.get(String(userId), { type: "json" })) || [];
}
async function saveExpenses(userId, items) {
  await expensesStore.setJSON(String(userId), items);
}
async function registerUser(user) {
  const key = "all";
  const list = (await usersStore.get(key, { type: "json" })) || [];
  if (!list.some(x => String(x.id) === String(user.id))) {
    list.push({ id: user.id, first_name: user.first_name || "", username: user.username || "" });
    await usersStore.setJSON(key, list);
  }
}
function isAdmin(userId) { return String(userId) === ADMIN_ID && ADMIN_ID !== ""; }

async function showReport(chatId, userId, title, predicate) {
  const all = await getExpenses(userId);
  const filtered = all.filter(predicate).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const total = filtered.reduce((sum, item) => sum + item.amount, 0);
  if (!filtered.length) return send(chatId, `📊 <b>${title}</b>\n\nBu davr uchun xarajat topilmadi.`);
  const lines = filtered.slice(0, 50).map((x, i) =>
    `${i + 1}. ${money(x.amount)} — ${escapeHtml(x.note)}\n   <i>${x.date}</i>`
  );
  const more = filtered.length > 50 ? `\n\n... va yana ${filtered.length - 50} ta xarajat` : "";
  return send(chatId, `📊 <b>${title}</b>\n\n${lines.join("\n\n")}${more}\n\n<b>Jami: ${money(total)}</b>\nXarajatlar soni: ${filtered.length}`);
}
function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function parseExpense(text) {
  const match = String(text).trim().match(/^(\d+(?:[.,]\d{1,2})?)\s+(.+)$/);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  const note = match[2].trim();
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000 || !note) return null;
  return { amount: Math.round(amount * 100) / 100, note };
}
function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z")); }

export default async (request) => {
  if (request.method !== "POST") return new Response("Telegram webhook is running.", { status: 200 });
  if (!TOKEN || !ADMIN_ID) return new Response("Missing BOT_TOKEN or ADMIN_ID", { status: 500 });

  let update;
  try { update = await request.json(); }
  catch { return new Response("Bad JSON", { status: 400 }); }

  try {
    const message = update.message;
    if (!message || !message.chat || !message.from) return new Response("ok");
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = (message.text || "").trim();
    const isAdminUser = isAdmin(userId);

    await registerUser(message.from);

    // Admin broadcast flow: /reklama, then send the text or photo/caption.
    const adminState = await adminStore.get(String(userId), { type: "json" });
    if (isAdminUser && adminState?.mode === "broadcast" && !text.startsWith("/reklama")) {
      if (text === "Bekor qilish" || text === "/cancel") {
        await adminStore.delete(String(userId));
        await send(chatId, "Reklama yuborish bekor qilindi.", mainKeyboard(true));
        return new Response("ok");
      }
      const users = (await usersStore.get("all", { type: "json" })) || [];
      let sent = 0, failed = 0;
      for (const user of users) {
        try {
          if (message.photo?.length) {
            const photo = message.photo[message.photo.length - 1].file_id;
            const result = await telegram("sendPhoto", {
              chat_id: user.id, photo,
              caption: message.caption || "",
              parse_mode: "HTML"
            });
            result.ok ? sent++ : failed++;
          } else if (text) {
            const result = await telegram("sendMessage", { chat_id: user.id, text: escapeHtml(text), parse_mode: "HTML" });
            result.ok ? sent++ : failed++;
          } else { failed++; }
        } catch { failed++; }
      }
      await adminStore.delete(String(userId));
      await send(chatId, `📣 Reklama yuborish yakunlandi.\n✅ Yuborildi: ${sent}\n⚠️ Yuborilmadi: ${failed}`, mainKeyboard(true));
      return new Response("ok");
    }

    if (text.startsWith("/start")) {
      return await send(chatId,
        `Assalomu alaykum, ${escapeHtml(message.from.first_name || "do‘st")}! 👋\n\nMen xarajatlaringizni hisoblab boraman.\n\nXarajat qo‘shish uchun masalan:\n<code>25000 ovqat</code>\n<code>12000 taksi</code>\n\nSummadan keyin xarajat izohini yozing.`,
        mainKeyboard(isAdminUser));
    }
    if (text === "/help" || text === "❓ Yordam") {
      return await send(chatId,
        `📌 <b>Foydalanish</b>\n\n• Xarajat: <code>25000 ovqat</code>\n• Bugungi hisobot: “📅 Bugungi xarajatlar”\n• Oylik hisobot: “🗓 Oylik hisobot”\n• Sana: “🔎 Sana bo‘yicha” va YYYY-MM-DD formatida sana kiriting\n• Oxirgi 7 kun: “📊 Oxirgi 7 kun”\n\nXarajatlarni faqat o‘zingiz ko‘rasiz.`,
        mainKeyboard(isAdminUser));
    }
    if (text === "🏠 Menyu") {
      return await send(chatId, "Asosiy menyu:", mainKeyboard(isAdminUser));
    }
    if (text === "➕ Xarajat qo‘shish") {
      return await send(chatId, "Xarajatni quyidagi ko‘rinishda yuboring:\n<code>25000 ovqat</code>\n\nAvval summa, keyin izoh yozing.");
    }
    if (text === "📅 Bugungi xarajatlar") {
      return await showReport(chatId, userId, "Bugungi xarajatlar", x => x.date === uzDate());
    }
    if (text === "🗓 Oylik hisobot") {
      const month = uzMonth();
      return await showReport(chatId, userId, `Oylik hisobot (${month})`, x => x.date.startsWith(month));
    }
    if (text === "📊 Oxirgi 7 kun") {
      const today = new Date(`${uzDate()}T12:00:00+05:00`);
      const start = new Date(today.getTime() - 6 * 86400000);
      const from = uzDate(start);
      return await showReport(chatId, userId, `Oxirgi 7 kun (${from} — ${uzDate()})`, x => x.date >= from && x.date <= uzDate());
    }
    if (text === "🔎 Sana bo‘yicha") {
      await adminStore.setJSON(String(userId), { mode: "date" });
      return await send(chatId, "Kerakli sanani YYYY-MM-DD formatida yuboring.\nMasalan: <code>2026-10-05</code>", dateKeyboard());
    }
    if (text === "Bekor qilish") {
      await adminStore.delete(String(userId));
      return await send(chatId, "Bekor qilindi.", mainKeyboard(isAdminUser));
    }
    if (adminState?.mode === "date") {
      if (!validDate(text)) return await send(chatId, "Sana noto‘g‘ri. YYYY-MM-DD formatida yuboring.\nMasalan: <code>2026-10-05</code>", dateKeyboard());
      await adminStore.delete(String(userId));
      return await showReport(chatId, userId, `${text} kungi xarajatlar`, x => x.date === text);
    }
    if (isAdminUser && (text === "🛠 Admin panel" || text === "/admin")) {
      return await send(chatId,
        `🛠 <b>Admin panel</b>\n\nFoydalanuvchilar: ${((await usersStore.get("all", { type: "json" })) || []).length}\n\nReklama yuborish uchun /reklama buyrug‘ini yuboring.\nBekor qilish: “Bekor qilish”.`,
        mainKeyboard(true));
    }
    if (isAdminUser && text === "/reklama") {
      await adminStore.setJSON(String(userId), { mode: "broadcast" });
      return await send(chatId, "📣 Endi barcha foydalanuvchilarga yuboriladigan matn yoki rasmni yuboring.\nBekor qilish uchun “Bekor qilish” deb yozing.", mainKeyboard(true));
    }

    const parsed = parseExpense(text);
    if (parsed) {
      const list = await getExpenses(userId);
      const now = new Date();
      list.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amount: parsed.amount,
        note: parsed.note,
        date: uzDate(now),
        createdAt: now.toISOString()
      });
      await saveExpenses(userId, list);
      return await send(chatId,
        `✅ <b>Xarajat saqlandi!</b>\n\n💸 Summa: ${money(parsed.amount)}\n📝 Izoh: ${escapeHtml(parsed.note)}\n📅 Sana: ${uzDate(now)}\n\nYana xarajat kiritishingiz mumkin.`,
        mainKeyboard(isAdminUser));
    }

    if (text.startsWith("/")) {
      return await send(chatId, "Bu buyruqni tushunmadim. /help buyrug‘ini yuboring.", mainKeyboard(isAdminUser));
    }
    return await send(chatId, "Xabarni tushunmadim.\nXarajat kiritish namunasi: <code>25000 ovqat</code>\nYordam: /help", mainKeyboard(isAdminUser));
  } catch (error) {
    console.error("Bot handler error:", error);
    return new Response("Handled with internal error", { status: 200 });
  }
};
