/* =====================================================================
   Netlify Function: /.netlify/functions/tiktok?username=xxx
   Optional query: &source=tikwm   (free, no key)  | default uses RapidAPI if a key is set
   ---------------------------------------------------------------------
   Why this exists: the browser can't always call data providers directly
   (CORS). This server function proxies the request. It supports two sources:

   1) FREE  -> tikwm.com  (no key, no card). Used when source=tikwm OR no key set.
   2) RAPID -> RapidAPI "TikTok Scraper" (tiktok-scraper7). Set on Netlify:
        TIKTOK_API_KEY = your RapidAPI key
        RAPIDAPI_HOST  = tiktok-scraper7.p.rapidapi.com
   ===================================================================== */

const HOST = process.env.RAPIDAPI_HOST || 'tiktok-scraper7.p.rapidapi.com';
const KEY  = process.env.TIKTOK_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*'
};

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const username = String(q.username || '').trim().replace(/^@/, '');
  if (!username) return resp(400, { error: 'Missing username' });

  // Decide source: explicit ?source=tikwm, or free when no RapidAPI key configured
  const source = q.source === 'rapid' ? 'rapid'
               : q.source === 'tikwm' ? 'tikwm'
               : (KEY ? 'rapid' : 'tikwm');

  try {
    if (source === 'tikwm') {
      const info  = await getJson(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`);
      const posts = await getJson(`https://www.tikwm.com/api/user/posts?unique_id=${encodeURIComponent(username)}&count=35`);
      return resp(200, normalize(username, info, posts));
    }
    // RapidAPI path
    if (!KEY) return resp(500, { error: 'No RapidAPI key set. Use source=tikwm (free) or set TIKTOK_API_KEY.' });
    const info  = await getJson(`https://${HOST}/user/info?unique_id=${encodeURIComponent(username)}`, rapidHeaders());
    const posts = await getJson(`https://${HOST}/user/posts?unique_id=${encodeURIComponent(username)}&count=35&cursor=0`, rapidHeaders());
    return resp(200, normalize(username, info, posts));
  } catch (err) {
    return resp(502, { error: 'Fetch failed: ' + err.message });
  }
};

function rapidHeaders(){ return { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOST }; }
async function getJson(url, h){ const r = await fetch(url, { headers: h || {} }); return r.json(); }

/* Map provider response -> shape the frontend needs. tikwm & tiktok-scraper7 share this shape. */
function normalize(username, info, posts) {
  const stats = info?.data?.stats || info?.data?.user?.stats || {};
  const user  = info?.data?.user || info?.data || {};
  const videos = posts?.data?.videos || posts?.data || posts?.videos || [];

  let totalViews = 0, top = null;
  for (const v of (Array.isArray(videos) ? videos : [])) {
    const play = v.play_count ?? v.playCount ?? v.stats?.playCount ?? 0;
    totalViews += Number(play) || 0;
    if (!top || play > top.playCount) {
      const id = v.video_id || v.aweme_id || v.id || '';
      top = {
        id,
        title: v.title || v.desc || 'video',
        cover: v.cover || v.origin_cover || v.video?.cover || '',
        playCount: Number(play) || 0,
        url: `https://www.tiktok.com/@${username}/video/${id}`
      };
    }
  }
  return {
    username,
    nickname: user.nickname || user.uniqueId || user.unique_id || username,
    avatar: user.avatarThumb || user.avatar || user.avatarMedium || '',
    followerCount: Number(stats.followerCount ?? stats.follower_count ?? 0),
    videoCount: Number(stats.videoCount ?? stats.video_count ?? (Array.isArray(videos) ? videos.length : 0)),
    totalViews,
    topVideo: top,
    fetchedAt: Date.now()
  };
}

function resp(code, body) { return { statusCode: code, headers, body: JSON.stringify(body) }; }
