// GET /api/videos: the EloraEd page's Facebook videos and reels, newest first.
// Needs the Cloudflare Pages secret FB_PAGE_TOKEN (a Page access token for the page).
// Answers are cached at the edge for 15 minutes, so a new upload shows up within that time.
const GRAPH = "https://graph.facebook.com/v26.0/me";
const FIELDS = encodeURIComponent("id,description,permalink_url,created_time,length,picture,thumbnails{uri,is_preferred,height}");
const TTL = 900;

const json = (body, status = 200, maxAge = 0) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${maxAge}` },
});

export async function onRequestGet({ env, request, waitUntil }) {
  const cache = caches.default;
  const key = new Request(new URL("/api/videos", request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  if (!env.FB_PAGE_TOKEN) return json({ videos: [], error: "FB_PAGE_TOKEN is not set" }, 503);

  const get = async (edge) => {
    const r = await fetch(`${GRAPH}/${edge}?fields=${FIELDS}&limit=50&access_token=${env.FB_PAGE_TOKEN}`);
    const d = await r.json();
    if (d.error) throw new Error(`${edge}: ${d.error.message}`);
    return d.data || [];
  };

  try {
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
    const res = json({ videos: list, updated: new Date().toISOString() }, 200, TTL);
    waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) {
    return json({ videos: [], error: String(e.message || e) }, 502);
  }
}
