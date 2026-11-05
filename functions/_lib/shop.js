// Shared helpers for the shop API. Storage: Cloudflare D1 database bound as DB.
// Admin requests carry "Authorization: Bearer <password>", checked against the
// Cloudflare secret ADMIN_PASSWORD.
const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL, sort INTEGER DEFAULT 0, active INTEGER DEFAULT 1, updated TEXT)",
  "CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, type TEXT, data BLOB, created TEXT)",
  "CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, product_id TEXT, data TEXT NOT NULL, status TEXT DEFAULT 'new', ip TEXT, created TEXT)",
  "CREATE INDEX IF NOT EXISTS orders_created ON orders (created)",
  "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)",
];

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
});

let ready = null;
export async function db(env) {
  if (!env.DB) throw new HttpError(503, "The shop database (DB) is not connected yet.");
  if (!ready) ready = env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s))).catch((e) => { ready = null; throw e; });
  await ready;
  return env.DB;
}

const sha = async (s) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
export async function isAdmin(request, env) {
  const pw = env.ADMIN_PASSWORD;
  const m = (request.headers.get("authorization") || "").match(/^Bearer (.+)$/);
  if (!pw || !m) return false;
  const [a, b] = await Promise.all([sha(m[1]), sha(pw)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
export async function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) throw new HttpError(503, "ADMIN_PASSWORD is not set in Cloudflare.");
  if (!(await isAdmin(request, env))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    throw new HttpError(401, "Wrong password.");
  }
}

// Wraps a handler: turns thrown HttpErrors into JSON answers.
export const handle = (fn) => async (ctx) => {
  try { return await fn(ctx); }
  catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    return json({ error: "Server error: " + (e.message || e) }, 500);
  }
};

export const newId = (prefix = "") => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const bnDigits = (s) => String(s ?? "").replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
export const str = (v, n) => String(v ?? "").trim().slice(0, n);
const num = (v) => Math.max(0, Math.round(Number(bnDigits(v).replace(/,/g, "")) || 0));

export function cleanProduct(p, id) {
  const lines = Array.isArray(p.features) ? p.features : String(p.features || "").split("\n");
  return {
    id,
    type: str(p.type, 30) || "বই",
    title: str(p.title, 160),
    subtitle: str(p.subtitle, 240),
    price: num(p.price),
    oldPrice: num(p.oldPrice),
    image: /^api\/img\/[a-z0-9]+$/.test(p.image || "") ? p.image : "",
    description: str(p.description, 6000),
    features: lines.map((x) => str(x, 200)).filter(Boolean).slice(0, 20),
    badge: str(p.badge, 30),
    info: str(p.info, 140),
    link: /^https?:\/\//.test(p.link || "") ? str(p.link, 500) : "",
    needsAddress: !!p.needsAddress,
    featured: !!p.featured,
    active: p.active !== false,
    sort: Math.round(Number(p.sort) || 0),
  };
}

export const SETTING_KEYS = ["bkash", "nagad", "payNote", "phone", "whatsapp", "notice"];
export async function readSettings(DB) {
  const { results } = await DB.prepare("SELECT key, value FROM settings").all();
  const out = {};
  for (const k of SETTING_KEYS) out[k] = "";
  for (const r of results) if (SETTING_KEYS.includes(r.key)) out[r.key] = r.value;
  return out;
}
