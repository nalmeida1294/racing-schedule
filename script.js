const scheduleSources = {
  main: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=8036821&single=true&output=csv",
  sessions: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=284115388&single=true&output=csv",
  tracks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=601316395&single=true&output=csv"
};
const formulaSources = {
  main: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=472158354&single=true&output=csv",
  sessions: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=292090109&single=true&output=csv",
  tracks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=74500379&single=true&output=csv"
};
const indySources = {
  main: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=1480948301&single=true&output=csv",
  sessions: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=389254904&single=true&output=csv",
  tracks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=1628135713&single=true&output=csv"
};
const wecSources = {
  main: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=1344844418&single=true&output=csv",
  sessions: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=2134603755&single=true&output=csv",
  tracks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=620612287&single=true&output=csv"
};
const formulaESources = {
  main: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=386235495&single=true&output=csv",
  sessions: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=1976553374&single=true&output=csv",
  tracks: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=1070679692&single=true&output=csv"
};

const defaultSeriesOrder = ["Formula 1", "INDYCAR", "NASCAR Cup Series", "WEC", "IMSA", "Formula E", "O'Reilly Auto Parts Series", "Craftsman Truck Series", "ARCA Menards Series", "Indy NXT", "Formula 2", "Formula 3", "F1 Academy", "Formula Regional", "CARS Tour LMSC", "Dirt Sprint Cars", "Special Event"];
const nascarSeries = new Set(["NASCAR Cup Series", "O'Reilly Auto Parts Series", "Craftsman Truck Series", "ARCA Menards Series"]);
const formulaSeries = new Set(["Formula 1", "Formula 2", "Formula 3", "F1 Academy"]);
const indySeries = new Set(["INDYCAR", "Indy NXT"]);
const wecSeries = new Set(["WEC"]);
const formulaESeries = new Set(["Formula E"]);
const seriesThemes = {
  "Formula 1": ["#e10600", "rgba(225,6,0,.22)"], "INDYCAR": ["#c8102e", "rgba(200,16,46,.2)"], "NASCAR Cup Series": ["#f5c518", "rgba(245,197,24,.2)"], "WEC": ["#d8b24c", "rgba(216,178,76,.18)"], "IMSA": ["#e53935", "rgba(229,57,53,.2)"], "Formula E": ["#00a8e8", "rgba(0,168,232,.2)"], "O'Reilly Auto Parts Series": ["#00a651", "rgba(0,166,81,.2)"], "Craftsman Truck Series": ["#ff6b00", "rgba(255,107,0,.2)"], "ARCA Menards Series": ["#d71920", "rgba(215,25,32,.2)"], "Indy NXT": ["#0072ce", "rgba(0,114,206,.2)"], "Formula 2": ["#ff2b2b", "rgba(255,43,43,.2)"], "Formula 3": ["#7d4cff", "rgba(125,76,255,.2)"], "F1 Academy": ["#ff5ca8", "rgba(255,92,168,.2)"], "Formula Regional": ["#ff8c42", "rgba(255,140,66,.2)"], "CARS Tour LMSC": ["#00a6a6", "rgba(0,166,166,.2)"], "Dirt Sprint Cars": ["#b87333", "rgba(184,115,51,.2)"], "Special Event": ["#d8d8d8", "rgba(255,255,255,.16)"]
};

let allRaces = [];
let allSessions = [];
let allTracks = [];
let activeSeriesName = null;
let seriesSettings = { order: [...defaultSeriesOrder], hidden: [], sortNextRace: false };

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character]));
}

function parseCsv(text) {
  const rows = []; let row = []; let value = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const character = text[i], next = text[i + 1];
    if (character === '"' && quoted && next === '"') { value += '"'; i += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(value); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") i += 1;
      row.push(value); if (row.some(cell => cell !== "")) rows.push(row); row = []; value = "";
    } else value += character;
  }
  row.push(value); if (row.some(cell => cell !== "")) rows.push(row);
  return rows;
}

function csvObjects(text) {
  const rows = parseCsv(text);
  const headers = (rows.shift() || []).map(header => header.replace(/^\uFEFF/, "").trim());
  return rows.map(row => headers.reduce((record, header, index) => ({ ...record, [header]: (row[index] || "").trim() }), {}));
}

