/* Formula 1 hub. Reads published sheets only; never writes to Google Sheets. */
const f1FeedBase = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub";
const f1Feeds = {
  standings: { gid: "2073835947", dataset: "Formula Driver Standings", required: ["Driver ID", "Position", "Points"] },
  constructorStandings: { gid: "2056363639", dataset: "Formula Constructor Standings", required: ["Constructor ID", "Position", "Points"] },
  drivers: { gid: "1203747234", dataset: "Formula Drivers", required: ["Driver ID", "Driver"] },
  constructors: { gid: "47102268", dataset: "Formula Constructors", required: ["Constructor ID", "Constructor"] },
  results: { gid: "979377304", dataset: "Formula Results", required: ["Result ID", "Jolpica Race Key", "Round", "Position"] },
  status: { gid: "1525366958", required: ["State", "Last Success UTC"] }
};
const f1Store = Object.fromEntries(Object.keys(f1Feeds).map(key => [key, { rows: [], state: "idle", loadedAt: 0, promise: null }]));
let f1Tab = "overview";
let f1SelectedRace = "";
const f1Tabs = { overview: "Overview", schedule: "Schedule", standings: "Standings", teams: "Teams & Drivers", results: "Results" };

function brandedLoaderMarkup(message) {
  return `<div class="splash-flag" aria-hidden="true"><span></span><span></span><span></span><span></span></div><p>RACE <em>CONTROL</em></p><span>${escapeHtml(message)}</span>`;
}

function loadF1Feeds(force = false) {
  return Promise.all(Object.keys(f1Feeds).map(key => loadF1Feed(key, force)));
}

function loadF1Feed(key, force = false) {
  const entry = f1Store[key];
  if (entry.promise) return entry.promise;
  if (!force && entry.state === "ready" && entry.loadedAt && Date.now() - entry.loadedAt < 5 * 60 * 1000) return Promise.resolve();
  entry.state = "loading";
  entry.promise = (async () => {
    try {
      const rows = await fetchSheet(`${f1FeedBase}?gid=${f1Feeds[key].gid}&single=true&output=csv`);
      const required = f1Feeds[key].required.concat(key === "status" ? ["Season"] : ["Season", "In Latest Feed", "Updated UTC"]);
      // A correctly published empty data tab may have no rows yet.
      if (rows.length && required.some(column => !(column in rows[0]))) throw new Error("Unexpected feed columns");
      entry.rows = rows;
      entry.state = "ready";
      entry.loadedAt = Date.now();
    } catch (error) {
      entry.state = "error"; // Retain the last successful in-memory snapshot.
      console.error(`Formula 1 ${key} unavailable:`, error);
    } finally {
      entry.promise = null;
      updateF1HomeSummary();
      refreshF1Hub();
    }
  })();
  return entry.promise;
}

