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
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const webhookSecret = env => hmac(env.WAYL_API_KEY, 'bazz-webhook');
const bookOf = ref => { const m = /^bz-([a-z]+)-/.exec(ref || ''); return m && BOOKS[m[1]] ? m[1] : null; };

async function wayl(env, path, init = {}) {
  const r = await fetch(WAYL + path, { ...init, headers: { 'X-WAYL-AUTHENTICATION': env.WAYL_API_KEY, 'content-type': 'application/json', ...(init.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}
const isPaid = d => !!d && (/^(complete|completed|paid|success|succeeded)$/i.test(d.status || '') || !!d.completedAt);

// POST /api/buy  {book, agree:true}  -> {url}
async function buy(request, env) {
  if (!env.WAYL_API_KEY) return json({ error: 'Checkout is not set up yet.' }, 503);
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

const page = (title, body) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | BAZZ</title><link rel="icon" href="/assets/app-192.png"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0C0E1A;color:#F3EFE6;font:17px/1.6 system-ui,sans-serif;padding:24px;box-sizing:border-box}main{max-width:520px;text-align:center}h1{font-family:Georgia,serif;font-weight:400;font-size:34px;margin:0 0 12px}h1 i{color:#D9BE85}.btn{display:inline-block;margin:18px 0;padding:15px 28px;border-radius:999px;background:#FF6B5B;color:#0C0E1A;font-weight:700;text-decoration:none}p{color:#C9C5D6}a{color:#D9BE85}</style></head><body><main>${body}</main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

// GET /thanks?referenceId=...  (Wayl sends the buyer here after paying)
async function thanks(url, env) {
  const ref = url.searchParams.get('referenceId') || '';
  const slug = bookOf(ref);
  if (!slug || !env.WAYL_API_KEY) return page('Order', `<h1>We couldn't find <i>your order</i></h1><p>If you paid, email <a href="mailto:info@bazzbooks.store">info@bazzbooks.store</a> and we'll send your book right away.</p>`);
  const r = await wayl(env, '/links/' + encodeURIComponent(ref));
  if (!isPaid(r.body && r.body.data)) { log('thanks_unpaid', { ref, status: r.body && r.body.data && r.body.data.status }); return page('Waiting', `<h1>Waiting for <i>your payment</i></h1><p>We haven't seen your payment yet. If you just paid, wait a few seconds and <a href="">refresh this page</a>.</p><p>Need help? <a href="mailto:info@bazzbooks.store">info@bazzbooks.store</a></p>`); }
  const dl = `/dl/${encodeURIComponent(ref)}/${await hmac(env.WAYL_API_KEY, 'dl:' + ref)}`;
  log('thanks_paid', { ref, book: slug });
  return page('Thank you', `<h1>Thank you. <i>Your book is ready.</i></h1><p>${esc(BOOKS[slug].title)}, PDF</p><a class="btn" href="${dl}" onclick="setTimeout(function(){location.href='/'},4000)">Download your PDF</a><p>Your download link works for 2 hours.<br>Questions? <a href="mailto:info@bazzbooks.store">info@bazzbooks.store</a></p>`);
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
  return new Response(obj.body, { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="${BOOKS[slug].file}"`, 'cache-control': 'private, no-store' } });
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
    } catch (e) {
      log('error', { path: p, msg: String(e && e.message || e) });
      return new Response('Something went wrong. Email info@bazzbooks.store and we will help.', { status: 500 });
    }
    return env.ASSETS.fetch(request);
  },
};
