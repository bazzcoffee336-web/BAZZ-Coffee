// BAZZ worker: redirects old addresses, runs the Wayl checkout, serves paid PDF downloads.
// No database: Wayl keeps each order (and the buyer's consent, in customParameter),
// and every step is written to Workers Logs as proof of delivery.
const HOME = 'bazzbooks.store';
const SITE = 'https://' + HOME;
const WAYL = 'https://api.thewayl.com/api/v1';
const PRICE_IQD = 131000; // about $99.99 (Wayl takes IQD only)

// page slug -> PDF file name in the private R2 bucket "bazz-books"
const BOOKS = {
  product: { title: 'AI for Beginners', file: 'AI-for-Beginners.pdf' },
  money: { title: 'Paycheck to Peace', file: 'Paycheck-to-Peace.pdf' },
  calm: { title: 'Quiet Mind, Deep Sleep', file: 'Quiet-Mind-Deep-Sleep.pdf' },
  career: { title: 'Hired in 30 Days', file: 'Hired-in-30-Days.pdf' },
  fitness: { title: 'The 20-Minute Home Workout', file: '20-Minute-Home-Workout.pdf' },
  hair: { title: 'The Hair Rescue', file: 'The-Hair-Rescue.pdf' },
  face: { title: 'The Skin Reset', file: 'The-Skin-Reset.pdf' },
};

