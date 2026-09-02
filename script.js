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

const defaultSeriesOrder = ["Formula 1", "INDYCAR", "NASCAR Cup Series", "WEC", "IMSA", "Formula E", "O'Reilly Auto Parts Series", "Craftsman Truck Series", "ARCA Menards Series", "Indy NXT", "Formula 2", "Formula 3", "F1 Academy", "Formula Regional", "CARS Tour LMSC", "Dirt Sprint Cars", "Special Event"];
const nascarSeries = new Set(["NASCAR Cup Series", "O'Reilly Auto Parts Series", "Craftsman Truck Series", "ARCA Menards Series"]);
const formulaSeries = new Set(["Formula 1", "Formula 2", "Formula 3", "F1 Academy"]);
const seriesThemes = {
  "Formula 1": ["#e10600", "rgba(225,6,0,.22)"], "INDYCAR": ["#c8102e", "rgba(200,16,46,.2)"], "NASCAR Cup Series": ["#f5c518", "rgba(245,197,24,.2)"], "WEC": ["#d8b24c", "rgba(216,178,76,.18)"], "IMSA": ["#e53935", "rgba(229,57,53,.2)"], "Formula E": ["#00a8e8", "rgba(0,168,232,.2)"], "O'Reilly Auto Parts Series": ["#00a651", "rgba(0,166,81,.2)"], "Craftsman Truck Series": ["#ff6b00", "rgba(255,107,0,.2)"], "ARCA Menards Series": ["#d71920", "rgba(215,25,32,.2)"], "Indy NXT": ["#0072ce", "rgba(0,114,206,.2)"], "Formula 2": ["#ff2b2b", "rgba(255,43,43,.2)"], "Formula 3": ["#7d4cff", "rgba(125,76,255,.2)"], "F1 Academy": ["#ff5ca8", "rgba(255,92,168,.2)"], "Formula Regional": ["#ff8c42", "rgba(255,140,66,.2)"], "CARS Tour LMSC": ["#00a6a6", "rgba(0,166,166,.2)"], "Dirt Sprint Cars": ["#b87333", "rgba(184,115,51,.2)"], "Special Event": ["#d8d8d8", "rgba(255,255,255,.16)"]
};

let allRaces = [];
let allSessions = [];
let allTracks = [];
let activeSeriesName = null;
let seriesSettings = { order: [...defaultSeriesOrder], hidden: [] };

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
  const response = await fetch(`${url}&cacheBust=${Date.now()}`);
  if (!response.ok) throw new Error(`Feed returned ${response.status}`);
  return csvObjects(await response.text());
}