function f1Rows(key, year = new Date().getFullYear()) {
  return f1Store[key].rows.filter(row => row.Season === String(year) && (key === "status" || String(row["In Latest Feed"]).toUpperCase() === "TRUE"));
}
function f1Rank(row) {
  const value = Number(row.Position);
  return Number.isFinite(value) && value > 0 ? value : Infinity;
}
function f1Sorted(key) { return [...f1Rows(key)].sort((a, b) => f1Rank(a) - f1Rank(b)); }
function f1Driver(id) { return f1Rows("drivers").find(row => row["Driver ID"] === id); }
function f1Constructor(id) { return f1Rows("constructors").find(row => row["Constructor ID"] === id); }
function f1DriverName(row) { return f1Driver(row["Driver ID"])?.["Display Name Override"] || row.Driver || "Driver to be announced"; }
function f1TeamName(row) { return f1Constructor(row["Constructor ID"])?.["Display Name Override"] || row.Constructor || "Team to be announced"; }
function f1LatestResults() {
  const rows = f1Rows("results");
  const round = Math.max(0, ...rows.map(row => Number(row.Round) || 0));
  return rows.filter(row => Number(row.Round) === round).sort((a, b) => f1Rank(a) - f1Rank(b));
}
function f1Number(value) { return value === "" || value === undefined ? "—" : escapeHtml(value); }
function f1SourceStatus(key) {
  return f1Rows("status").find(row => (row.Dataset || row[""]) === f1Feeds[key].dataset);
}
function f1FeedNote(key) {
  const rows = f1Rows(key), entry = f1Store[key], status = f1SourceStatus(key);
  const round = status?.["Through Round"] || rows[0]?.["Through Round"];
  const timestamp = status?.["Last Success UTC"] || rows[0]?.["Updated UTC"];
  const date = timestamp ? new Date(timestamp) : null;
  const updated = date && Number.isFinite(date.getTime()) ? date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  const stale = entry.state === "error" || (status && !["OK", "NO DATA"].includes(status.State));
  return `<p class="f1-data-note${stale ? " f1-warning" : ""}">${stale ? "Update unavailable · showing previously loaded data. " : ""}${round ? `Through round ${escapeHtml(round)} · ` : ""}${updated ? `Updated ${escapeHtml(updated)}` : "Awaiting published update"}</p>${entry.state === "error" ? `<button type="button" data-f1-retry="${key}">Retry update</button>` : ""}`;
}
function f1Pending(key, label) {
  const entry = f1Store[key];
  if (entry.state === "loading" || entry.state === "idle") return `<div class="brand-loader f1-inline-loader" role="status">${brandedLoaderMarkup(`Loading ${label}…`)}</div>`;
  if (entry.state === "error") return `<div class="f1-empty"><p>${escapeHtml(label)} could not be loaded.</p><button type="button" data-f1-retry="${key}">Try again</button></div>`;
  return `<p class="f1-empty">No ${escapeHtml(label.toLowerCase())} published for ${new Date().getFullYear()} yet.</p>`;
}
function f1HomeSummary() {
  const leader = f1Sorted("standings")[0];
  const winner = f1LatestResults().find(row => row["Position Text"] === "1");
  const summary = [leader ? `<p><span>Championship leader</span><strong>${escapeHtml(f1DriverName(leader))}</strong> · ${f1Number(leader.Points)} pts</p>` : "",
    winner ? `<p><span>Last race winner</span><strong>${escapeHtml(f1DriverName(winner))}</strong><small>${escapeHtml(winner.Event)}</small></p>` : ""].join("");
  return summary ? summary + `<small class="f1-summary-round">${leader ? `Standings through round ${escapeHtml(leader["Through Round"])}` : "Latest published result"}</small>` : "";
}
function updateF1HomeSummary() {
  document.querySelectorAll(".f1-home-summary").forEach(element => { element.innerHTML = f1HomeSummary(); });
}

