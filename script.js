/* ============================================================
   MACROHEAT — script.js
   US Economic Heatmap Logic
   ============================================================ */

// ── DEFAULT DATA ────────────────────────────────────────────
const DEFAULT_DATA = [
  { name: "Non-Farm Employment Change", currency: "USD", impact: "high",    actual: 272,   forecast: 185,  previous: 165,  timestamp: "2025-06-06 12:30 UTC" },
  { name: "Unemployment Rate",          currency: "USD", impact: "high",    actual: 4.1,   forecast: 4.2,  previous: 4.2,  timestamp: "2025-06-06 12:30 UTC" },
  { name: "Average Hourly Earnings m/m",currency: "USD", impact: "high",    actual: 0.2,   forecast: 0.3,  previous: 0.3,  timestamp: "2025-06-06 12:30 UTC" },
  { name: "CPI m/m",                   currency: "USD", impact: "high",    actual: 0.4,   forecast: 0.3,  previous: 0.2,  timestamp: "2025-06-11 12:30 UTC" },
  { name: "CPI y/y",                   currency: "USD", impact: "high",    actual: 3.4,   forecast: 3.5,  previous: 3.5,  timestamp: "2025-06-11 12:30 UTC" },
  { name: "Core CPI m/m",              currency: "USD", impact: "high",    actual: 0.3,   forecast: 0.3,  previous: 0.4,  timestamp: "2025-06-11 12:30 UTC" },
  { name: "Final GDP q/q",             currency: "USD", impact: "high",    actual: 1.3,   forecast: 1.6,  previous: 3.4,  timestamp: "2025-05-30 12:30 UTC" },
  { name: "Core PCE Price Index m/m",  currency: "USD", impact: "high",    actual: 0.2,   forecast: 0.3,  previous: 0.3,  timestamp: "2025-05-31 12:30 UTC" },
  { name: "ISM Manufacturing PMI",     currency: "USD", impact: "medium",  actual: 48.7,  forecast: 49.8, previous: 49.2, timestamp: "2025-06-03 14:00 UTC" },
  { name: "ISM Services PMI",          currency: "USD", impact: "medium",  actual: 53.8,  forecast: 51.0, previous: 49.4, timestamp: "2025-06-05 14:00 UTC" },
  { name: "Core PPI m/m",             currency: "USD", impact: "medium",  actual: 0.3,   forecast: 0.2,  previous: 0.5,  timestamp: "2025-06-12 12:30 UTC" },
  { name: "PPI m/m",                  currency: "USD", impact: "medium",  actual: 0.2,   forecast: 0.2,  previous: 0.5,  timestamp: "2025-06-12 12:30 UTC" },
  { name: "Retail Sales m/m",         currency: "USD", impact: "medium",  actual: 0.1,   forecast: 0.3,  previous: -0.2, timestamp: "2025-06-14 12:30 UTC" },
  { name: "Core Retail Sales m/m",    currency: "USD", impact: "medium",  actual: 0.2,   forecast: 0.2,  previous: -0.1, timestamp: "2025-06-14 12:30 UTC" },
  { name: "ADP Non-Farm Employment",  currency: "USD", impact: "medium",  actual: 152,   forecast: 175,  previous: 188,  timestamp: "2025-06-05 12:15 UTC" },
  { name: "Unemployment Claims",      currency: "USD", impact: "medium",  actual: 229,   forecast: 220,  previous: 222,  timestamp: "2025-06-06 12:30 UTC" },
  { name: "FOMC Meeting Minutes",     currency: "USD", impact: "high",    actual: null,  forecast: null, previous: null, timestamp: "2025-06-19 18:00 UTC" },
];

// ── STATE ───────────────────────────────────────────────────
let state = {
  data: [...DEFAULT_DATA],
  filter: "all",
  search: "",
  autoRefresh: false,
  refreshTimer: null,
};

// ── SENTIMENT LOGIC ─────────────────────────────────────────
function getSentiment(event) {
  const { actual, forecast, name } = event;
  if (actual === null || actual === undefined || forecast === null || forecast === undefined) return "neutral";
  
  // Invert logic for bearish-when-higher indicators
  const invertedIndicators = ["unemployment rate", "unemployment claims", "initial jobless claims"];
  const isInverted = invertedIndicators.some(k => name.toLowerCase().includes(k));
  
  const diff = actual - forecast;
  if (Math.abs(diff) < 0.001) return "neutral";

  if (isInverted) return diff > 0 ? "bearish" : "bullish";
  return diff > 0 ? "bullish" : "bearish";
}

