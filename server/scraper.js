import axios from 'axios';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const AREAS = [
  { key: 'austin',  label: 'Austin',   area: 'austin'  },
  { key: 'bayarea', label: 'Bay Area', area: 'bayarea' },
  { key: 'dallas',  label: 'Dallas',   area: 'dallas'  },
  { key: 'houston', label: 'Houston',  area: 'houston' },
];

function float(s) {
  const m = String(s ?? '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function extractFromHTML(html) {
  // ── HTML metric card patterns (verified against live site) ──────────────
  // Rider Vehicles: large text-5xl span inside the card header
  const riderVehicles = float(
    html.match(/Rider Vehicles[\s\S]{0,800}?text-5xl[^"]*"[^>]*><span>(\d+)<\/span>/)?.[1]
  );

  // Unsupervised / Inactive / Cybercabs: all follow the same pattern:
  // LABEL</span>...font-mono...>NUMBER<
  const unsupervised = float(
    html.match(/Unsupervised<\/span>[\s\S]{0,200}?font-mono[^"]*"[^>]*>(\d+)</)?.[1]
  );
  const inactive = float(
    html.match(/Inactive<\/span>[\s\S]{0,200}?font-mono[^"]*"[^>]*>(\d+)</)?.[1]
  );
  const cybercabs = float(
    html.match(/Cybercabs<\/span>[\s\S]{0,200}?font-mono[^"]*"[^>]*>(\d+)</)?.[1]
  );

  // ── Unsupervised ride-share % and ride counts ───────────────────────────
  // The 7-day % is rendered as an inline progress bar width style
  const pctRaw = html.match(/style="width:([\d.]+)%"/)?.[1];
  const unsupervisedPercent = pctRaw ? Math.round(parseFloat(pctRaw) * 10) / 10 : null;

  // "25 of 33 rides" rendered in the rides section
  const ridesMatch = html.match(/(\d+) of (\d+) rides/);
  const unsupervisedRides = ridesMatch ? parseInt(ridesMatch[1], 10) : null;
  const totalRides        = ridesMatch ? parseInt(ridesMatch[2], 10) : null;

  return {
    riderVehicles,
    unsupervised,
    inactive,
    cybercabs,
    unsupervisedPercent,
    unsupervisedRides,
    totalRides,
  };
}

async function scrapePage(area) {
  const url = `https://robotaxitracker.com/?provider=tesla&area=${area}`;
  const { data: html } = await axios.get(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    timeout: 20000,
  });
  return extractFromHTML(html);
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrapeAllCities() {
  const cities = {};

  for (let i = 0; i < AREAS.length; i++) {
    const { key, label, area } = AREAS[i];
    if (i > 0) await delay(1500); // polite pacing
    try {
      const data = await scrapePage(area);
      cities[key] = { label, ...data };
      console.log(`[scraper] ${label}: unsupervised=${data.unsupervised} rider=${data.riderVehicles} cybercabs=${data.cybercabs}`);
    } catch (e) {
      console.error(`[scraper] ${label} failed: ${e.message}`);
      cities[key] = { label, error: e.message };
    }
  }

  // ── Compute cross-city totals ───────────────────────────────────────────
  // Cybercabs is a global fleet so we take the max seen (same fleet, different areas show the same count)
  const totals = {
    riderVehicles:      0,
    unsupervised:       0,
    inactive:           0,
    cybercabs:          0,
    unsupervisedPercent: null,
  };
  let pctSum = 0, pctCount = 0;

  for (const c of Object.values(cities)) {
    if (c.error) continue;
    totals.riderVehicles += c.riderVehicles ?? 0;
    totals.unsupervised  += c.unsupervised  ?? 0;
    totals.inactive      += c.inactive      ?? 0;
    totals.cybercabs      = Math.max(totals.cybercabs, c.cybercabs ?? 0);
    if (c.unsupervisedPercent != null) { pctSum += c.unsupervisedPercent; pctCount++; }
  }

  if (pctCount > 0) totals.unsupervisedPercent = Math.round((pctSum / pctCount) * 10) / 10;

  return { cities, totals };
}