// Workout videos (voiced, 3D) live on a media CDN; the QR codes and pages keep using bazzbooks.store links
const FITV = {
 "ch1": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/6fa5de03-c5fb-4a0f-9645-a303e92d070c.mp4",
 "ch2": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/9626db51-fda4-46ee-935e-4baa5b613631.mp4",
 "ch3": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/64114c0c-77fd-4f21-8dd3-5d424d50c03d.mp4",
 "ch4": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/ca6b906f-52fd-45ad-88c0-3bdce50ecce7.mp4",
 "ch5": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/e6cd9ab1-aea1-495e-b7e9-5f319fdfd5e1.mp4",
 "ch6": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/c7b70d0a-26a8-4837-b04c-91e75d0bf194.mp4",
 "ch7": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/80e839ea-04fb-4a12-abb1-e1ca9a3a0ec4.mp4",
 "ch8": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/3914d3eb-94bc-4554-9b98-2279c4259e98.mp4",
 "ch9": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/8febf4bd-cfa2-4213-bdf8-288855cc0115.mp4",
 "howto-squat": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/c144aab9-0e0e-4bf8-bb44-0b7b9b3c354d.mp4",
 "howto-pushup": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/c244fade-0159-4ff9-86d3-058a8a380a04.mp4",
 "howto-bridge": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/c4006b29-a378-45c2-b3f1-5dd71a1ba805.mp4",
 "howto-row": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/1dd67aa7-713c-4f95-a498-a7d52fac55cf.mp4",
 "howto-lunge": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/863bc9b2-da01-4def-ad0d-ab61371f2305.mp4",
 "howto-plank": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/00efee3d-7b09-495e-9c0e-cd8332ca3fcc.mp4"
};
// Voiced book chapter videos (free Kokoro voice), hosted on the media CDN.
const BKV = {
 "protect-your-face/ch1": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/5ad32b46-6b1e-4447-ad3a-abc77de643ed.mp4",
 "protect-your-face/ch2": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/3a967b5a-e903-4510-ae9a-89e8a9547df3.mp4",
 "protect-your-face/ch3": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/621b179c-f429-4dce-a7fe-5bdee4e981f3.mp4",
 "protect-your-face/ch4": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/6a4c396e-ab85-45ee-b70b-2c43a00e1329.mp4",
 "protect-your-face/ch5": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/f97981fe-0763-4a6d-87d9-7ce4b169146b.mp4",
 "protect-your-face/ch6": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/1636bcbe-ab51-4869-a40c-6917139c46a3.mp4",
 "protect-your-face/ch7": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/725daf37-25f9-423f-a45b-2661797b8565.mp4",
 "protect-your-face/ch8": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/8206761c-525d-4fdc-bb83-65ed42391176.mp4",
 "protect-your-face/ch9": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/ec165b46-31e5-48f5-845b-016714aab7a1.mp4",
 "protect-your-hair/ch1": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/20d4f489-d0c1-4059-9973-1438e3a3a07e.mp4",
 "protect-your-hair/ch2": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/d5119e33-aaca-456e-89fd-7ccfc0da3037.mp4",
 "protect-your-hair/ch3": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/96f2aa6d-989e-477a-a653-1a2cb9a7091e.mp4",
 "protect-your-hair/ch4": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/05538b6e-4b8f-4716-adfe-a40e97ca78a7.mp4",
 "protect-your-hair/ch5": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/a639e5f8-9e5e-4f49-8cda-c89ff4fb5697.mp4",
 "protect-your-hair/ch6": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/f5e7c923-a1e4-4589-9c09-c9fde20a2980.mp4",
 "protect-your-hair/ch7": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/54b825a3-d2ab-45e4-8745-e23fb3ba2cbe.mp4",
 "protect-your-hair/ch8": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/3aaa45dd-f74c-4465-aca6-fa93ddc518bd.mp4",
 "protect-your-hair/ch9": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/2b871c07-fe12-447a-a2be-9369fcd0ef4b.mp4",
 "quiet-mind-deep-sleep/ch1": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/66ab9740-5aa8-4474-820e-472eb2037e7c.mp4",
 "quiet-mind-deep-sleep/ch2": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/107ad0fb-181c-48c5-9704-2f46bb4911f4.mp4",
 "quiet-mind-deep-sleep/ch3": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/0548858a-aeb9-4adb-9442-a62a631be444.mp4",
 "quiet-mind-deep-sleep/ch4": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/02b58e9d-e2ac-42a6-bc61-97c1c7824fda.mp4",
 "quiet-mind-deep-sleep/ch5": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/7d865539-c571-4c69-8a20-544b10e0a7d3.mp4",
 "quiet-mind-deep-sleep/ch6": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/4e4a59ee-2a82-4c61-a228-b0439b160e72.mp4",
 "quiet-mind-deep-sleep/ch7": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/8c0a186b-e4cb-4e9c-adf5-c026d70d25b4.mp4",
 "quiet-mind-deep-sleep/ch8": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/0e4f356b-c706-4e01-b57f-b94969b3f5d1.mp4",
 "quiet-mind-deep-sleep/ch9": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/072b3e36-c212-43ab-a7be-acd4ab803256.mp4",
 "ai-for-beginners/ch1": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/517363f1-05bf-47aa-8b34-113b9d5551f2.mp4",
 "ai-for-beginners/ch2": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/5d64540d-dbcc-40db-b40e-65dc0bc0292e.mp4",
 "ai-for-beginners/ch3": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/c83bf2f6-5999-464f-a349-2f555e0c29c8.mp4",
 "ai-for-beginners/ch4": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/3b0ef2c9-b3d5-4b18-bc61-4de81813120b.mp4",
 "ai-for-beginners/ch5": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/29b3a3a8-2f1e-4215-9510-7db4ef49bcfc.mp4",
 "ai-for-beginners/ch6": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/3839cea4-3faa-4dfc-83aa-d1574fea578c.mp4",
 "ai-for-beginners/ch7": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/bd12da44-e8f2-462d-969a-49d1178a24c8.mp4",
 "ai-for-beginners/ch8": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/d1dce23e-4af0-4ef2-84c2-dcd6ef538e5a.mp4",
 "ai-for-beginners/ch9": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/485b7b9b-48f2-4c75-a6c3-a7aca896da27.mp4",
 "hired-in-30-days/ch1": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/946c1e99-bca2-4893-b04b-102ab8e718f0.mp4",
 "hired-in-30-days/ch2": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/70293ac5-6e22-4d35-af12-f1ec8eb6dc99.mp4",
 "hired-in-30-days/ch3": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/47ec1cb9-8b51-4177-942a-61c1cc180479.mp4",
 "hired-in-30-days/ch4": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/5ea615d0-fc17-4621-acfe-444cdfa4f04b.mp4",
 "hired-in-30-days/ch5": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/8ff8ed08-9a52-4f97-97ce-1a0a2268cd1c.mp4",
 "hired-in-30-days/ch6": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/61a0e49a-83de-4225-9e1e-21f8b31a4f14.mp4",
 "hired-in-30-days/ch7": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/b27d357c-9051-416b-a2d1-1ac9a04f0a07.mp4",
 "hired-in-30-days/ch8": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/58fc87bb-2577-46a9-a6cb-3bee7945cab9.mp4",
 "hired-in-30-days/ch9": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/726e59d8-f986-4883-b452-e98f5665ea3e.mp4",
 "paycheck-to-peace/ch1": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/f6cbe505-64aa-438f-9fd4-dfa2dc7bad05.mp4",
 "paycheck-to-peace/ch2": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/52eb0bd6-c068-4192-b7b6-fe08e53d364b.mp4",
 "paycheck-to-peace/ch3": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/5753bcdb-76fe-45f7-a57b-873a609c1896.mp4",
 "paycheck-to-peace/ch4": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/d35324ce-9632-4350-9071-6f51b5321ac6.mp4",
 "paycheck-to-peace/ch5": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/89c705da-c4a3-4fe7-81a0-80e1b6314e7c.mp4",
 "paycheck-to-peace/ch6": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/c7af7416-54dd-4822-8843-ff646ffb3ad8.mp4",
 "paycheck-to-peace/ch7": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/3d08472d-ad21-48d7-95fa-1314f1bfdde0.mp4",
 "paycheck-to-peace/ch8": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/b1f8c032-1ae8-4a46-9c69-f816724c125b.mp4",
 "paycheck-to-peace/ch9": "https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/d54b743c-020d-4c84-8139-e2dd3e5f9e15.mp4"
};
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const log = (event, data) => console.log(JSON.stringify({ event, at: new Date().toISOString(), ...data }));
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const webhookSecret = env => hmac(env.WAYL_API_KEY, 'bazz-webhook');
const bookOf = ref => { const m = /^bz-([a-z]+)-/.exec(ref || ''); return m && BOOKS[m[1]] ? m[1] : null; };

