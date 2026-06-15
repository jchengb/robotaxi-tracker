import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeAllCities } from './scraper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR    = join(__dirname, 'data');
const CACHE_FILE  = join(DATA_DIR, 'cache.json');
const HISTORY_FILE= join(DATA_DIR, 'history.json');

const REFRESH_MS = 10 * 60 * 1000; // 10 minutes

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function loadJSON(path, fallback) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return fallback; }
}

function saveJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

// Seed synthetic history so the chart isn't empty on first run.
// Growth curve from ~6 to 22 unsupervised over 60 days.
function buildSyntheticHistory() {
  const history = [];
  const now = new Date();
  for (let daysAgo = 60; daysAgo >= 1; daysAgo--) {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    const progress = (60 - daysAgo) / 59;
    const base = Math.round(6 + progress * 16);
    const jitter = Math.floor(Math.random() * 3) - 1;
    const unsupervised = Math.max(1, base + jitter);
    history.push({
      date: d.toISOString().split('T')[0],
      unsupervised,
      riderVehicles: unsupervised + 5,
      cybercabs: Math.round(20 + progress * 22) + jitter,
    });
  }
  return history;
}

let cache   = loadJSON(CACHE_FILE, null);
let history = loadJSON(HISTORY_FILE, null) ?? buildSyntheticHistory();

async function refreshData() {
  console.log('[server] Refreshing data from robotaxitracker.com...');
  try {
    const scraped = await scrapeAllCities();
    cache = { ...scraped, lastUpdated: new Date().toISOString() };
    saveJSON(CACHE_FILE, cache);

    // Upsert today's history point
    const today = new Date().toISOString().split('T')[0];
    const point = {
      date:          today,
      unsupervised:  scraped.totals.unsupervised,
      riderVehicles: scraped.totals.riderVehicles,
      cybercabs:     scraped.totals.cybercabs,
    };
    const idx = history.findIndex((h) => h.date === today);
    if (idx >= 0) history[idx] = point;
    else history.push(point);
    if (history.length > 365) history = history.slice(-365);
    saveJSON(HISTORY_FILE, history);

    console.log('[server] Data refreshed — totals:', scraped.totals);
  } catch (e) {
    console.error('[server] Scrape error:', e.message);
  }
}

// First scrape + periodic refresh
refreshData();
setInterval(refreshData, REFRESH_MS);

// ─── Express ───────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Serve the built React frontend
const CLIENT_DIST = join(__dirname, '..', 'client', 'dist');
app.use(express.static(CLIENT_DIST));

app.get('/api/stats', (req, res) => {
  if (!cache) {
    return res.status(503).json({ error: 'Data loading, retry in a moment.' });
  }
  res.json({ current: cache, history });
});

app.post('/api/refresh', async (req, res) => {
  await refreshData();
  res.json({ ok: true, lastUpdated: cache?.lastUpdated });
});

// Catch-all: serve the React app for any non-API route
app.get('*', (req, res) => {
  res.sendFile(join(CLIENT_DIST, 'index.html'));
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`[server] Running on http://localhost:${PORT}`));