function renderF1Hub(tab = "overview") {
  activeSeriesName = "Formula 1";
  f1Tab = f1Tabs[tab] ? tab : "overview";
  const hub = document.getElementById("f1-hub");
  hub.hidden = false;
  hub.innerHTML = `<div class="f1-hub-heading"><p class="weekend-eyebrow">THE CHAMPIONSHIP HUB</p><h1>Formula <em>1</em></h1><p>${new Date().getFullYear()} season · Every Lap, One App.</p></div>
    <div class="f1-tabs" role="tablist" aria-label="Formula 1 sections">${Object.entries(f1Tabs).map(([key, label]) => `<button type="button" role="tab" id="f1-tab-${key}" data-f1-tab="${key}" aria-selected="${key === f1Tab}" aria-controls="${key === "schedule" ? "series-calendar" : "f1-content"}" tabindex="${key === f1Tab ? 0 : -1}">${label}</button>`).join("")}</div>
    <div id="f1-content" role="tabpanel" aria-labelledby="f1-tab-${f1Tab}"></div>`;
  hub.querySelectorAll("[data-f1-tab]").forEach(button => {
    button.addEventListener("click", () => withLoading(() => { renderF1Hub(button.dataset.f1Tab); document.getElementById(`f1-tab-${f1Tab}`).focus({ preventScroll: true }); }, "Opening Formula 1…"));
    button.addEventListener("keydown", event => {
      const keys = Object.keys(f1Tabs), index = keys.indexOf(button.dataset.f1Tab);
      let target;
      if (event.key === "ArrowRight") target = keys[(index + 1) % keys.length];
      if (event.key === "ArrowLeft") target = keys[(index + keys.length - 1) % keys.length];
      if (event.key === "Home") target = keys[0];
      if (event.key === "End") target = keys[keys.length - 1];
      if (target) { event.preventDefault(); document.getElementById(`f1-tab-${target}`).click(); }
    });
  });
  const calendar = document.getElementById("series-calendar");
  const selectedTab = hub.querySelector('[aria-selected="true"]');
  calendar.hidden = f1Tab !== "schedule";
  document.getElementById("f1-content").hidden = f1Tab === "schedule";
  setView("series-view");
  selectedTab?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  if (f1Tab === "schedule") {
    calendar.setAttribute("role", "tabpanel");
    calendar.setAttribute("aria-labelledby", "f1-tab-schedule");
    renderSeries("Formula 1");
  } else renderF1Content();
  loadF1Feeds();
}
function refreshF1Hub() {
  if (document.getElementById("f1-hub").hidden || document.getElementById("series-view").style.display !== "block") return;
  if (f1Tab !== "schedule") renderF1Content();
}
function renderF1Content() {
  const panel = document.getElementById("f1-content");
  panel.innerHTML = ({ overview: f1OverviewMarkup, standings: f1StandingsMarkup, teams: f1TeamsMarkup, results: f1ResultsMarkup }[f1Tab] || f1OverviewMarkup)();
  panel.querySelectorAll("[data-f1-retry]").forEach(button => button.addEventListener("click", () => { loadF1Feed(button.dataset.f1Retry, true); renderF1Content(); }));
  panel.querySelectorAll("[data-f1-next]").forEach(button => button.addEventListener("click", () => {
    const race = seriesStatus("Formula 1").nextRace;
    if (race) showRaceDetails(race);
  }));
  const select = panel.querySelector("#f1-race-select");
  if (select) select.addEventListener("change", event => { f1SelectedRace = event.target.value; renderF1Content(); document.getElementById("f1-race-select").focus({ preventScroll: true }); });
  // Hide missing image assets without leaving a broken-image icon.
  panel.querySelectorAll("img").forEach(img => img.addEventListener("error", () => { img.hidden = true; }));
}

function f1OverviewMarkup() {
  const next = seriesStatus("Formula 1").nextRace, latest = f1LatestResults();
  const leader = f1Sorted("standings")[0], team = f1Sorted("constructorStandings")[0];
  return `<div class="f1-overview-grid"><section class="f1-feature"><p class="f1-kicker">NEXT GRAND PRIX</p>${next
    ? `<h2>${escapeHtml(next.event)}</h2><p>${escapeHtml(trackNameForRace(next))}</p><p>${formatDate(next.date)} · ${escapeHtml(next.time || "Time TBD")}</p><button type="button" data-f1-next>Event & weekend schedule →</button>`
    : `<h2>${seriesStatus("Formula 1").status === 1 ? "Season completed" : "Schedule coming soon"}</h2><p>The full calendar is available in Schedule.</p>`}</section>
    <section class="f1-feature"><p class="f1-kicker">LATEST RACE PODIUM</p>${latest.length
      ? `<h2>${escapeHtml(latest[0].Event)}</h2><p>${formatDate(latest[0]["Race Date UTC"])}</p><ol class="f1-podium">${latest.filter(row => ["1", "2", "3"].includes(row["Position Text"])).map(row => `<li value="${f1Rank(row)}"><strong>${escapeHtml(f1DriverName(row))}</strong><span>${escapeHtml(f1TeamName(row))}</span></li>`).join("")}</ol>${f1FeedNote("results")}`
      : f1Pending("results", "Race results")}</section>
    <section class="f1-feature"><p class="f1-kicker">DRIVERS’ CHAMPIONSHIP LEADER</p>${leader ? `<h2>${escapeHtml(f1DriverName(leader))}</h2><p class="f1-points">${f1Number(leader.Points)} <small>points</small></p><p>${f1Number(leader.Wins)} Grand Prix wins</p>${f1FeedNote("standings")}` : f1Pending("standings", "Driver standings")}</section>
    <section class="f1-feature"><p class="f1-kicker">CONSTRUCTORS’ CHAMPIONSHIP LEADER</p>${team ? `<h2>${escapeHtml(f1TeamName(team))}</h2><p class="f1-points">${f1Number(team.Points)} <small>points</small></p><p>${f1Number(team.Wins)} Grand Prix wins</p>${f1FeedNote("constructorStandings")}` : f1Pending("constructorStandings", "Constructor standings")}</section></div>
    <p class="f1-data-note">Championships and results: Jolpica-F1. Schedule and event details use your existing feeds.</p>`;
}