async function fetchSheet(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${url}&cacheBust=${Date.now()}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Feed returned ${response.status}`);
    return csvObjects(await response.text());
  } finally { clearTimeout(timeout); }
}

function formatDate(date) {
  const parsed = new Date(`${date || ""}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? "Date to be announced" : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function raceTime(race) { return new Date(`${race.date || ""}T12:00:00`).getTime(); }
function raceStartTime(race) {
  const match = String(race.time || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const dateParts = String(race.date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !dateParts) return Number.POSITIVE_INFINITY;
  let hour = Number(match[1]);
  if (/PM/i.test(match[3]) && hour !== 12) hour += 12;
  if (/AM/i.test(match[3]) && hour === 12) hour = 0;
  const [year, month, day] = dateParts.slice(1).map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const zoneName = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "longOffset" }).formatToParts(noonUtc).find(part => part.type === "timeZoneName")?.value || "GMT-05:00";
  const offset = zoneName.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offsetMinutes = offset ? (Number(offset[2]) * 60 + Number(offset[3])) * (offset[1] === "+" ? 1 : -1) : -300;
  return Date.UTC(year, month - 1, day, hour, Number(match[2])) - offsetMinutes * 60 * 1000;
}
function sessionTime(session) {
  const match = String(session.time || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!session.date || !match) return Number.MAX_SAFE_INTEGER;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (/PM/i.test(match[3]) && hour !== 12) hour += 12;
  if (/AM/i.test(match[3]) && hour === 12) hour = 0;
  return new Date(`${session.date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`).getTime();
}
function racesFor(series) { return allRaces.filter(race => race.series === series).sort((a, b) => raceTime(a) - raceTime(b) || raceStartTime(a) - raceStartTime(b)); }
function themeFor(series) { return seriesThemes[series] || ["#888", "rgba(255,255,255,.12)"]; }
function trackNameForRace(race) {
  const source = sourceForSeries(race.series);
  return allTracks.find(track => track.source === source && String(track.trackId) === String(race.trackId))?.name || "";
}
function sourceForSeries(series) {
  if (formulaSeries.has(series)) return "formula";
  if (indySeries.has(series)) return "indy";
  if (wecSeries.has(series)) return "wec";
  if (formulaESeries.has(series)) return "formula-e";
  return "nascar";
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("racingSeriesSettings"));
    if (Array.isArray(saved?.order)) seriesSettings.order = saved.order;
    if (Array.isArray(saved?.hidden)) seriesSettings.hidden = saved.hidden;
    if (typeof saved?.sortNextRace === "boolean") seriesSettings.sortNextRace = saved.sortNextRace;
  } catch (_) { /* Default settings are already present. */ }
  defaultSeriesOrder.forEach(series => { if (!seriesSettings.order.includes(series)) seriesSettings.order.push(series); });
  seriesSettings.order = [...new Set(seriesSettings.order.filter(series => defaultSeriesOrder.includes(series)))];
  seriesSettings.hidden = seriesSettings.hidden.filter(series => defaultSeriesOrder.includes(series));
}
function saveSettings() {
  try { localStorage.setItem("racingSeriesSettings", JSON.stringify(seriesSettings)); }
  catch (_) { /* Keep preferences usable in memory when browser storage is unavailable. */ }
}

function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function usableRaceDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekendWindow(now = new Date()) {
  const today = localIsoDate(now);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const start = addDays(today, -((weekday + 6) % 7));
  return { start, end: addDays(start, 6) };
}

function weekendRangeLabel({ start, end }) {
  const options = { timeZone: "UTC", month: "short", day: "numeric" };
  return `${new Date(`${start}T12:00:00Z`).toLocaleDateString("en-US", options)} – ${new Date(`${end}T12:00:00Z`).toLocaleDateString("en-US", options)}`;
}

