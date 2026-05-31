# TikTok View Tracker

Track views across many TikTok accounts at once, so you can instantly see which
account is going viral. Built for Creator Reward earners who manage many accounts.

## Three data sources (pick in Settings)

1) DEMO    - sample numbers, no setup. For testing the layout only (not real).
2) FREE    - tikwm.com. REAL data, NO key, NO credit card. Recommended.
3) RAPIDAPI- paste your RapidAPI key (TikTok Scraper / tiktok-scraper7).

You only need @username for any source. The app never logs into your TikTok
account and never touches it — it only reads public info.

## Easiest path to REAL data, free, no card
1. Deploy: drag the `tiktok-tracker` folder onto https://app.netlify.com
   (or just open index.html on your computer).
2. In the app: open Settings (gear) -> Data source -> "Free - tikwm.com".
3. Click "Test key". If it says "Free source works!", press Save.
4. Press "Check All". You now see REAL views.

If "Test" fails with a CORS/blocked error, your browser is blocking tikwm.
In that case deploy WITH the function (next section) — it proxies tikwm for
free on the server, where there is no CORS block.

## Deploy WITH the function (server route, still free)
Drag-and-drop does NOT run functions. To use the server route:
1. Push this folder to GitHub.
2. Netlify -> Add new site -> Import from Git -> select the repo. Deploy.
3. In the app keep Data source = "Free - tikwm.com". The app automatically falls
   back to /.netlify/functions/tiktok?source=tikwm when the browser is blocked.
   No key and no card needed.

## Optional: RapidAPI source
If you prefer RapidAPI: subscribe to "TikTok Scraper"
(host tiktok-scraper7.p.rapidapi.com) on rapidapi.com, copy your key, then in
Settings choose Data source = RapidAPI and paste the key. Or set it server-side:
Netlify -> Site settings -> Environment variables:
    TIKTOK_API_KEY = your key
    RAPIDAPI_HOST  = tiktok-scraper7.p.rapidapi.com

## Features
- Add accounts by @username. Bulk add 500-1000 at once.
- Views 24h, Total views, video count, Top (most viral) video.
- "Check All" refreshes every account in order, with a progress bar.
- Auto-ranking: #1 is the most viral (gold/silver/bronze for top 3).
- Viral badge when 24h views pass your threshold.
- Auto-refresh every X minutes (optional). Sort + search.
- Stale-view protection (cache-busting + no-store).
- Account list saved in your browser.

## About "Views 24h"
TikTok returns the current TOTAL views of a video, not "last 24h". The app saves
a snapshot each time you check, then subtracts the value from ~24h ago. Check at
least once a day for accurate 24h numbers. (No data yet -> "awaiting 24h".)

## Free source limits
tikwm.com is free but rate-limited. For many accounts, keep "Delay between
accounts" around 1000-2000 ms in Settings to avoid being temporarily blocked.

## Files
    tiktok-tracker/
    |- index.html              # full dashboard; free (tikwm) + RapidAPI sources
    |- netlify/functions/
    |    |- tiktok.js          # server proxy: free tikwm OR RapidAPI
    |- netlify.toml
    |- README.md
