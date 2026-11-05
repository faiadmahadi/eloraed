// POST /api/login  checks the dashboard password (Authorization header)
import { json, handle, requireAdmin } from "../_lib/shop.js";

export const onRequestPost = handle(async ({ request, env }) => {
  await requireAdmin(request, env);
  return json({ ok: true });
});