function renderWeekendRaces(now = new Date()) {
  const window = weekendWindow(now);
  const today = localIsoDate(now);
  const container = document.getElementById("weekend-races");
  document.getElementById("weekend-date-range").textContent = weekendRangeLabel(window);
  const races = allRaces.filter(race => usableRaceDate(race.date) && !seriesSettings.hidden.includes(race.series) && race.date >= window.start && race.date <= window.end)
    .sort((a, b) => a.date.localeCompare(b.date) || seriesSettings.order.indexOf(a.series) - seriesSettings.order.indexOf(b.series) || raceStartTime(a) - raceStartTime(b));
  container.innerHTML = "";
  if (!races.length) {
    container.innerHTML = `<p class="weekend-empty">No races are scheduled this week in your selected series.</p>`;
    return;
  }
  let day = null, dayCards = null;
  races.forEach(race => {
    if (day !== race.date) {
      day = race.date;
      const group = document.createElement("section");
      group.className = "weekend-day";
      const label = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long" });
      group.innerHTML = `<h3>${label}<span>${formatDate(day)}</span></h3>`;
      dayCards = document.createElement("div");
      dayCards.className = "weekend-day-races";
      group.appendChild(dayCards);
      container.appendChild(group);
    }
    const card = document.createElement("button"); const [color, glow] = themeFor(race.series);
    card.type = "button"; card.className = "weekend-race";
    if (race.date < today) card.classList.add("weekend-race-completed");
    card.style.setProperty("--series-color", color); card.style.setProperty("--series-glow", glow);
    const trackName = trackNameForRace(race);
    card.innerHTML = `<span class="weekend-series">${escapeHtml(race.series)}</span><strong class="weekend-event">${escapeHtml(race.event)}</strong>${trackName ? `<span class="weekend-track">${escapeHtml(trackName)}</span>` : ""}<span class="weekend-time">${formatDate(race.date)} · ${escapeHtml(race.time || "Time TBD")}</span>`;
    card.addEventListener("click", () => showRaceDetails(race));
    dayCards.appendChild(card);
  });
}

function seriesStatus(series, now = new Date()) {
  const today = localIsoDate(now);
  const races = racesFor(series).filter(race => usableRaceDate(race.date) && race.date.slice(0, 4) === String(now.getFullYear()));
  const nextRace = races.find(race => race.date >= today);
  return { series, nextRace, status: nextRace ? 0 : races.length ? 1 : 2 };
}

function displayedSeries(now = new Date()) {
  return seriesSettings.order.filter(series => !seriesSettings.hidden.includes(series))
    .map(series => seriesStatus(series, now))
    .sort((a, b) => a.status - b.status || (a.status === 0 && seriesSettings.sortNextRace ? nextRaceSortTime(a.nextRace) - nextRaceSortTime(b.nextRace) : 0));
}

function renderHome(now = new Date()) {
  const today = now;
  const container = document.getElementById("schedule"); container.innerHTML = "";
  renderWeekendRaces(now);
  const visibleSeries = displayedSeries(now);
  let previousStatus = null;
  visibleSeries.filter(({ status }) => status !== 2).forEach(({ series, nextRace, status }) => {
    if (status !== previousStatus) {
      const heading = document.createElement("h2");
      heading.className = "series-group-heading";
      heading.textContent = ["Active Series", "Season Completed"][status];
      container.appendChild(heading);
      previousStatus = status;
    }
    const card = document.createElement("div"); const [color, glow] = themeFor(series);
    card.className = "race-card"; card.style.setProperty("--series-color", color); card.style.setProperty("--series-glow", glow);
    const seriesButton = `<button class="series-name series-name-button">${escapeHtml(series)}</button>`;
    if (nextRace) {
      const trackName = trackNameForRace(nextRace);
      card.innerHTML = `${seriesButton}<div class="next-race-label">NEXT RACE</div><button class="event-name event-button">${escapeHtml(nextRace.event)}</button>${trackName ? `<p class="race-track">${escapeHtml(trackName)}</p>` : ""}<p class="race-info">${formatDate(nextRace.date)}</p><p class="race-info">${escapeHtml(nextRace.time || "Time to be announced")}</p>${nextRace.network ? `<p class="race-network">${escapeHtml(nextRace.network)}</p>` : ""}${nextRace.notes ? `<p class="race-notes">${escapeHtml(nextRace.notes)}</p>` : ""}`;
      card.querySelector(".event-button").addEventListener("click", () => showRaceDetails(nextRace));
    } else if (status === 1) {
      card.classList.add("season-completed");
      card.innerHTML = `${seriesButton}<div class="next-race-label">SEASON STATUS</div><h2 class="event-name">🏁 Season Completed</h2><p class="race-info">No more races scheduled for ${today.getFullYear()}</p>`;
    }
    card.querySelector(".series-name-button").addEventListener("click", () => showSeries(series));
    if (series === "Formula 1") {
      const summary = document.createElement("div");
      summary.className = "f1-home-summary";
      summary.innerHTML = f1HomeSummary();
      card.appendChild(summary);
    } else {
      const hubNotice = document.createElement("p");
      hubNotice.className = "series-hub-coming-soon";
      hubNotice.textContent = "Full Series Hub Coming Soon";
      card.appendChild(hubNotice);
    }
    container.appendChild(card);
  });
  const futureSeries = [...new Set([
    ...visibleSeries.filter(({ status }) => status === 2).map(({ series }) => series),
    "Moto GP", "Whelen Modified Tour", "WRC"
  ])];
  const futureSection = document.createElement("section");
  futureSection.className = "future-series";
  futureSection.setAttribute("aria-labelledby", "future-series-heading");
  futureSection.innerHTML = `<h2 id="future-series-heading" class="series-group-heading">Future Series to Be Added</h2><ul>${futureSeries.map(series => `<li>${escapeHtml(series)}</li>`).join("")}</ul>`;
  container.appendChild(futureSection);
}

