// GET /api/videos: the EloraEd page's Facebook videos and reels, newest first.
// Needs the Cloudflare Pages secret FB_PAGE_TOKEN: either a Page access token, or a
// never-expiring system-user token from the EloraEd business portfolio (the page token
// is then looked up from it). Answers are cached at the edge for 15 minutes, so a new
// upload shows up within that time.
const API = "https://graph.facebook.com/v26.0";
const PAGE_ID = "1408069942390202";
const FIELDS = encodeURIComponent("id,description,permalink_url,created_time,length,picture,thumbnails{uri,is_preferred,height}");
const TTL = 900;

const json = (body, status = 200, maxAge = 0) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${maxAge}` },
});

export async function onRequestGet({ env, request, waitUntil }) {
  const cache = caches.default;
  const key = new Request(new URL("/api/videos", request.url).toString());
  const lastKey = new Request(new URL("/api/videos/last-good", request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  // When Facebook fails, answer with the last list it gave us (kept 30 days) instead of nothing.
  const fail = async (error, status) => {
    const last = await cache.match(lastKey);
    if (last) {
      const body = await last.json();
      return json({ ...body, stale: true, error }, 200, 60);
    }
    return json({ videos: [], error }, status);
  };

  if (!env.FB_PAGE_TOKEN) return fail("FB_PAGE_TOKEN is not set", 503);

  const call = async (path, token) => {
    const r = await fetch(`${API}/${path}${path.includes("?") ? "&" : "?"}access_token=${token}`);
    const d = await r.json();
    if (d.error) throw new Error(`${path.split("?")[0]}: ${d.error.message}`);
    return d;
  };

  try {
    // A user/system-user token lists the page with its own page token; a page token lists nothing.
    const accounts = await call("me/accounts?fields=id,access_token", env.FB_PAGE_TOKEN).catch(() => ({ data: [] }));
    const page = (accounts.data || []).find((p) => p.id === PAGE_ID);
    const token = page ? page.access_token : env.FB_PAGE_TOKEN;
    const get = async (edge) => (await call(`${PAGE_ID}/${edge}?fields=${FIELDS}&limit=50`, token)).data || [];

    const [videos, reels] = await Promise.all([get("videos"), get("video_reels").catch(() => [])]);
    const seen = new Map();
    for (const v of [...videos, ...reels]) if (!seen.has(v.id)) seen.set(v.id, v);
    const list = [...seen.values()]
      .sort((a, b) => new Date(b.created_time) - new Date(a.created_time))
      .map((v) => {
        const thumbs = (v.thumbnails && v.thumbnails.data) || [];
        const best = thumbs.find((t) => t.is_preferred) || thumbs.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
        return {
          id: v.id,
          description: v.description || "",
          permalink_url: v.permalink_url || `/watch/?v=${v.id}`,
          created_time: v.created_time,
          length: v.length,
          thumb: (best && best.uri) || v.picture || "",
        };
      });
    const body = { videos: list, updated: new Date().toISOString() };
    const res = json(body, 200, TTL);
    waitUntil(Promise.all([cache.put(key, res.clone()), cache.put(lastKey, json(body, 200, 30 * 86400))]));
    return res;
  } catch (e) {
    return fail(String(e.message || e), 502);
  }
}
