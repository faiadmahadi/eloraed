// GET  /api/settings  public: payment numbers and notes shown in the shop
// POST /api/settings  admin: save them
import { db, json, handle, requireAdmin, readSettings, SETTING_KEYS, HttpError } from "../_lib/shop.js";

export const onRequestGet = handle(async ({ env }) => json({ settings: await readSettings(await db(env)) }));

export const onRequestPost = handle(async ({ request, env }) => {
  await requireAdmin(request, env);
  const DB = await db(env);
  const body = await request.json().catch(() => null);
  if (!body) throw new HttpError(400, "Bad JSON.");
  await DB.batch(SETTING_KEYS.map((k) => DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(k, String(body[k] ?? "").trim().slice(0, 1000))));
  return json({ settings: await readSettings(DB) });
});
