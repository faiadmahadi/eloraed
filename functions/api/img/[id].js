// GET /api/img/<id>  product pictures stored in D1 (ids never change, so cache for a year)
import { db, handle, HttpError } from "../../_lib/shop.js";

export const onRequestGet = handle(async ({ params, env }) => {
  const DB = await db(env);
  const row = await DB.prepare("SELECT type, data FROM images WHERE id = ?").bind(String(params.id)).first();
  if (!row) throw new HttpError(404, "No such picture.");
  return new Response(new Uint8Array(row.data), { headers: { "content-type": row.type, "cache-control": "public, max-age=31536000, immutable" } });
});