function f1Table(headers, rows, caption) {
  return `<div class="f1-table-scroll" role="region" aria-label="${escapeHtml(caption)}" tabindex="0"><table class="f1-table"><caption>${escapeHtml(caption)}</caption><thead><tr>${headers.map(header => `<th scope="col">${header}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
function f1StandingsMarkup() {
  const drivers = f1Sorted("standings"), teams = f1Sorted("constructorStandings");
  return `<section><h2>Driver Standings</h2>${drivers.length ? f1FeedNote("standings") + f1Table(["Pos", "Driver", "Points", "Wins", "Teams this season"], drivers.map(row => `<tr><td>${escapeHtml(row["Position Text"] || row.Position)}</td><th scope="row">${escapeHtml(f1DriverName(row))}</th><td class="f1-table-points">${f1Number(row.Points)}</td><td>${f1Number(row.Wins)}</td><td>${escapeHtml(row["Season Constructors"])}</td></tr>`), "Driver championship standings") : f1Pending("standings", "Driver standings")}</section>
    <section class="f1-section"><h2>Constructor Standings</h2>${teams.length ? f1FeedNote("constructorStandings") + f1Table(["Pos", "Constructor", "Points", "Wins"], teams.map(row => `<tr><td>${escapeHtml(row["Position Text"] || row.Position)}</td><th scope="row">${escapeHtml(f1TeamName(row))}</th><td class="f1-table-points">${f1Number(row.Points)}</td><td>${f1Number(row.Wins)}</td></tr>`), "Constructor championship standings") : f1Pending("constructorStandings", "Constructor standings")}</section>`;
}

function f1SafeImage(value) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; } catch (_) { return ""; }
}
function f1Image(value, label, className) {
  const src = f1SafeImage(value);
  return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(label)}" class="${className}" loading="lazy" referrerpolicy="no-referrer">` : "";
}
function f1DriverMarkup(row) {
  return `<article class="f1-driver">${f1Image(row["Headshot URL"], f1DriverName(row), "f1-headshot")}<div><p class="f1-kicker">${row.Number ? `#${escapeHtml(row.Number)} · ` : ""}${escapeHtml(row.Nationality || "")}</p><h4>${escapeHtml(f1DriverName(row))}</h4>${row.Biography ? `<p class="f1-biography">${escapeHtml(row.Biography)}</p>` : ""}</div></article>`;
}
function f1TeamsMarkup() {
  const drivers = f1Rows("drivers"), teams = f1Rows("constructors");
  if (!teams.length) return `<h2>Teams & Drivers</h2>${f1Pending("constructors", "Teams")}`;
  const teamFor = row => row["Current Constructor ID Override"] || row["Latest Race Constructor ID"];
  const grouped = new Set();
  const ranked = new Map(f1Sorted("constructorStandings").map(row => [row["Constructor ID"], f1Rank(row)]));
  const cards = [...teams].sort((a, b) => (ranked.get(a["Constructor ID"]) || Infinity) - (ranked.get(b["Constructor ID"]) || Infinity)).map(team => {
    const members = drivers.filter(row => teamFor(row) === team["Constructor ID"]);
    members.forEach(row => grouped.add(row["Driver ID"]));
    const color = /^#[0-9a-f]{6}$/i.test(team["Team Color Hex"] || "") ? team["Team Color Hex"] : "#e10600";
    return `<section class="f1-team" style="--team-color:${color}">${f1Image(team["Logo URL"], f1TeamName(team), "f1-team-logo")}<h3>${escapeHtml(f1TeamName(team))}</h3><p>${escapeHtml([team.Nationality, team.Base].filter(Boolean).join(" · "))}</p>${team["Team Principal"] ? `<p>Team principal: ${escapeHtml(team["Team Principal"])}</p>` : ""}${members.length ? members.map(f1DriverMarkup).join("") : `<p class="f1-data-note">No driver assignment available.</p>`}</section>`;
  }).join("");
  const other = drivers.filter(row => !grouped.has(row["Driver ID"]));
  return `<h2>Teams & Drivers</h2><p class="f1-data-note">Team assignments reflect the latest published race, with any manual team overrides applied. Other season participants are listed separately.</p>${f1FeedNote("drivers")}${!drivers.length ? f1Pending("drivers", "Drivers") : ""}<div class="f1-team-grid">${cards}</div>${other.length ? `<section class="f1-section"><h3>Other Season Participants</h3><p class="f1-data-note">No confirmed team assignment for the latest race.</p><div class="f1-other-drivers">${other.map(f1DriverMarkup).join("")}</div></section>` : ""}`;
}

