export default async (request) => {
  const token = process.env.BOT_TOKEN;
  const siteUrl = process.env.URL;
  if (!token || !siteUrl) {
    return new Response("BOT_TOKEN yoki Netlify URL topilmadi. Netlify environment variables ni tekshiring.", { status: 500 });
  }
  const webhookUrl = `${siteUrl}/.netlify/functions/bot`;
  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: webhookUrl })
  });
  const result = await response.json();
  return new Response(JSON.stringify({ webhookUrl, telegram: result }, null, 2), {
    status: result.ok ? 200 : 500,
    headers: { "content-type": "application/json" }
  });
};
