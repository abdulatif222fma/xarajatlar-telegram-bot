# Xarajatlar Telegram boti — Netlify’da bepul ishga tushirish

Bu loyiha Node.js + Netlify Functions + Netlify Blobs orqali ishlaydi. Telegram webhook ishlatiladi; kompyuteringiz doim yoqilib turishi shart emas. Bepul tariflar va limitlar xizmat provayderi tomonidan o‘zgartirilishi mumkin.

## Imkoniyatlar
- Xarajat qo‘shish: `25000 ovqat`
- Bugungi, joriy oydagi, oxirgi 7 kunlik hisobot
- Istalgan sana bo‘yicha hisobot: `YYYY-MM-DD`
- Har bir foydalanuvchining xarajatlari alohida
- Faqat ADMIN_ID egasi reklama matni yoki rasm yubora oladi
- Admin panelida foydalanuvchilar soni

## 1. Telegram bot ochish
1. Telegram’da `@BotFather` ni oching.
2. `/newbot` yuboring va bot nomi hamda username tanlang.
3. Berilgan tokenni maxfiy saqlang. Uni hech kimga yubormang.

## 2. Admin Telegram ID sini topish
Telegram’da `@userinfobot` kabi ID ko‘rsatuvchi botdan o‘z Telegram ID raqamingizni ko‘ring. ID ni `ADMIN_ID` sifatida kiriting.

## 3. GitHub’ga joylash
1. ZIP faylni oching.
2. Ichidagi fayllarni yangi GitHub repository’ga yuklang.
3. Tokenni kodga yozmang va GitHub’ga yubormang.

## 4. Netlify’ga deploy qilish
1. Netlify’da **Add new site → Import an existing project** ni tanlang.
2. GitHub repository’ni ulang.
3. Build command: `npm install`
4. Publish directory: `public`
5. Deploy qiling.

Agar Netlify build sozlamasi dependency o‘rnatishni o‘zi bajarsa, Build command bo‘sh qolishi ham mumkin. `netlify.toml` Functions papkasini belgilab beradi.

## 5. Environment variables qo‘shish
Netlify site → **Site configuration / Environment variables** bo‘limiga quyidagilarni qo‘shing:
- `BOT_TOKEN` = BotFather bergan token
- `ADMIN_ID` = sizning raqamli Telegram ID’ingiz

Keyin qayta deploy qiling.

## 6. Webhook o‘rnatish
Deploy tugagach, saytingiz manzilidan quyidagi manzilni brauzerda oching:

`https://SIZNING-SAYTINGIZ.netlify.app/.netlify/functions/set-webhook`

`SIZNING-SAYTINGIZ` o‘rniga haqiqiy Netlify domeningizni yozing. Natijada Telegram `ok: true` qaytarsa, webhook o‘rnatilgan bo‘ladi. Bu manzilni ommaga ulashmang.

## 7. Sinash
Telegram’da botingizni oching:
- `/start`
- `25000 ovqat`
- `📅 Bugungi xarajatlar`
- `🗓 Oylik hisobot`

Admin reklama yuborish:
1. Admin hisobidan `/reklama` yuboring.
2. Keyingi xabarda reklama matni yoki rasm yuboring.
3. Bot barcha ro‘yxatga olingan foydalanuvchilarga yuborishga urinadi. Botni bloklagan foydalanuvchilarga yuborish muvaffaqiyatsiz bo‘lishi mumkin.

## Muhim eslatmalar
- Botga foydalanuvchi kamida bir marta `/start` yuborishi kerak, shundagina u reklama ro‘yxatiga qo‘shiladi.
- Telegram foydalanuvchi botni bloklagan bo‘lsa, reklama yuborilmaydi.
- Netlify Blobs ma’lumotlarni serverless muhitida saqlash uchun ishlatiladi. Local testda Blobs sozlamasi farq qilishi mumkin; deploy qilingan Netlify muhitida tekshiring.
- Telegram broadcast uchun tezlik cheklovlari bor. Juda katta auditoriyada yuborish sekinlashishi mumkin.
- Bot xarajat summalarini foydalanuvchi xabaridan oladi. Hozircha avtomatik AI talqini emas, aniq `summa izoh` formatidan foydalanadi.
- Bu starter loyiha: ommaviy ishga tushirishdan oldin Netlify logs, webhook javobi va Blobs ishlashini tekshiring.
