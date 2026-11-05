// POST   /api/orders        public: place an order request (payment is checked by hand)
// GET    /api/orders        admin: all orders, newest first
// PATCH  /api/orders        admin: { id, status }
// DELETE /api/orders?id=..  admin
import { db, json, handle, requireAdmin, newId, bnDigits, str, HttpError } from "../_lib/shop.js";

const STATUSES = ["new", "paid", "done", "cancelled"];

export const onRequestPost = handle(async ({ request, env }) => {
  const DB = await db(env);
  const b = await request.json().catch(() => null);
  if (!b) throw new HttpError(400, "Bad request.");
  if (b.website) return json({ ok: true, id: "x" }); // bots fill the hidden field
  const phone = bnDigits(b.phone).replace(/[\s-]/g, "").replace(/^\+?88/, "");
  if (!/^01[3-9]\d{8}$/.test(phone)) throw new HttpError(400, "ফোন নম্বরটা ঠিক নেই (০১ দিয়ে শুরু, ১১ সংখ্যা)।");
  const name = str(b.name, 80);
  if (!name) throw new HttpError(400, "নাম লেখো।");
  const row = await DB.prepare("SELECT data FROM products WHERE id = ? AND active = 1").bind(str(b.productId, 40)).first();
  if (!row) throw new HttpError(404, "এই পণ্যটা এখন পাওয়া যাচ্ছে না।");
  const p = JSON.parse(row.data);
  const address = str(b.address, 400);
  if (p.needsAddress && address.length < 8) throw new HttpError(400, "ডেলিভারির ঠিকানা লেখো।");

  const ip = request.headers.get("cf-connecting-ip") || "";
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { n } = await DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE ip = ? AND created > ?").bind(ip, since).first();
  if (n >= 5) throw new HttpError(429, "অনেকগুলো অর্ডার হয়ে গেছে, একটু পরে আবার চেষ্টা করো।");

  const id = newId("o");
  const order = {
    id, productId: p.id, title: p.title, type: p.type, price: p.price,
    name, phone, address, email: str(b.email, 120), method: str(b.method, 20), trx: str(b.trx, 40), note: str(b.note, 600),
  };
  await DB.prepare("INSERT INTO orders (id, product_id, data, status, ip, created) VALUES (?, ?, ?, 'new', ?, ?)")
    .bind(id, p.id, JSON.stringify(order), ip, new Date().toISOString()).run();
  return json({ ok: true, id });
});

export const onRequestGet = handle(async ({ request, env }) => {
  await requireAdmin(request, env);
  const DB = await db(env);
  const { results } = await DB.prepare("SELECT data, status, created FROM orders ORDER BY created DESC LIMIT 500").all();
  return json({ orders: results.map((r) => ({ ...JSON.parse(r.data), status: r.status, created: r.created })) });
});

export const onRequestPatch = handle(async ({ request, env }) => {
  await requireAdmin(request, env);
  const DB = await db(env);
  const b = await request.json().catch(() => ({}));
  if (!STATUSES.includes(b.status)) throw new HttpError(400, "Bad status.");
  await DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(b.status, str(b.id, 40)).run();
  return json({ ok: true });
});

export const onRequestDelete = handle(async ({ request, env }) => {
  await requireAdmin(request, env);
  const DB = await db(env);
  await DB.prepare("DELETE FROM orders WHERE id = ?").bind(new URL(request.url).searchParams.get("id") || "").run();
  return json({ ok: true });
});