function nextRaceSortTime(race) {
  // Dates lead; unknown start times sort last within their own calendar day.
  const match = String(race.time || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const minutes = match ? (Number(match[1]) % 12 + (/PM/i.test(match[3]) ? 12 : 0)) * 60 + Number(match[2]) : 1440;
  return Number(race.date.replaceAll("-", "")) * 1500 + minutes;
}

function setView(id) {
  ["home-view", "series-view", "event-view"].forEach(view => { document.getElementById(view).style.display = view === id ? "block" : "none"; });
  window.scrollTo({ top: 0, behavior: "instant" });
}

let loading = false;
let dataReady = false;
function setLoading(visible, message = "Loading Race Control…") {
  const loader = document.getElementById("app-splash");
  loader.classList.toggle("is-hidden", !visible);
  loader.setAttribute("aria-hidden", String(!visible));
  document.getElementById("loader-message").textContent = message;
  document.getElementById("loader-brand").innerHTML = brandedLoaderMarkup("");
  document.getElementById("retry-load").hidden = true;
  document.getElementById("app").setAttribute("aria-busy", String(visible));
  document.querySelector("header").inert = visible;
  document.querySelector("main").inert = visible;
}

async function withLoading(prepare, message) {
  if (loading) return;
  loading = true;
  setLoading(true, message);
  try {
    // Allow the shared loader to paint before preparing the next view.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await prepare();
  } finally {
    setLoading(false);
    loading = false;
  }
}

function showSeries(series) {
  return withLoading(() => series === "Formula 1" ? renderF1Hub("overview") : renderSeries(series), `Opening ${series}…`);
}

function renderSeries(series, focusCurrent = true) {
  activeSeriesName = series;
  if (series !== "Formula 1") document.getElementById("f1-hub").hidden = true;
  if (series !== "Formula 1") {
    document.getElementById("series-calendar").removeAttribute("role");
    document.getElementById("series-calendar").removeAttribute("aria-labelledby");
  }
  document.getElementById("series-calendar").hidden = false;
  const races = racesFor(series), container = document.getElementById("series-calendar");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const nextRace = races.find(race => raceTime(race) >= today.getTime());
  let nextRaceElement = null;
  container.innerHTML = `<h1>${escapeHtml(series)}</h1><p class="calendar-subtitle">Full Season Calendar</p>`;
  if (!races.length) container.innerHTML += "<p class=\"no-races-message\">No schedule is available for this series yet.</p>";
  races.forEach(race => {
    const item = document.createElement("button"); item.className = "calendar-race calendar-race-button";
    const isNextRace = nextRace === race;
    if (raceTime(race) < today.getTime()) item.classList.add("calendar-race-completed");
    if (isNextRace) {
      item.classList.add("calendar-race-next");
      const [color, glow] = themeFor(series);
      item.style.setProperty("--series-color", color);
      item.style.setProperty("--series-glow", glow);
      nextRaceElement = item;
    }
    item.innerHTML = `<div class="calendar-date">${formatDate(race.date)}</div><div class="calendar-event">${escapeHtml(race.event)}</div><div class="calendar-details">${race.round ? `Round: ${escapeHtml(race.round)}<br>` : ""}Time: ${escapeHtml(race.time || "TBD")}${race.network ? `<br>Network: ${escapeHtml(race.network)}` : ""}${race.notes ? `<br>Notes: ${escapeHtml(race.notes)}` : ""}</div>`;
    item.addEventListener("click", () => showRaceDetails(race)); container.appendChild(item);
  });
  if (focusCurrent) {
    setView("series-view");
    if (nextRaceElement) requestAnimationFrame(() => nextRaceElement.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
}

function sessionsMarkup(sessions) {
  if (!sessions.length) return `<section class="detail-section"><h2>Weekend Schedule</h2><p class="empty-details">Session times have not been published yet.</p></section>`;
  return `<section class="detail-section"><h2>Weekend Schedule</h2><div class="session-list">${sessions.map(session => `<div class="session-item"><span class="session-type">${escapeHtml(session.type || "Session")}</span><div><strong>${escapeHtml(session.session)}</strong><br><span>${formatDate(session.date)} · ${escapeHtml(session.time || "TBD")}</span>${session.notes ? `<br><span>${escapeHtml(session.notes)}</span>` : ""}</div></div>`).join("")}</div></section>`;
}

function trackMarkup(track, trackId) {
  if (!track) return `<section class="detail-section"><h2>Track</h2><p class="empty-details">Track information has not been added yet.</p></section>`;
  const facts = [["Location", [track.city, track.state].filter(Boolean).join(", ")], ["Surface", track.surface], ["Track Type", track.type], ["Banking", track.banking], ["Year Built", track.yearBuilt]].filter(([, value]) => value);
  return `<section class="detail-section"><h2>Track</h2><h3>${escapeHtml(track.name || "Track to be announced")}</h3><p class="track-id">Track ID: ${escapeHtml(trackId)}</p>${facts.length ? `<dl class="track-facts">${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : "<p class=\"empty-details\">More track details will be added soon.</p>"}${track.description ? `<p class="track-description">${escapeHtml(track.description)}</p>` : ""}</section>`;
}

function showRaceDetails(race) {
  return withLoading(() => renderRaceDetails(race), "Opening event…");
}

function renderRaceDetails(race) {
  activeSeriesName = race.series;
  const sessions = allSessions.filter(session => String(session.raceId) === String(race.raceId) && session.series === race.series).sort((a, b) => sessionTime(a) - sessionTime(b));
  const source = sourceForSeries(race.series);
  const track = allTracks.find(item => item.source === source && String(item.trackId) === String(race.trackId));
  const detailedSeries = nascarSeries.has(race.series) || formulaSeries.has(race.series) || indySeries.has(race.series) || wecSeries.has(race.series) || formulaESeries.has(race.series);
  document.getElementById("event-details").innerHTML = `<p class="detail-series">${escapeHtml(race.series)}</p><h1>${escapeHtml(race.event)}</h1><p class="detail-meta">${formatDate(race.date)} · ${escapeHtml(race.time || "Time to be announced")}</p>${race.network ? `<p class="race-network">${escapeHtml(race.network)}</p>` : ""}${race.notes ? `<p class="race-notes">${escapeHtml(race.notes)}</p>` : ""}${detailedSeries ? sessionsMarkup(sessions) + trackMarkup(track, race.trackId) : "<section class=\"detail-section empty-details\"><h2>Weekend details coming soon</h2><p>Session and track information will be added for this series in a future update.</p></section>"}`;
  setView("event-view");
}

function renderCustomizePanel() {
  const list = document.getElementById("customize-series-list"); list.innerHTML = "";
  document.getElementById("sort-next-race").checked = seriesSettings.sortNextRace;
  document.getElementById("sort-custom").checked = !seriesSettings.sortNextRace;
  seriesSettings.order.forEach(series => {
    const item = document.createElement("div"); item.className = "customize-series-item"; item.draggable = true; item.dataset.series = series;
    item.innerHTML = `<div class="drag-handle" aria-hidden="true">⠿</div><div class="customize-series-name">${escapeHtml(series)}</div><div class="series-move-buttons"><button type="button" class="move-series" data-direction="-1" aria-label="Move ${escapeHtml(series)} up">↑</button><button type="button" class="move-series" data-direction="1" aria-label="Move ${escapeHtml(series)} down">↓</button></div><label class="series-toggle"><input type="checkbox" ${seriesSettings.hidden.includes(series) ? "" : "checked"}><span>Show</span></label>`;
    item.querySelector("input").addEventListener("change", event => { seriesSettings.hidden = event.target.checked ? seriesSettings.hidden.filter(value => value !== series) : [...new Set([...seriesSettings.hidden, series])]; saveSettings(); renderHome(); });
    item.querySelectorAll(".move-series").forEach(button => button.addEventListener("click", () => moveSeries(series, Number(button.dataset.direction))));
    item.addEventListener("dragstart", () => item.classList.add("dragging"));
    item.addEventListener("dragend", () => { item.classList.remove("dragging"); seriesSettings.order = [...list.querySelectorAll(".customize-series-item")].map(element => element.dataset.series); saveSettings(); renderHome(); });
    list.appendChild(item);
  });
}

function moveSeries(series, direction) {
  const currentIndex = seriesSettings.order.indexOf(series);
  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= seriesSettings.order.length) return;
  [seriesSettings.order[currentIndex], seriesSettings.order[nextIndex]] = [seriesSettings.order[nextIndex], seriesSettings.order[currentIndex]];
  saveSettings(); renderCustomizePanel(); renderHome();
}

const overlay = document.getElementById("customize-overlay");
const customizeList = document.getElementById("customize-series-list");
const seriesMenu = document.getElementById("series-menu");
function closeSeriesMenu() { seriesMenu.open = false; }
function renderSeriesMenu() {
  const list = document.getElementById("series-menu-list");
  list.innerHTML = '<p class="series-menu-heading">All Racing Series</p>';
  seriesSettings.order.forEach(series => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = series;
    button.addEventListener("click", async () => {
      closeSeriesMenu();
      await showSeries(series);
      document.getElementById("back-button").focus({ preventScroll: true });
    });
    list.appendChild(button);
  });
  const upcoming = document.createElement("div");
  upcoming.className = "series-menu-upcoming";
  upcoming.innerHTML = '<p class="series-menu-heading">Planned Additions</p><ul><li>Moto GP</li><li>Whelen Modified Tour</li><li>WRC</li></ul>';
  list.appendChild(upcoming);
}
seriesMenu.addEventListener("toggle", () => { if (seriesMenu.open) renderSeriesMenu(); });
document.addEventListener("click", event => { if (!seriesMenu.contains(event.target)) closeSeriesMenu(); });
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && seriesMenu.open) {
    closeSeriesMenu();
    seriesMenu.querySelector("summary").focus();
  }
});
function showHome() {
  closeSeriesMenu();
  overlay.classList.remove("active");
  return withLoading(() => { renderHome(); setView("home-view"); }, "Opening home…");
}
document.getElementById("home-button").addEventListener("click", event => { event.preventDefault(); showHome(); });
document.getElementById("customize-button").addEventListener("click", () => { closeSeriesMenu(); renderCustomizePanel(); overlay.classList.add("active"); });
document.getElementById("close-customize").addEventListener("click", () => overlay.classList.remove("active"));
overlay.addEventListener("click", event => { if (event.target === overlay) overlay.classList.remove("active"); });
document.getElementById("show-all-series").addEventListener("click", () => { seriesSettings.hidden = []; saveSettings(); renderCustomizePanel(); renderHome(); });
document.getElementById("hide-all-series").addEventListener("click", () => { seriesSettings.hidden = [...defaultSeriesOrder]; saveSettings(); renderCustomizePanel(); renderHome(); });
document.getElementById("sort-next-race").addEventListener("change", event => { seriesSettings.sortNextRace = event.target.checked; saveSettings(); renderHome(); });
document.getElementById("sort-custom").addEventListener("change", () => { seriesSettings.sortNextRace = false; saveSettings(); renderHome(); });
customizeList.addEventListener("dragover", event => {
  event.preventDefault();
  const dragging = customizeList.querySelector(".dragging");
  if (!dragging) return;
  const after = [...customizeList.querySelectorAll(".customize-series-item:not(.dragging)")].find(item => event.clientY < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2);
  if (after) customizeList.insertBefore(dragging, after);
  else customizeList.appendChild(dragging);
});
document.getElementById("back-button").addEventListener("click", showHome);
document.getElementById("event-back-button").addEventListener("click", () => activeSeriesName === "Formula 1"
  ? withLoading(() => renderF1Hub("schedule"), "Opening Formula 1 schedule…")
  : activeSeriesName ? showSeries(activeSeriesName) : setView("home-view"));
document.getElementById("reset-series").addEventListener("click", () => { seriesSettings = { order: [...defaultSeriesOrder], hidden: [], sortNextRace: false }; saveSettings(); renderCustomizePanel(); renderHome(); });

loadSettings();
async function loadData() {
  if (loading) return;
  loading = true;
  setLoading(true, "Loading racing schedules…");
  try {
    await Promise.all([
  fetchSheet(scheduleSources.main), fetchSheet(scheduleSources.sessions), fetchSheet(scheduleSources.tracks),
  fetchSheet(formulaSources.main), fetchSheet(formulaSources.sessions), fetchSheet(formulaSources.tracks),
  fetchSheet(indySources.main), fetchSheet(indySources.sessions), fetchSheet(indySources.tracks),
  fetchSheet(wecSources.main), fetchSheet(wecSources.sessions), fetchSheet(wecSources.tracks),
  fetchSheet(formulaESources.main), fetchSheet(formulaESources.sessions), fetchSheet(formulaESources.tracks)
])
  .then(([nascarRaces, nascarSessions, nascarTracks, formulaRaces, formulaSessions, formulaTracks, indyRaces, indySessions, indyTracks, wecRaces, wecSessions, wecTracks, formulaERaces, formulaESessions, formulaETracks]) => {
    const raceRows = nascarRaces.concat(formulaRaces, indyRaces, wecRaces, formulaERaces);
    const sessionRows = nascarSessions.concat(formulaSessions, indySessions, wecSessions, formulaESessions);
    allRaces = raceRows.map(row => ({ raceId: row["Race ID"], round: row.Round, event: row.Event, trackId: row["Track ID"], series: row.Series, date: row.Date, time: row.Time, network: row.Network, notes: row.Notes })).filter(race => race.series && race.event);
    allSessions = sessionRows.map(row => ({ raceId: row["Race ID"], trackId: row["Track ID"], series: row.Series, session: row.Session, type: row["Session Type"], date: row["Start Date"], time: row["Start Time"], notes: row.Notes })).filter(session => session.raceId && session.session);
    const toTrack = (row, source) => ({ trackId: row["Track ID"], name: row["Track Name"], city: row.City, state: row.State, surface: row.Surface, type: row["Track Type"], banking: row.Banking, yearBuilt: row["Year Built"], description: row.Description, source });
    allTracks = nascarTracks.map(row => toTrack(row, "nascar")).concat(formulaTracks.map(row => toTrack(row, "formula")), indyTracks.map(row => toTrack(row, "indy")), wecTracks.map(row => toTrack(row, "wec")), formulaETracks.map(row => toTrack(row, "formula-e"))).filter(track => track.trackId);
    renderHome();
    dataReady = true;
    loadF1Feeds();
  });
    setLoading(false);
  } catch (error) {
    console.error("Error loading racing schedule:", error);
    document.getElementById("loader-message").textContent = "Unable to load schedules. Check your connection and try again.";
    document.getElementById("retry-load").hidden = false;
  } finally { loading = false; }
}
document.getElementById("retry-load").addEventListener("click", loadData);

// Re-evaluate the local calendar at midnight, including after a sleeping tab resumes.
let renderedDate = localIsoDate();
function refreshCalendar() {
  const today = localIsoDate();
  if (!dataReady || loading || today === renderedDate) return;
  renderedDate = today;
  renderHome();
  if (document.getElementById("series-view").style.display === "block" && activeSeriesName) {
    const scroll = window.scrollY;
    if (activeSeriesName === "Formula 1" && f1Tab !== "schedule") refreshF1Hub();
    else renderSeries(activeSeriesName, false);
    window.scrollTo({ top: scroll, behavior: "instant" });
  }
}
function scheduleMidnightRefresh() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  setTimeout(() => { refreshCalendar(); scheduleMidnightRefresh(); }, midnight - now + 50);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshCalendar(); });
window.addEventListener("focus", refreshCalendar);
scheduleMidnightRefresh();
loadData();