function getDeviationPct(event) {
  const { actual, forecast } = event;
  if (actual === null || forecast === null || forecast === 0) return 0;
  return Math.min(Math.abs((actual - forecast) / (Math.abs(forecast) || 1)) * 100, 100);
}

function formatValue(v) {
  if (v === null || v === undefined) return "—";
  if (Math.abs(v) >= 100) return v.toFixed(0) + "K";
  return (v > 0 ? "+" : "") + v.toFixed(1) + "%";
}

function formatNum(v, name) {
  if (v === null || v === undefined) return "—";
  const isLarge = Math.abs(v) >= 100;
  if (isLarge) return v.toLocaleString() + "K";
  const sign = v > 0 ? "+" : "";
  return sign + v.toFixed(2) + "%";
}

// ── RENDER ───────────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById("heatmapGrid");
  const empty = document.getElementById("emptyState");

  let filtered = state.data.filter(ev => {
    const matchFilter = state.filter === "all" || ev.impact === state.filter;
    const matchSearch = ev.name.toLowerCase().includes(state.search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "flex";
  } else {
    empty.style.display = "none";
    grid.innerHTML = filtered.map((ev, i) => buildCard(ev, i)).join("");
    attachCardListeners();
  }

  updateStats();
}

function buildCard(ev, i) {
  const sentiment = getSentiment(ev);
  const devPct    = getDeviationPct(ev);
  const actualClass = sentiment === "bullish" ? "actual-bull" : sentiment === "bearish" ? "actual-bear" : "actual-neutral";
  const barClass    = sentiment === "bullish" ? "bull" : sentiment === "bearish" ? "bear" : "neut";
  const arrow       = sentiment === "bullish" ? "▲" : sentiment === "bearish" ? "▼" : "◆";
  const arrowClass  = sentiment === "bullish" ? "bull" : sentiment === "bearish" ? "bear" : "neut";
  const delay       = (i % 12) * 40;

  const actualDisplay   = formatNum(ev.actual, ev.name);
  const forecastDisplay = formatNum(ev.forecast, ev.name);
  const previousDisplay = formatNum(ev.previous, ev.name);

  const diff = (ev.actual !== null && ev.forecast !== null) ? (ev.actual - ev.forecast) : null;
  const diffDisplay = diff !== null ? ((diff > 0 ? "+" : "") + diff.toFixed(2)) : "—";

  return `
  <div class="event-card" data-sentiment="${sentiment}" data-impact="${ev.impact}"
       data-name="${ev.name}" data-index="${i}"
       style="animation-delay:${delay}ms;"
       data-tooltip='{"name":"${ev.name}","sentiment":"${sentiment}","diff":"${diffDisplay}","dev":"${devPct.toFixed(1)}","actual":"${actualDisplay}","forecast":"${forecastDisplay}","previous":"${previousDisplay}"}'>
    <div class="card-header">
      <div class="card-name">${ev.name}</div>
      <div class="impact-badge ${ev.impact}">${ev.impact.toUpperCase()}</div>
    </div>
    <div class="card-values">
      <div class="value-block">
        <span class="value-label">Actual</span>
        <span class="value-num ${actualClass}">${actualDisplay}</span>
      </div>
      <div class="value-block">
        <span class="value-label">Forecast</span>
        <span class="value-num forecast">${forecastDisplay}</span>
      </div>
      <div class="value-block">
        <span class="value-label">Previous</span>
        <span class="value-num previous">${previousDisplay}</span>
      </div>
    </div>
    <div class="deviation-bar-wrap">
      <div class="deviation-label">
        <span>Deviation from Forecast</span>
        <span>${diffDisplay}</span>
      </div>
      <div class="deviation-bar-bg">
        <div class="deviation-bar-fill ${barClass}" style="width:${devPct}%"></div>
      </div>
    </div>
    <div class="card-footer">
      <span class="card-currency">${ev.currency}</span>
      <span class="card-time">${ev.timestamp || "—"}</span>
      <span class="sentiment-arrow ${arrowClass}">${arrow}</span>
    </div>
  </div>`;
}

function updateStats() {
  const all = state.data;
  const bullish = all.filter(e => getSentiment(e) === "bullish").length;
  const bearish = all.filter(e => getSentiment(e) === "bearish").length;
  const neutral = all.filter(e => getSentiment(e) === "neutral").length;

  document.getElementById("statBullish").textContent = bullish;
  document.getElementById("statBearish").textContent = bearish;
  document.getElementById("statNeutral").textContent = neutral;
  document.getElementById("statTotal").textContent  = all.length;

  const usdEl = document.getElementById("usdSentiment");
  const net = bullish - bearish;
  if (net > 3) {
    usdEl.textContent = "BULLISH ▲";
    usdEl.style.color = "var(--green)";
  } else if (net < -3) {
    usdEl.textContent = "BEARISH ▼";
    usdEl.style.color = "var(--red)";
  } else {
    usdEl.textContent = "NEUTRAL ◆";
    usdEl.style.color = "var(--text-dim)";
  }
}

// ── TOOLTIP ──────────────────────────────────────────────────
const tooltip = document.getElementById("tooltip");

function attachCardListeners() {
  document.querySelectorAll(".event-card").forEach(card => {
    card.addEventListener("mouseenter", (e) => showTooltip(e, card));
    card.addEventListener("mousemove",  (e) => positionTooltip(e));
    card.addEventListener("mouseleave", () => hideTooltip());
  });
}

function showTooltip(e, card) {
  const d = JSON.parse(card.dataset.tooltip);
  const sentClass = d.sentiment === "bullish" ? "t-bull" : d.sentiment === "bearish" ? "t-bear" : "";
  tooltip.innerHTML = `
    <strong>${d.name}</strong>
    Actual: <span class="${sentClass}">${d.actual}</span><br>
    Forecast: ${d.forecast}<br>
    Previous: ${d.previous}<br>
    Deviation: <span class="${sentClass}">${d.diff}</span><br>
    Strength: ${d.dev}%
  `;
  positionTooltip(e);
  tooltip.classList.add("visible");
}

function positionTooltip(e) {
  const x = e.clientX + 16;
  const y = e.clientY - 20;
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  tooltip.style.left = (x + tw > vw ? x - tw - 32 : x) + "px";
  tooltip.style.top  = (y + th > vh ? y - th      : y) + "px";
}

function hideTooltip() {
  tooltip.classList.remove("visible");
}

// ── CLOCK ─────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const str = now.toUTCString().split(" ")[4] + " UTC";
  document.getElementById("clock").textContent = str;
}
setInterval(updateClock, 1000);
updateClock();

