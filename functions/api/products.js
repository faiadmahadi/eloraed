// GET    /api/products        public: active products (admin: all)
// POST   /api/products        admin: create or update one product (JSON body)
// DELETE /api/products?id=..  admin: remove a product and its picture
import { db, json, handle, isAdmin, requireAdmin, cleanProduct, newId, HttpError } from "../_lib/shop.js";

const imgId = (path) => (path || "").replace(/^api\/img\//, "");

export const onRequestGet = handle(async ({ request, env }) => {
  const DB = await db(env);
  const admin = await isAdmin(request, env);
  const { results } = await DB.prepare(`SELECT data FROM products ${admin ? "" : "WHERE active = 1"} ORDER BY sort ASC, updated DESC`).all();
  return json({ products: results.map((r) => JSON.parse(r.data)) }, 200, admin ? {} : { "cache-control": "public, max-age=30" });
});

export const onRequestPost = handle(async ({ request, env }) => {
  await requireAdmin(request, env);
  const DB = await db(env);
  const body = await request.json().catch(() => null);
  if (!body) throw new HttpError(400, "Bad JSON.");
  const id = /^[a-z0-9]{4,40}$/.test(body.id || "") ? body.id : newId("p");
  const p = cleanProduct(body, id);
  if (!p.title) throw new HttpError(400, "Title is required.");
  const old = await DB.prepare("SELECT data FROM products WHERE id = ?").bind(id).first();
  const now = new Date().toISOString();
  const prev = old ? JSON.parse(old.data) : null;
  p.created = prev ? prev.created : now;
  const stmts = [DB.prepare("INSERT INTO products (id, data, sort, active, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, sort = excluded.sort, active = excluded.active, updated = excluded.updated")
    .bind(id, JSON.stringify(p), p.sort, p.active ? 1 : 0, now)];
  if (prev && prev.image && prev.image !== p.image) stmts.push(DB.prepare("DELETE FROM images WHERE id = ?").bind(imgId(prev.image)));
  await DB.batch(stmts);
  return json({ product: p });
});

export const onRequestDelete = handle(async ({ request, env }) => {
  await requireAdmin(request, env);
  const DB = await db(env);
  const id = new URL(request.url).searchParams.get("id") || "";
  const old = await DB.prepare("SELECT data FROM products WHERE id = ?").bind(id).first();
  if (!old) throw new HttpError(404, "No such product.");
  const p = JSON.parse(old.data);
  const stmts = [DB.prepare("DELETE FROM products WHERE id = ?").bind(id)];
  if (p.image) stmts.push(DB.prepare("DELETE FROM images WHERE id = ?").bind(imgId(p.image)));
  await DB.batch(stmts);
  return json({ ok: true });
});
