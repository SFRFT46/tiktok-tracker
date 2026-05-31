/* =====================================================================
   Netlify Function: /.netlify/functions/tiktok?username=xxx
   Optional: &source=tikwm (free) | uses RapidAPI if a key is set
   ---------------------------------------------------------------------
   Free source = tikwm.com (no key, no card). RapidAPI optional.
   ===================================================================== */

const HOST = process.env.RAPIDAPI_HOST || 'tiktok-scraper7.p.rapidapi.com';
const KEY  = process.env.TIKTOK_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*'
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const username = String(q.username || '').trim().replace(/^@/, '');
  if (!username) return resp(400, { error: 'Missing username' });

  const source = q.source === 'rapid' ? 'rapid'
               : q.source === 'tikwm' ? 'tikwm'
               : (KEY ? 'rapid' : 'tikwm');

  try {
    if (source === 'tikwm') {
      const info  = await tikwm('/user/info', username);
      const posts = await tikwm('/user/posts', username, '&count=35&cursor=0');
      const out = normalize(username, info, posts);
      if (!out.topVideo && out.totalViews === 0) {
        return resp(502, { error: 'tikwm returned no data (rate-limited or blocked). Try again in a minute.' });
      }
      return resp(200, out);
    }
    if (!KEY) return resp(500, { error: 'No RapidAPI key set. Use source=tikwm (free) or set TIKTOK_API_KEY.' });
    const info  = await getJson(`https://${HOST}/user/info?unique_id=${encodeURIComponent(username)}`, rapidHeaders());
    const posts = await getJson(`https://${HOST}/user/posts?unique_id=${encodeURIComponent(username)}&count=35&cursor=0`, rapidHeaders());
    return resp(200, normalize(username, info, posts));
  } catch (err) {
    return resp(502, { error: 'Fetch failed: ' + err.message });
  }
};

/* tikwm with browser-like headers + tries www and non-www hosts */
async function tikwm(path, username, extra) {
  const qs = `unique_id=${encodeURIComponent(username)}${extra || ''}`;
  const hosts = ['https://www.tikwm.com/api', 'https://tikwm.com/api'];
  let lastErr;
  for (const base of hosts) {
    try {
      const r = await fetch(`${base}${path}?${qs}`, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.tikwm.com/' }
      });
      const text = await r.text();
      const t = text.trim();
      if (t.startsWith('{') || t.startsWith('[')) return JSON.parse(t);
      lastErr = new Error('non-JSON from ' + base + ' (status ' + r.status + ')');
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('tikwm failed');
}

function rapidHeaders(){ return { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOST }; }
async function getJson(url, h){ const r = await fetch(url, { headers: h || {} }); return r.json(); }

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