// ── FILTERS ───────────────────────────────────────────────────
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.filter = btn.dataset.filter;
    renderCards();
  });
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderCards();
});

// ── AUTO REFRESH ─────────────────────────────────────────────
document.getElementById("autoRefresh").addEventListener("change", (e) => {
  state.autoRefresh = e.target.checked;
  if (state.autoRefresh) {
    state.refreshTimer = setInterval(() => {
      // Simulate small fluctuations for demo
      state.data = state.data.map(ev => {
        if (ev.actual === null) return ev;
        return { ...ev, actual: +(ev.actual + (Math.random() - 0.5) * 0.1).toFixed(2) };
      });
      renderCards();
    }, 5000);
    showToast("Auto-refresh ON — updating every 5s", false);
  } else {
    clearInterval(state.refreshTimer);
    showToast("Auto-refresh OFF", false);
  }
});

// ── FILE UPLOAD ───────────────────────────────────────────────
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const ext = file.name.split(".").pop().toLowerCase();
  const reader = new FileReader();

  reader.onload = (ev) => {
    try {
      let parsed;
      if (ext === "json") {
        parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed)) parsed = parsed.data || Object.values(parsed);
      } else if (ext === "csv") {
        parsed = parseCSV(ev.target.result);
      } else {
        showToast("Unsupported file format", true);
        return;
      }

      if (!parsed.length) { showToast("File is empty or malformed", true); return; }

      // Normalize fields
      state.data = parsed.map(row => ({
        name:      row.name      || row.Name      || row.event || row.Event || "Unknown",
        currency:  row.currency  || row.Currency  || "USD",
        impact:    (row.impact   || row.Impact    || "medium").toLowerCase(),
        actual:    parseFloat(row.actual   || row.Actual)   ?? null,
        forecast:  parseFloat(row.forecast || row.Forecast) ?? null,
        previous:  parseFloat(row.previous || row.Previous) ?? null,
        timestamp: row.timestamp || row.Timestamp || row.date || row.Date || "—",
      }));

      // ── SAVE TO LOCALSTORAGE ──
      saveToStorage(file.name);

      renderCards();
      showToast(`✓ Loaded & saved ${state.data.length} indicators from ${file.name}`, false);
    } catch (err) {
      console.error(err);
      showToast("Failed to parse file: " + err.message, true);
    }
    // Reset so same file can be re-uploaded
    e.target.value = "";
  };

  reader.readAsText(file);
});

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  });
}