async function wayl(env, path, init = {}) {
  const r = await fetch(WAYL + path, { ...init, headers: { 'X-WAYL-AUTHENTICATION': env.WAYL_API_KEY, 'content-type': 'application/json', ...(init.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}
// refunded, reversed, cancelled or charged-back orders never count as paid
const isPaid = d => !!d && !/refund|revers|cancel|charge|fail|void/i.test(d.status || '') && (/^(complete|completed|paid|success|succeeded)$/i.test(d.status || '') || !!d.completedAt);
// security headers for pages the worker builds itself (the static site gets them from _headers)
const SEC = { 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'strict-transport-security': 'max-age=31536000; includeSubDomains' };

// POST /api/buy  {book, agree:true}  -> {url}
async function buy(request, env) {
  if (!env.WAYL_API_KEY) return json({ error: 'Checkout is not set up yet.' }, 503);
  // stop bots: at most 10 checkout tries a minute per visitor (free Workers rate limiter)
  if (env.BUY_LIMIT) {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const { success } = await env.BUY_LIMIT.limit({ key: ip });
    if (!success) { log('buy_rate_limited', {}); return json({ error: 'Too many tries. Please wait a minute and try again.' }, 429); }
  }
  let input; try { input = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const slug = input && input.book;
  if (!BOOKS[slug]) return json({ error: 'Unknown book.' }, 400);
  if (input.agree !== true) return json({ error: 'Please tick the box first.' }, 400);
  const ref = `bz-${slug}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const consentAt = new Date().toISOString();
  const mode = env.WAYL_ENV === 'live' ? 'live' : 'test';
  const r = await wayl(env, '/links', {
    method: 'POST',
    body: JSON.stringify({
      env: mode, referenceId: ref, total: PRICE_IQD, currency: 'IQD',
      customParameter: `consent:${consentAt}`,
      lineItem: [{ label: BOOKS[slug].title + ' (PDF ebook)', amount: PRICE_IQD, type: 'increase' }],
      webhookUrl: SITE + '/api/wayl-webhook', webhookSecret: await webhookSecret(env),
      redirectionUrl: SITE + '/thanks', linkExpiresIn: '1h',
    }),
  });
  const url = r.body && r.body.data && r.body.data.url;
  if (!r.ok || !url) { log('link_failed', { ref, status: r.status, msg: r.body && r.body.message }); return json({ error: 'Payment page could not open. Please try again.' }, 502); }
  log('checkout', { ref, book: slug, mode, consentAt, ip_country: request.cf && request.cf.country });
  return json({ url });
}

// POST /api/wayl-webhook  (Wayl calls this when a payment changes)
async function webhook(request, env) {
  const raw = await request.text();
  const sig = (request.headers.get('x-wayl-signature-256') || '').replace(/^sha256=/, '');
  if (!env.WAYL_API_KEY || !same(sig, await hmac(await webhookSecret(env), raw))) { log('webhook_bad_signature', {}); return new Response('bad signature', { status: 401 }); }
  let d = {}; try { d = JSON.parse(raw); } catch {}
  log('webhook', { ref: d.referenceId, status: d.status, orderId: d.id || d.orderId, total: d.total });
  return new Response('ok');
}

const page = (title, body) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | BAZZ</title><link rel="icon" href="/assets/app-192.png"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0C0E1A;color:#F3EFE6;font:17px/1.6 system-ui,sans-serif;padding:24px;box-sizing:border-box}main{max-width:520px;text-align:center}h1{font-family:Georgia,serif;font-weight:400;font-size:34px;margin:0 0 12px}h1 i{color:#D9BE85}.btn{display:inline-block;margin:18px 0;padding:15px 28px;border-radius:999px;background:#FF6B5B;color:#0C0E1A;font-weight:700;text-decoration:none}p{color:#C9C5D6}a{color:#D9BE85}</style></head><body><main>${body}</main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...SEC } });

// GET /thanks?referenceId=...  (Wayl sends the buyer here after paying)
async function thanks(url, env) {
  const ref = url.searchParams.get('referenceId') || '';
  const slug = bookOf(ref);
  if (!slug || !env.WAYL_API_KEY) return page('Order', `<h1>We couldn't find <i>your order</i></h1><p>If you paid, email <a href="mailto:info@bazzbooks.store">info@bazzbooks.store</a> and we'll send your book right away.</p>`);
  const r = await wayl(env, '/links/' + encodeURIComponent(ref));
  if (!isPaid(r.body && r.body.data)) { log('thanks_unpaid', { ref, status: r.body && r.body.data && r.body.data.status }); return page('Waiting', `<h1>Waiting for <i>your payment</i></h1><p>We haven't seen your payment yet. If you just paid, wait a few seconds and <a href="">refresh this page</a>.</p><p>Need help? <a href="mailto:info@bazzbooks.store">info@bazzbooks.store</a></p>`); }
  const dl = `/dl/${encodeURIComponent(ref)}/${await hmac(env.WAYL_API_KEY, 'dl:' + ref)}`;
  log('thanks_paid', { ref, book: slug });
  const lp = LEARN[slug] ? `<p><a class="btn" style="background:#D9BE85" href="/learn/${encodeURIComponent(ref)}/${await hmac(env.WAYL_API_KEY, 'learn:' + ref)}">Open your videos and tracker</a><br><small>Bookmark it: this is your personal page to come back to.</small></p>` : '';
  return page('Thank you', `<h1>Thank you. <i>Your book is ready.</i></h1><p>${esc(BOOKS[slug].title)}, PDF</p>${lp}<a class="btn" href="${dl}" onclick="setTimeout(function(){location.href='/'},4000)">Download your PDF</a><p>Read it for a few days, then <a href="/review/${encodeURIComponent(ref)}/${await hmac(env.WAYL_API_KEY, 'review:' + ref)}">leave a quick review</a>. It really helps.<br><small>Bookmark this page to come back to it.</small></p><p>Questions? <a href="mailto:info@bazzbooks.store">info@bazzbooks.store</a><br>Follow <a href="https://www.instagram.com/bazzbooks0/" target="_blank" rel="noopener">@bazzbooks0</a> for a free tip every day.</p>`);
}


// ---- Reviews: only verified buyers can write one (signed link from the thanks page).
// New reviews wait in R2 "reviews/pending/"; the owner approves them at /admin/reviews?key=ADMIN_KEY.
const RSEC = { ...SEC, 'content-security-policy': SEC['content-security-policy'].replace("form-action 'none'", "form-action 'self'") };
const rpage = (title, body) => { const r = page(title, body); for (const [k, v] of Object.entries(RSEC)) r.headers.set(k, v); return r; };
const RSTYLE = `<style>form{text-align:left;margin-top:18px}label{display:block;margin:14px 0 6px;color:#F3EFE6;font-weight:600}input[type=text],textarea{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid #3a3f5c;background:#141830;color:#F3EFE6;font:16px system-ui}textarea{min-height:130px}.st{display:flex;flex-direction:row-reverse;justify-content:flex-end;gap:6px}.st input{display:none}.st label{font-size:38px;margin:0;color:#3a3f5c;cursor:pointer}.st input:checked~label,.st label:hover,.st label:hover~label{color:#D9BE85}.ck{display:flex;gap:10px;align-items:flex-start;font-weight:400;color:#C9C5D6;font-size:15px}button{margin-top:18px;width:100%;padding:15px;border:0;border-radius:999px;background:#D9BE85;color:#0C0E1A;font:700 17px system-ui;cursor:pointer}</style>`;
async function review(request, url, env) {
  const [, , ref, sig] = url.pathname.split('/').map(decodeURIComponent);
  const slug = bookOf(ref);
  if (!slug || !env.WAYL_API_KEY || !env.BOOKS || !same(sig, await hmac(env.WAYL_API_KEY, 'review:' + ref))) return new Response('Not found', { status: 404 });
  const title = esc(BOOKS[slug].title);
  if (request.method === 'POST') {
    const f = await request.formData();
    const stars = Math.round(Number(f.get('stars')));
    const name = String(f.get('name') || '').trim().slice(0, 40);
    const country = String(f.get('country') || '').trim().slice(0, 40);
    const text = String(f.get('text') || '').trim().slice(0, 800);
    if (!(stars >= 1 && stars <= 5) || !name || text.length < 10 || f.get('ok') !== 'yes') return rpage('Review', `<h1>Almost there</h1><p>Please pick 1 to 5 stars, write your first name and at least a sentence, and tick the box.</p><p><a href="">Go back</a></p>`);
    await env.BOOKS.put('reviews/pending/' + ref + '.json', JSON.stringify({ ref, book: slug, stars, name, country, text, at: new Date().toISOString() }));
    log('review_new', { ref, book: slug, stars });
    return rpage('Thank you', `<h1>Thank you, <i>${esc(name)}</i></h1><p>Your review of ${title} will appear on the website after a quick check. We never change what you wrote.</p><p><a href="/">Back to BAZZ</a></p>`);
  }
  return rpage('Review', `${RSTYLE}<h1>How was <i>${title}</i>?</h1><p>Your honest review helps other readers decide. Good or bad, we show it as you wrote it.</p>
<form method="post"><label>Your rating</label><div class="st">${[5,4,3,2,1].map(n => `<input type="radio" name="stars" id="s${n}" value="${n}" required><label for="s${n}" title="${n} stars">★</label>`).join('')}</div>
<label for="n">First name</label><input type="text" id="n" name="name" maxlength="40" required autocomplete="given-name">
<label for="c">Country (optional)</label><input type="text" id="c" name="country" maxlength="40" autocomplete="country-name">
<label for="t">Your review</label><textarea id="t" name="text" maxlength="800" minlength="10" required placeholder="What did you try? What changed?"></textarea>
<label class="ck"><input type="checkbox" name="ok" value="yes" required> BAZZ may show my review with my first name and country on bazzbooks.store.</label>
<button type="submit">Send my review</button></form>`);
}
// GET /api/reviews?book=fitness -> approved reviews for that book (public, cached 5 min)
async function reviewsApi(url, env) {
  const slug = url.searchParams.get('book');
  if (!BOOKS[slug] || !env.BOOKS) return json({ reviews: [] });
  const cache = caches.default, key = new Request(SITE + '/api/reviews?book=' + slug);
  const hit = await cache.match(key); if (hit) return hit;
  const l = await env.BOOKS.list({ prefix: 'reviews/approved/' + slug + '/' });
  const out = [];
  for (const o of l.objects.slice(0, 50)) { const r = await env.BOOKS.get(o.key); if (r) { const d = await r.json(); out.push({ stars: d.stars, name: d.name, country: d.country, text: d.text, at: d.at.slice(0, 10) }); } }
  out.sort((a, b) => b.at.localeCompare(a.at));
  const res = new Response(JSON.stringify({ reviews: out }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' } });
  await cache.put(key, res.clone()); return res;
}
// GET/POST /admin/reviews?key=ADMIN_KEY : owner approves or deletes waiting reviews
async function admin(request, url, env) {
  if (!env.ADMIN_KEY || !same(url.searchParams.get('key') || '', env.ADMIN_KEY)) return new Response('Not found', { status: 404 });
  if (request.method === 'POST') {
    const f = await request.formData(); const ref = String(f.get('ref') || ''), act = f.get('act');
    const slug = bookOf(ref); const pk = 'reviews/pending/' + ref + '.json';
    const r = slug && await env.BOOKS.get(pk);
    if (r) { if (act === 'approve') await env.BOOKS.put(`reviews/approved/${slug}/${ref}.json`, await r.text()); await env.BOOKS.delete(pk); await caches.default.delete(new Request(SITE + '/api/reviews?book=' + slug)); log('review_' + act, { ref }); }
    return Response.redirect(url.toString(), 303);
  }
  const l = await env.BOOKS.list({ prefix: 'reviews/pending/' });
  const items = [];
  for (const o of l.objects) { const r = await env.BOOKS.get(o.key); if (r) items.push(await r.json()); }
  const k = esc(url.searchParams.get('key'));
  const rows = items.map(d => `<div style="text-align:left;background:#141830;border-radius:14px;padding:16px;margin:12px 0"><b>${'★'.repeat(d.stars)}${'☆'.repeat(5 - d.stars)}</b> · ${esc(BOOKS[d.book].title)}<br><b>${esc(d.name)}</b>${d.country ? ', ' + esc(d.country) : ''} · ${esc(d.at.slice(0, 10))}<p style="color:#F3EFE6">${esc(d.text)}</p><form method="post" action="?key=${k}" style="display:flex;gap:8px"><input type="hidden" name="ref" value="${esc(d.ref)}"><button name="act" value="approve" style="flex:1;padding:10px;border:0;border-radius:999px;background:#D9BE85;font-weight:700">Show on website</button><button name="act" value="delete" style="flex:1;padding:10px;border:0;border-radius:999px;background:#3a3f5c;color:#fff">Delete</button></form></div>`).join('');
  return rpage('Reviews', `<h1>Waiting <i>reviews</i></h1>${rows || '<p>No new reviews right now.</p>'}`);
}

// finds the PDF even if the upload renamed it a little ("The Hair Rescue.pdf", "books/the-hair-rescue (1).pdf")
const norm = s => s.toLowerCase().replace(/\.pdf$/, '').replace(/\(\d+\)/g, '').replace(/[^a-z0-9]/g, '');
async function findBook(env, file) {
  const exact = await env.BOOKS.get(file);
  if (exact) return exact;
  const want = norm(file);
  let cursor, keys = [];
  do { const l = await env.BOOKS.list({ cursor, limit: 1000 }); keys.push(...l.objects.map(o => o.key)); cursor = l.truncated ? l.cursor : null; } while (cursor);
  const hit = keys.find(k => /\.pdf$/i.test(k) && norm(k.split('/').pop()) === want) || keys.find(k => /\.pdf$/i.test(k) && norm(k).includes(want));
  if (!hit) { log('bucket_keys', { want: file, keys: keys.slice(0, 50) }); return null; }
  return env.BOOKS.get(hit);
}


// buyer page with how-to videos and a tracker (only books that have one)
const LEARN = {
  fitness: { moves: [['squat','Squat'],['pushup','Push-up'],['bridge','Glute bridge'],['row','Row'],['lunge','Lunge'],['plank','Plank']] },
};
async function learn(request, url, env) {
  const [, , ref, sig] = url.pathname.split('/').map(decodeURIComponent);
  const slug = bookOf(ref);
  if (!slug || !LEARN[slug] || !env.WAYL_API_KEY || !same(sig, await hmac(env.WAYL_API_KEY, 'learn:' + ref))) return new Response('Not found', { status: 404 });
  const r = await wayl(env, '/links/' + encodeURIComponent(ref));
  if (!isPaid(r.body && r.body.data)) return new Response('This order is not paid.', { status: 403 });
  log('learn_open', { ref, book: slug });
  const v = LEARN[slug].moves.map(([k, t]) => `<figure><video controls playsinline preload="none" poster="/assets/learn/${slug}/poster-${k}.jpg" src="/assets/learn/${slug}/howto-${k}.mp4"></video><figcaption>${t}</figcaption></figure>`).join('');
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const grid = [1,2,3,4,5,6].map(w => `<tr><th>Week ${w}</th>${days.map((d,i) => `<td><button data-k="w${w}d${i}" aria-label="Week ${w} ${d}"></button></td>`).join('')}</tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Your workout page | BAZZ</title><link rel="icon" href="/assets/app-192.png"><style>
body{margin:0;background:#0C0E1A;color:#F3EFE6;font:16px/1.6 system-ui,sans-serif}main{max-width:900px;margin:0 auto;padding:28px 18px 60px}
h1{font-family:Georgia,serif;font-weight:400;font-size:34px;margin:0 0 6px}h1 i,h2 i{color:#D9BE85}h2{font-family:Georgia,serif;font-weight:400;font-size:26px;margin:36px 0 12px}p{color:#C9C5D6}
.v{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}figure{margin:0;background:#141a33;border-radius:16px;overflow:hidden}video{width:100%;display:block;aspect-ratio:4/5;background:#141a33}figcaption{padding:10px 14px;font-weight:700}
table{width:100%;border-collapse:separate;border-spacing:6px}th{text-align:left;color:#D9BE85;font-size:13px;font-weight:700;white-space:nowrap}thead th{text-align:center}td button{width:100%;aspect-ratio:1;border-radius:10px;border:2px solid #3a4266;background:#141a33;cursor:pointer;font-size:18px;color:#0C0E1A}
td button.on{background:#FF6B5B;border-color:#FF6B5B}td button.on::after{content:"✓"}.stat{display:flex;gap:12px;flex-wrap:wrap}.stat div{flex:1;min-width:140px;background:#141a33;border-radius:14px;padding:14px}.stat b{display:block;font-family:Georgia,serif;font-size:30px;color:#D9BE85;font-weight:400}
.task{background:#141a33;border-left:4px solid #FF6B5B;border-radius:12px;padding:14px 16px}a{color:#D9BE85}</style></head><body><main>
<p style="margin:0;letter-spacing:.2em;font-size:12px;color:#D9BE85;font-weight:700">BAZZ · YOUR WORKOUT PAGE</p>
<h1>Welcome back. <i>Let's move.</i></h1><p>Bookmark this page. Come back after every workout and tick the day.</p>
<div class="stat"><div><b id="n">0</b>days ticked</div><div><b id="s">0</b>day streak</div><div><b id="wk">Week 1</b>you are here</div></div>
<h2>Today's <i>task</i></h2><div class="task" id="task"></div>
<h2>Watch the <i>6 moves</i></h2><div class="v">${v}</div>
<h2>Your 6-week <i>tracker</i></h2><p>Tap a day after you move: a workout or a 20-minute walk. Missed a day? Fine. Never miss twice.</p>
<table><thead><tr><th></th>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>${grid}</tbody></table>
<p style="margin-top:28px">Your ticks are saved on this device. Questions? <a href="mailto:info@bazzbooks.store">info@bazzbooks.store</a><br><small>General fitness education, not medical advice. Stop if you feel sharp pain.</small></p>
</main><script>
(function(){var K='bazz-fit-'+location.pathname.split('/')[2],st={};try{st=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
var T=['Do the 10-minute starting check from Chapter 2, then tick today.','Workout A: 2 rounds of squat, push-up, bridge. Slow and steady.','20-minute walk. Talk test: you can talk, but not sing.','Workout B: 2 rounds of row, lunge, plank.','Rest or a gentle walk. Missed yesterday? Do 10 minutes today.','Workout A again. Try one move at the harder level.','Look back at your week. Write one win that is not about the scale.'];
var bs=document.querySelectorAll('td button');function save(){try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}}
function draw(){var n=0,last=-1,streak=0,run=0;bs.forEach(function(b,i){var on=!!st[b.dataset.k];b.classList.toggle('on',on);if(on){n++;last=i;run++;streak=run}else{run=0}});
document.getElementById('n').textContent=n;document.getElementById('s').textContent=streak;var next=last+1;document.getElementById('wk').textContent='Week '+Math.min(6,Math.floor(next/7)+1);document.getElementById('task').textContent=T[next%7]}
bs.forEach(function(b){b.onclick=function(){st[b.dataset.k]=!st[b.dataset.k];save();draw()}});draw()})();
</script></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self'; media-src 'self' https://d2ol7oe51mr4n9.cloudfront.net; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } });
}

// GET /dl/<ref>/<signature>  -> the PDF, only for a paid order
async function download(request, url, env) {
  const [, , ref, sig] = url.pathname.split('/').map(decodeURIComponent);
  const slug = bookOf(ref);
  if (!slug || !env.WAYL_API_KEY || !env.BOOKS || !same(sig, await hmac(env.WAYL_API_KEY, 'dl:' + ref))) return new Response('Not found', { status: 404 });
  const r = await wayl(env, '/links/' + encodeURIComponent(ref));
  if (!isPaid(r.body && r.body.data)) { log('download_refused', { ref }); return new Response('This order is not paid.', { status: 403 }); }
  const paidAt = Date.parse((r.body.data.completedAt || r.body.data.updatedAt) || '');
  if (paidAt && Date.now() - paidAt > 2 * 3600 * 1000) { log('download_expired', { ref }); return page('Link expired', `<h1>This link has <i>expired</i></h1><p>If you bought this book, email <a href="mailto:info@bazzbooks.store">info@bazzbooks.store</a> with your order number and we'll help.</p>`); }
  const obj = await findBook(env, BOOKS[slug].file);
  if (!obj) { log('download_missing_file', { ref, file: BOOKS[slug].file }); return new Response('File missing. Email info@bazzbooks.store and we will send it.', { status: 500 }); }
  log('download', { ref, book: slug, ip_country: request.cf && request.cf.country, ua: (request.headers.get('user-agent') || '').slice(0, 120) });
  return new Response(obj.body, { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="${BOOKS[slug].file}"`, 'cache-control': 'private, no-store', ...SEC } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== HOME && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      url.protocol = 'https:'; url.hostname = HOME; url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    const p = url.pathname;
    try {
      if (p === '/api/buy' && request.method === 'POST') return await buy(request, env);
      if (p === '/api/wayl-webhook' && request.method === 'POST') return await webhook(request, env);
      if (p === '/thanks' || p === '/thanks/') return await thanks(url, env);
      if (p.startsWith('/dl/')) return await download(request, url, env);
      if (p.startsWith('/learn/')) return await learn(request, url, env);
      { const mv = /^\/assets\/learn\/fitness\/([a-z0-9-]+)\.mp4$/.exec(p); if (mv && FITV[mv[1]]) return Response.redirect(FITV[mv[1]], 302); }
      { const bv = /^\/assets\/learn\/([a-z0-9-]+\/ch[1-9])\.mp4$/.exec(p); if (bv && BKV[bv[1]]) return Response.redirect(BKV[bv[1]], 302); }
      { const im = { '/assets/eagle-bw.webp': 'e2587694-aa7b-460c-8418-158e0bb3955a', '/assets/eagle-bw-sm.webp': '4d5a5355-82f2-42cc-834d-13c63acaa550' }[p];
        if (im) { const r = await fetch(`https://d2ol7oe51mr4n9.cloudfront.net/user_3LjuXNf36dEL9stYcd9RGT1kiva/${im}.webp`, { cf: { cacheEverything: true, cacheTtl: 31536000 } });
          return new Response(r.body, { status: r.status, headers: { 'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } }); } }
      if (p.startsWith('/review/')) return await review(request, url, env);
      if (p === '/api/reviews') return await reviewsApi(url, env);
      if (p === '/admin/reviews') return await admin(request, url, env);
    } catch (e) {
      log('error', { path: p, msg: String(e && e.message || e) });
      return new Response('Something went wrong. Email info@bazzbooks.store and we will help.', { status: 500 });
    }
    return env.ASSETS.fetch(request);
  },
};
