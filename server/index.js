import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { MongoClient } from 'mongodb';
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

// ─── MongoDB ────────────────────────────────────────────────
// If MONGODB_URI is set, history is persisted in Atlas.
// Otherwise falls back to local history.json (local dev).
let historyCollection = null;

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[mongo] No MONGODB_URI set — using local history.json');
    return;
  }
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('robotaxi');
    historyCollection = db.collection('history');
    await historyCollection.createIndex({ date: 1 }, { unique: true });
    console.log('[mongo] Connected to MongoDB Atlas');
  } catch (e) {
    console.error('[mongo] Connection failed:', e.message);
  }
}

async function loadHistory() {
  if (historyCollection) {
    const docs = await historyCollection
      .find({}, { projection: { _id: 0 } })
      .sort({ date: 1 })
      .toArray();
    if (docs.length > 0) return docs;
  }
  return loadJSON(HISTORY_FILE, null) ?? buildSyntheticHistory();
}

async function saveHistoryPoint(point) {
  if (historyCollection) {
    await historyCollection.updateOne(
      { date: point.date },
      { $set: point },
      { upsert: true }
    );
    // Keep only last 365 days in Atlas
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    await historyCollection.deleteMany({ date: { $lt: cutoff.toISOString().split('T')[0] } });
  } else {
    // Fallback: update in-memory array and write to JSON
    const idx = history.findIndex((h) => h.date === point.date);
    if (idx >= 0) history[idx] = point;
    else history.push(point);
    if (history.length > 365) history = history.slice(-365);
    saveJSON(HISTORY_FILE, history);
  }
}

// ─── Synthetic seed data ────────────────────────────────────
function buildSyntheticHistory() {
  const result = [];
  const now = new Date();
  for (let daysAgo = 60; daysAgo >= 1; daysAgo--) {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    const progress = (60 - daysAgo) / 59;
    const base = Math.round(6 + progress * 16);
    const jitter = Math.floor(Math.random() * 3) - 1;
    const unsupervised = Math.max(1, base + jitter);
    result.push({
      date: d.toISOString().split('T')[0],
      unsupervised,
      riderVehicles: unsupervised + 5,
      cybercabs: Math.round(20 + progress * 22) + jitter,
    });
  }
  return result;
}

// ─── Startup ────────────────────────────────────────────────
let cache   = loadJSON(CACHE_FILE, null);
let history = [];

async function init() {
  await connectMongo();
  history = await loadHistory();
  refreshData();
  setInterval(refreshData, REFRESH_MS);
}

async function refreshData() {
  console.log('[server] Refreshing data from robotaxitracker.com...');
  try {
    const scraped = await scrapeAllCities();
    cache = { ...scraped, lastUpdated: new Date().toISOString() };
    saveJSON(CACHE_FILE, cache);

    const today = new Date().toISOString().split('T')[0];
    const point = {
      date:          today,
      unsupervised:  scraped.totals.unsupervised,
      riderVehicles: scraped.totals.riderVehicles,
      cybercabs:     scraped.totals.cybercabs,
    };

    await saveHistoryPoint(point);

    // Keep in-memory history in sync
    const idx = history.findIndex((h) => h.date === today);
    if (idx >= 0) history[idx] = point;
    else history.push(point);

    console.log('[server] Data refreshed — totals:', scraped.totals);
  } catch (e) {
    console.error('[server] Scrape error:', e.message);
  }
}

init();

// ─── Tesla Stock (Yahoo Finance) ───────────────────────────
const STOCK_TTL_MS = 5 * 60 * 1000;
let stockCache = null;
let stockFetchedAt = 0;

async function fetchStock() {
  if (stockCache && Date.now() - stockFetchedAt < STOCK_TTL_MS) return stockCache;
  const { data } = await axios.get(
    'https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=1d&range=3mo&includePrePost=false',
    { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }
  );
  const result = data.chart.result[0];
  const meta   = result.meta;
  const closes = result.indicators.quote[0].close;
  const timestamps = result.timestamp;
  stockCache = {
    price:         meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose,
    marketState:   meta.marketState,
    history: timestamps
      .map((t, i) => ({ date: new Date(t * 1000).toISOString().split('T')[0], close: closes[i] }))
      .filter((h) => h.close != null),
    lastUpdated: new Date().toISOString(),
  };
  stockFetchedAt = Date.now();
  return stockCache;
}

// ─── Express ───────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_DIST = join(__dirname, '..', 'client', 'dist');
app.use(express.static(CLIENT_DIST));

app.get('/api/stats', (req, res) => {
  if (!cache) return res.status(503).json({ error: 'Data loading, retry in a moment.' });
  res.json({ current: cache, history });
});

app.post('/api/refresh', async (req, res) => {
  await refreshData();
  res.json({ ok: true, lastUpdated: cache?.lastUpdated });
});

app.get('/api/stock', async (req, res) => {
  try {
    res.json(await fetchStock());
  } catch (e) {
    console.error('[server] Stock fetch error:', e.message);
    res.status(503).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(join(CLIENT_DIST, 'index.html'));
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`[server] Running on http://localhost:${PORT}`));