function f1ResultsMarkup() {
  const results = f1Rows("results");
  if (!results.length) return `<h2>Race Results</h2>${f1Pending("results", "Race results")}`;
  const races = [...new Map([...results].sort((a, b) => Number(b.Round) - Number(a.Round)).map(row => [row["Jolpica Race Key"], row])).values()];
  if (!races.some(row => row["Jolpica Race Key"] === f1SelectedRace)) f1SelectedRace = races[0]["Jolpica Race Key"];
  const rows = results.filter(row => row["Jolpica Race Key"] === f1SelectedRace).sort((a, b) => f1Rank(a) - f1Rank(b));
  return `<h2>Race Results</h2><p class="f1-data-note">Grand Prix results · Qualifying and sprint results will be added later.</p><label class="f1-select-label" for="f1-race-select">Choose a Grand Prix</label><select id="f1-race-select">${races.map(row => `<option value="${escapeHtml(row["Jolpica Race Key"])}" ${row["Jolpica Race Key"] === f1SelectedRace ? "selected" : ""}>Round ${escapeHtml(row.Round)} · ${escapeHtml(row.Event)}</option>`).join("")}</select>${f1FeedNote("results")}<p>${escapeHtml(rows[0].Circuit)} · ${formatDate(rows[0]["Race Date UTC"])}</p>${f1Table(["Pos", "Driver", "Constructor", "Grid", "Laps", "Status", "Time / Gap", "Points"], rows.map(row => `<tr><td>${escapeHtml(row["Position Text"] || row.Position)}</td><th scope="row">${escapeHtml(f1DriverName(row))}</th><td>${escapeHtml(f1TeamName(row))}</td><td>${row.Grid === "0" ? "Pit lane / N/A" : f1Number(row.Grid)}</td><td>${f1Number(row.Laps)}</td><td>${escapeHtml(row["Finish Status"])}</td><td>${escapeHtml(row["Time or Gap"] || "—")}</td><td class="f1-table-points">${f1Number(row.Points)}</td></tr>`), rows[0].Event + " results")}`;
}