function formatDate(date) {
  const parsed = new Date(`${date || ""}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? "Date to be announced" : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function raceTime(race) { return new Date(`${race.date || ""}T12:00:00`).getTime(); }
function sessionTime(session) {
  const match = String(session.time || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!session.date || !match) return Number.MAX_SAFE_INTEGER;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (/PM/i.test(match[3]) && hour !== 12) hour += 12;
  if (/AM/i.test(match[3]) && hour === 12) hour = 0;
  return new Date(`${session.date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`).getTime();
}
function racesFor(series) { return allRaces.filter(race => race.series === series).sort((a, b) => raceTime(a) - raceTime(b)); }
function themeFor(series) { return seriesThemes[series] || ["#888", "rgba(255,255,255,.12)"]; }
function trackNameForRace(race) {
  const source = formulaSeries.has(race.series) ? "formula" : "nascar";
  return allTracks.find(track => track.source === source && String(track.trackId) === String(race.trackId))?.name || "";
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("racingSeriesSettings"));
    if (Array.isArray(saved?.order)) seriesSettings.order = saved.order;
    if (Array.isArray(saved?.hidden)) seriesSettings.hidden = saved.hidden;
  } catch (_) { /* Default settings are already present. */ }
  defaultSeriesOrder.forEach(series => { if (!seriesSettings.order.includes(series)) seriesSettings.order.push(series); });
  seriesSettings.order = seriesSettings.order.filter(series => defaultSeriesOrder.includes(series));
  seriesSettings.hidden = seriesSettings.hidden.filter(series => defaultSeriesOrder.includes(series));
}
function saveSettings() { localStorage.setItem("racingSeriesSettings", JSON.stringify(seriesSettings)); }

function renderHome() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const container = document.getElementById("schedule"); container.innerHTML = "";
  seriesSettings.order.forEach(series => {
    if (seriesSettings.hidden.includes(series)) return;
    const races = racesFor(series);
    const thisYear = races.filter(race => new Date(`${race.date}T12:00:00`).getFullYear() === today.getFullYear());
    const nextRace = thisYear.find(race => raceTime(race) >= today.getTime());
    const card = document.createElement("div"); const [color, glow] = themeFor(series);
    card.className = "race-card"; card.style.setProperty("--series-color", color); card.style.setProperty("--series-glow", glow);
    const seriesButton = `<button class="series-name series-name-button">${escapeHtml(series)}</button>`;
    if (nextRace) {
      const trackName = trackNameForRace(nextRace);
      card.innerHTML = `${seriesButton}<div class="next-race-label">NEXT RACE</div><button class="event-name event-button">${escapeHtml(nextRace.event)}</button>${trackName ? `<p class="race-track">${escapeHtml(trackName)}</p>` : ""}<p class="race-info">${formatDate(nextRace.date)}</p><p class="race-info">${escapeHtml(nextRace.time || "Time to be announced")}</p>${nextRace.network ? `<p class="race-network">${escapeHtml(nextRace.network)}</p>` : ""}${nextRace.notes ? `<p class="race-notes">${escapeHtml(nextRace.notes)}</p>` : ""}`;
      card.querySelector(".event-button").addEventListener("click", () => showRaceDetails(nextRace));
    } else if (thisYear.length) {
      card.classList.add("season-completed");
      card.innerHTML = `${seriesButton}<div class="next-race-label">SEASON STATUS</div><h2 class="event-name">🏁 Season Completed</h2><p class="race-info">No more races scheduled for ${today.getFullYear()}</p>`;
    } else {
      card.classList.add("schedule-unavailable");
      card.innerHTML = `${seriesButton}<div class="next-race-label">SCHEDULE STATUS</div><h2 class="event-name">Schedule coming soon</h2><p class="race-info">This series will be added in a future update.</p>`;
    }
    card.querySelector(".series-name-button").addEventListener("click", () => showSeries(series));
    container.appendChild(card);
  });
}

function setView(id) {
  ["home-view", "series-view", "event-view"].forEach(view => { document.getElementById(view).style.display = view === id ? "block" : "none"; });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSeries(series) {
  activeSeriesName = series;
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
  setView("series-view");
  if (nextRaceElement) requestAnimationFrame(() => nextRaceElement.scrollIntoView({ behavior: "smooth", block: "center" }));
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
  const sessions = allSessions.filter(session => String(session.raceId) === String(race.raceId) && session.series === race.series).sort((a, b) => sessionTime(a) - sessionTime(b));
  const source = formulaSeries.has(race.series) ? "formula" : "nascar";
  const track = allTracks.find(item => item.source === source && String(item.trackId) === String(race.trackId));
  const detailedSeries = nascarSeries.has(race.series) || formulaSeries.has(race.series);
  document.getElementById("event-details").innerHTML = `<p class="detail-series">${escapeHtml(race.series)}</p><h1>${escapeHtml(race.event)}</h1><p class="detail-meta">${formatDate(race.date)} · ${escapeHtml(race.time || "Time to be announced")}</p>${race.network ? `<p class="race-network">${escapeHtml(race.network)}</p>` : ""}${race.notes ? `<p class="race-notes">${escapeHtml(race.notes)}</p>` : ""}${detailedSeries ? sessionsMarkup(sessions) + trackMarkup(track, race.trackId) : "<section class=\"detail-section empty-details\"><h2>Weekend details coming soon</h2><p>Session and track information will be added for this series in a future update.</p></section>"}`;
  setView("event-view");
}

function renderCustomizePanel() {
  const list = document.getElementById("customize-series-list"); list.innerHTML = "";
  seriesSettings.order.forEach(series => {
    const item = document.createElement("div"); item.className = "customize-series-item"; item.draggable = true; item.dataset.series = series;
    item.innerHTML = `<div class="drag-handle">⠿</div><div class="customize-series-name">${escapeHtml(series)}</div><label class="series-toggle"><input type="checkbox" ${seriesSettings.hidden.includes(series) ? "" : "checked"}><span>Show</span></label>`;
    item.querySelector("input").addEventListener("change", event => { seriesSettings.hidden = event.target.checked ? seriesSettings.hidden.filter(value => value !== series) : [...new Set([...seriesSettings.hidden, series])]; saveSettings(); renderHome(); });
    item.addEventListener("dragstart", () => item.classList.add("dragging"));
    item.addEventListener("dragend", () => { item.classList.remove("dragging"); seriesSettings.order = [...list.querySelectorAll(".customize-series-item")].map(element => element.dataset.series); saveSettings(); renderHome(); });
    list.appendChild(item);
  });
}

const overlay = document.getElementById("customize-overlay");
const customizeList = document.getElementById("customize-series-list");
document.getElementById("customize-button").addEventListener("click", () => { renderCustomizePanel(); overlay.classList.add("active"); });
document.getElementById("close-customize").addEventListener("click", () => overlay.classList.remove("active"));
overlay.addEventListener("click", event => { if (event.target === overlay) overlay.classList.remove("active"); });
customizeList.addEventListener("dragover", event => {
  event.preventDefault();
  const dragging = customizeList.querySelector(".dragging");
  if (!dragging) return;
  const after = [...customizeList.querySelectorAll(".customize-series-item:not(.dragging)")].find(item => event.clientY < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2);
  if (after) customizeList.insertBefore(dragging, after);
  else customizeList.appendChild(dragging);
});
document.getElementById("back-button").addEventListener("click", () => setView("home-view"));
document.getElementById("event-back-button").addEventListener("click", () => activeSeriesName ? showSeries(activeSeriesName) : setView("home-view"));
document.getElementById("reset-series").addEventListener("click", () => { seriesSettings = { order: [...defaultSeriesOrder], hidden: [] }; saveSettings(); renderCustomizePanel(); renderHome(); });

loadSettings();
Promise.all([
  fetchSheet(scheduleSources.main), fetchSheet(scheduleSources.sessions), fetchSheet(scheduleSources.tracks),
  fetchSheet(formulaSources.main), fetchSheet(formulaSources.sessions), fetchSheet(formulaSources.tracks)
])
  .then(([nascarRaces, nascarSessions, nascarTracks, formulaRaces, formulaSessions, formulaTracks]) => {
    const raceRows = nascarRaces.concat(formulaRaces);
    const sessionRows = nascarSessions.concat(formulaSessions);
    allRaces = raceRows.map(row => ({ raceId: row["Race ID"], round: row.Round, event: row.Event, trackId: row["Track ID"], series: row.Series, date: row.Date, time: row.Time, network: row.Network, notes: row.Notes })).filter(race => race.series && race.event);
    allSessions = sessionRows.map(row => ({ raceId: row["Race ID"], trackId: row["Track ID"], series: row.Series, session: row.Session, type: row["Session Type"], date: row["Start Date"], time: row["Start Time"], notes: row.Notes })).filter(session => session.raceId && session.session);
    const toTrack = (row, source) => ({ trackId: row["Track ID"], name: row["Track Name"], city: row.City, state: row.State, surface: row.Surface, type: row["Track Type"], banking: row.Banking, yearBuilt: row["Year Built"], description: row.Description, source });
    allTracks = nascarTracks.map(row => toTrack(row, "nascar")).concat(formulaTracks.map(row => toTrack(row, "formula"))).filter(track => track.trackId);
    renderHome();
  })
  .catch(error => { console.error("Error loading racing schedule:", error); document.getElementById("schedule").innerHTML = "<p>Unable to load the racing schedule. Please try again shortly.</p>"; });
