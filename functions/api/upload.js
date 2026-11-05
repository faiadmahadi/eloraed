// POST /api/upload  admin: raw picture body (jpeg/png/webp, max 1.5 MB) -> { url: "api/img/<id>" }
// The dashboard shrinks pictures in the browser before sending them.
import { db, json, handle, requireAdmin, newId, HttpError } from "../_lib/shop.js";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
export const onRequestPost = handle(async ({ request, env }) => {
  await requireAdmin(request, env);
  const type = (request.headers.get("content-type") || "").split(";")[0];
  if (!TYPES.includes(type)) throw new HttpError(415, "Only JPEG, PNG or WebP pictures.");
  const buf = await request.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > 1.5 * 1024 * 1024) throw new HttpError(413, "Picture is too big (max 1.5 MB).");
  const DB = await db(env);
  const id = newId("i");
  await DB.prepare("INSERT INTO images (id, type, data, created) VALUES (?, ?, ?, ?)").bind(id, type, buf, new Date().toISOString()).run();
  return json({ url: "api/img/" + id });
});