// ── DRAG & DROP ON UPLOAD ZONE ────────────────────────────────
const uploadZone = document.getElementById("uploadZone");
uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = "var(--green)";
  uploadZone.style.background  = "var(--green-dim)";
});
uploadZone.addEventListener("dragleave", () => {
  uploadZone.style.borderColor = "";
  uploadZone.style.background  = "";
});
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = "";
  uploadZone.style.background  = "";
  const file = e.dataTransfer.files[0];
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById("fileInput").files = dt.files;
    document.getElementById("fileInput").dispatchEvent(new Event("change"));
  }
});

// ── TOAST ──────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (isError ? " error" : "");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = "toast"; }, 3500);
}

// ── LOCALSTORAGE ──────────────────────────────────────────────
const STORAGE_KEY      = "macroheat_data";
const STORAGE_META_KEY = "macroheat_meta";

function saveToStorage(filename) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
      filename: filename,
      savedAt:  new Date().toISOString(),
      count:    state.data.length,
    }));
    updateStorageBadge();
  } catch(e) {
    console.warn("localStorage save failed:", e);
  }
}

function loadFromStorage() {
  try {
    const raw  = localStorage.getItem(STORAGE_KEY);
    const meta = localStorage.getItem(STORAGE_META_KEY);
    if (!raw) return false;
    state.data = JSON.parse(raw);
    if (meta) {
      const m = JSON.parse(meta);
      const d = new Date(m.savedAt);
      const timeStr = d.toLocaleDateString("en-US", { month:"short", day:"numeric" })
                    + " " + d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
      showToast(`💾 Restored ${m.count} indicators from "${m.filename}" · saved ${timeStr}`, false);
      updateStorageBadge(m);
    }
    return true;
  } catch(e) {
    console.warn("localStorage load failed:", e);
    return false;
  }
}

function clearSavedData() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    showToast("No saved data to clear", true);
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_META_KEY);
  state.data = [...DEFAULT_DATA];
  renderCards();
  updateStorageBadge();
  showToast("✕ Cleared — showing default data", true);
}

function updateStorageBadge(meta) {
  const badge    = document.getElementById("storageBadge");
  const badgeText = document.getElementById("storageBadgeText");
  const sourceEl = document.getElementById("statSource");
  const hasData  = !!localStorage.getItem(STORAGE_KEY);

  if (badge) badge.style.display = hasData ? "flex" : "none";

  if (hasData && meta) {
    const name = meta.filename.length > 16 ? meta.filename.slice(0,14) + "…" : meta.filename;
    if (badgeText) badgeText.textContent = name;
    if (sourceEl)  { sourceEl.textContent = "Your Upload"; sourceEl.style.color = "var(--green)"; }
  } else if (hasData) {
    if (sourceEl) { sourceEl.textContent = "Your Upload"; sourceEl.style.color = "var(--green)"; }
  } else {
    if (sourceEl) { sourceEl.textContent = "Default"; sourceEl.style.color = "var(--text-dim)"; }
  }
}

// ── INIT — Load from data.csv → localStorage → DEFAULT_DATA ────
async function init() {
  // 1️⃣ Try fetching data.csv (works on GitHub Pages & local server)
  try {
    const res = await fetch("data.csv");
    if (res.ok) {
      const text = await res.text();
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        state.data = parsed.map(row => ({
          name:      row.name      || row.Name      || row.event     || row.Event     || "Unknown",
          currency:  row.currency  || row.Currency  || "USD",
          impact:    (row.impact   || row.Impact    || "medium").toLowerCase(),
          actual:    row.actual    || row.Actual    ? parseFloat(row.actual    || row.Actual)    : null,
          forecast:  row.forecast  || row.Forecast  ? parseFloat(row.forecast  || row.Forecast)  : null,
          previous:  row.previous  || row.Previous  ? parseFloat(row.previous  || row.Previous)  : null,
          timestamp: row.timestamp || row.Timestamp || row.date || row.Date || "—",
        }));

        // Save to localStorage so it persists for this browser too
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
        localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
          filename: "data.csv",
          savedAt:  new Date().toISOString(),
          count:    state.data.length,
        }));

        updateStorageBadge({ filename: "data.csv", count: state.data.length });
        showToast(`✓ Loaded ${state.data.length} indicators from data.csv`, false);
        renderCards();
        return;
      }
    }
  } catch(e) {
    // fetch failed — try next fallback
  }

  // 2️⃣ Try localStorage (previously uploaded via file picker)
  const restored = loadFromStorage();
  if (restored) {
    renderCards();
    return;
  }

  // 3️⃣ Final fallback — built-in default data
  state.data = [...DEFAULT_DATA];
  updateStorageBadge();
  showToast("Showing default data — upload data.csv to customize", false);
  renderCards();
}

init();
