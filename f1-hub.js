/* Formula 1 hub. Reads published sheets only; never writes to Google Sheets. */
const f1FeedBase = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub";
const f1Feeds = {
  trackScores: { gid: "346108435", manual: true, required: ["Circuit ID", "Circuit", "Rain Samples", "Rain Score /10", "Chaos Samples", "Chaos Score /10"] },
  ratings: { gid: "670395553", manual: true, required: ["Session Key", "Season", "Session", "Driver ID", "Driver", "Rating"] },
  reviews: { gid: "978263985", manual: true, required: ["Session Key", "Round", "Session", "Event"] },
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
let f1RatingSeason = "", f1RatingSession = "all";
const f1Tabs = { overview: "Overview", schedule: "Schedule", standings: "Standings", teams: "Teams & Drivers", results: "Results", rankings: "Driver Rankings", tracks: "Tracks" };

function brandedLoaderMarkup(message) {
  return `<div class="splash-flag" aria-hidden="true"><span></span><span></span><span></span><span></span></div><p>RACE <em>CONTROL</em></p><span>${escapeHtml(message)}</span>`;
}

function loadF1Feeds(force = false) {
  return Promise.all(Object.keys(f1Feeds).map(key => loadF1Feed(key, force)));
}

function loadF1Feed(key, force = false) {
  const entry = f1Store[key];
  if (!f1Feeds[key].gid) { entry.state = "unconfigured"; return Promise.resolve(); }
  if (entry.promise) return entry.promise;
  if (!force && entry.state === "ready" && entry.loadedAt && Date.now() - entry.loadedAt < 5 * 60 * 1000) return Promise.resolve();
  entry.state = "loading";
  entry.promise = (async () => {
    try {
      const rows = await fetchSheet(`${f1FeedBase}?gid=${f1Feeds[key].gid}&single=true&output=csv`);
      const required = f1Feeds[key].required.concat(f1Feeds[key].manual ? [] : key === "status" ? ["Season"] : ["Season", "In Latest Feed", "Updated UTC"]);
      // A correctly published empty data tab may have no rows yet.
      if (rows.length && required.some(column => !(column in rows[0]))) throw new Error("Unexpected feed columns");
      entry.rows = rows;
      entry.state = "ready";
      entry.loadedAt = Date.now();
    } catch (error) {
      if(typeof window.rcRecordIssue==='function')window.rcRecordIssue('feed',`Formula 1 ${key} unavailable`);
      entry.state = "error"; // Retain the last successful in-memory snapshot.
      console.error(`Formula 1 ${key} unavailable:`, error);
    } finally {
      entry.promise = null;
      updateF1HomeSummary();
      refreshF1Hub();
      if (typeof refreshF1EventRatings === "function") refreshF1EventRatings();
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
  document.getElementById("series-hub").hidden = true;
  activeSeriesName = "Formula 1";
  f1Tab = f1Tabs[tab] ? tab : "overview";
  const hub = document.getElementById("f1-hub");
  hub.hidden = false;
  hub.innerHTML = `<div class="f1-hub-heading">${seriesLogoMarkup('Formula 1',true)}<p class="weekend-eyebrow">THE CHAMPIONSHIP HUB</p><h1>Formula <em>1</em></h1><p>${new Date().getFullYear()} season · Every Lap, One App.</p></div>
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
  panel.innerHTML = ({ overview: f1OverviewMarkup, standings: f1StandingsMarkup, teams: f1TeamsMarkup, results: f1ResultsMarkup, rankings: f1RankingsMarkup, tracks: () => f1TracksMarkup() }[f1Tab] || f1OverviewMarkup)();
  panel.querySelectorAll('[data-f1-open]').forEach(button => button.addEventListener('click', () => {
    const target = button.dataset.f1Open;
    if (target === 'results') f1SelectedRace = f1LatestResults()[0]?.['Jolpica Race Key'] || '';
    renderF1Hub(target === 'constructors' ? 'standings' : target);
    const destination = document.getElementById(target === 'constructors' ? 'f1-constructor-standings' : 'f1-content');
    destination?.setAttribute('tabindex', '-1'); destination?.focus({preventScroll:true});
    destination?.scrollIntoView({block:'start',behavior:'instant'});
  }));
  if (typeof bindF1Insights === "function") bindF1Insights(panel);
  ["season", "session"].forEach(kind => {
    const control = panel.querySelector(`#f1-rating-${kind}`);
    if (control) control.addEventListener("change", event => {
      if (kind === "season") { f1RatingSeason = event.target.value; f1RatingSession = "all"; }
      else f1RatingSession = event.target.value;
      renderF1Content(); document.getElementById(`f1-rating-${kind}`).focus({ preventScroll: true });
    });
  });
  panel.querySelectorAll("[data-f1-retry]").forEach(button => button.addEventListener("click", () => { loadF1Feed(button.dataset.f1Retry, true); if (button.dataset.f1Retry === "ratings") loadF1Feed("reviews", true); renderF1Content(); }));
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

  return `<div class="f1-overview-grid"><section class="f1-feature"><p class="f1-kicker">NEXT GRAND PRIX</p>${next
    ? `<h2>${escapeHtml(next.event)}</h2><p>${escapeHtml(trackNameForRace(next))}</p><p>${formatDate(next.date)} · ${escapeHtml(next.time || "Time TBD")}</p><button type="button" data-f1-next>Event & weekend schedule →</button>`
    : `<h2>${seriesStatus("Formula 1").status === 1 ? "Season completed" : "Schedule coming soon"}</h2><p>The full calendar is available in Schedule.</p>`}</section>
    <section class="f1-feature f1-linked-feature"><button class="f1-card-link" data-f1-open="results" aria-label="View full results of the latest race"></button><p class="f1-kicker">LATEST RACE PODIUM</p>${latest.length
      ? `<h2>${escapeHtml(latest[0].Event)}</h2><p>${formatDate(latest[0]["Race Date UTC"])}</p><ol class="f1-podium">${latest.filter(row => ["1", "2", "3"].includes(row["Position Text"])).map(row => `<li value="${f1Rank(row)}"><strong>${escapeHtml(f1DriverName(row))}</strong><span>${escapeHtml(f1TeamName(row))}</span></li>`).join("")}</ol>${f1FeedNote("results")}`
      : f1Pending("results", "Race results")}</section>
    ${f1TopThree("standings", "DRIVERS’ CHAMPIONSHIP", "standings")}${f1TopThree("constructorStandings", "CONSTRUCTORS’ CHAMPIONSHIP", "constructors")}</div>
    <p class="f1-data-note">Championships and results: Jolpica-F1. Schedule and event details use your existing feeds.</p>${typeof f1InsightsMarkup === "function" ? f1InsightsMarkup() : ""}`;
}

function f1TeamIdentity(row, driver = true) {
  const profile = driver ? f1Driver(row['Driver ID']) : null;
  const id = driver ? profile?.['Current Constructor ID Override'] || profile?.['Latest Race Constructor ID'] || row['Constructor ID'] : row['Constructor ID'];
  const team = f1Constructor(id);
  const color = /^#[0-9a-f]{6}$/i.test(team?.['Team Color Hex'] || '') ? team['Team Color Hex'] : '#8d969f';
  return `<span class="f1-standing-name" style="--team-color:${color}">${team ? f1Image(team['Logo URL'], team.Constructor || 'Team', 'f1-standing-logo') : ''}${escapeHtml(driver ? f1DriverName(row) : f1TeamName(row))}</span>`;
}
function f1TopThree(key, title, target) {
  const rows = f1Sorted(key).slice(0,3);
  return `<section class="f1-feature f1-linked-feature"><button class="f1-card-link" data-f1-open="${target}" aria-label="View ${escapeHtml(title.toLowerCase())} standings"></button><p class="f1-kicker">${title}</p>${rows.length ? '<ol class="f1-top-three">' + rows.map((row,i) => `<li><strong>${f1TeamIdentity(row,key === 'standings')}</strong><span>${f1Number(row.Points)} pts <small>${i ? Number.isFinite(Number(row.Points)) && Number.isFinite(Number(rows[0].Points)) ? '−' + Number((Number(rows[0].Points)-Number(row.Points)).toFixed(2)) + ' to leader' : 'Gap unavailable' : 'Leader'}</small></span></li>`).join('') + '</ol>' + f1FeedNote(key) : f1Pending(key,'Standings')}</section>`;
}
function f1Table(headers, rows, caption) {
  return `<div class="f1-table-scroll" role="region" aria-label="${escapeHtml(caption)}" tabindex="0"><table class="f1-table"><caption>${escapeHtml(caption)}</caption><thead><tr>${headers.map(header => `<th scope="col">${header}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
function f1StandingsMarkup() {
  const drivers = f1Sorted("standings"), teams = f1Sorted("constructorStandings");
  return `<section><h2>Driver Standings</h2>${drivers.length ? f1FeedNote("standings") + f1Table(["Pos", "Driver", "Points", "Wins", "Teams this season"], drivers.map(row => `<tr><td>${escapeHtml(row["Position Text"] || row.Position)}</td><th scope="row">${f1TeamIdentity(row)}</th><td class="f1-table-points">${f1Number(row.Points)}</td><td>${f1Number(row.Wins)}</td><td>${escapeHtml(row["Season Constructors"])}</td></tr>`), "Driver championship standings") : f1Pending("standings", "Driver standings")}</section>
    <section class="f1-section" id="f1-constructor-standings"><h2>Constructor Standings</h2>${teams.length ? f1FeedNote("constructorStandings") + f1Table(["Pos", "Constructor", "Points", "Wins"], teams.map(row => `<tr><td>${escapeHtml(row["Position Text"] || row.Position)}</td><th scope="row">${f1TeamIdentity(row,false)}</th><td class="f1-table-points">${f1Number(row.Points)}</td><td>${f1Number(row.Wins)}</td></tr>`), "Constructor championship standings") : f1Pending("constructorStandings", "Constructor standings")}</section>`;
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
  const ranked = new Map(f1Sorted("constructorStandings").map(row => [row["Constructor ID"], f1Rank(row)]));
  const cards = [...teams].sort((a, b) => (ranked.get(a["Constructor ID"]) || Infinity) - (ranked.get(b["Constructor ID"]) || Infinity)).map(team => {
    const members = drivers.filter(row => teamFor(row) === team["Constructor ID"]);
    const color = /^#[0-9a-f]{6}$/i.test(team["Team Color Hex"] || "") ? team["Team Color Hex"] : "#e10600";
    return `<section class="f1-team" style="--team-color:${color}">${f1Image(team["Logo URL"], f1TeamName(team), "f1-team-logo")}<h3>${escapeHtml(f1TeamName(team))}</h3><p>${escapeHtml([team.Nationality, team.Base].filter(Boolean).join(" · "))}</p>${team["Team Principal"] ? `<p>Team principal: ${escapeHtml(team["Team Principal"])}</p>` : ""}${members.length ? members.map(f1DriverMarkup).join("") : `<p class="f1-data-note">No driver assignment available.</p>`}</section>`;
  }).join("");
  return `<h2>Teams & Drivers</h2><p class="f1-data-note">Team assignments reflect the latest published race, with any manual team overrides applied.</p>${f1FeedNote("drivers")}${!drivers.length ? f1Pending("drivers", "Drivers") : ""}<div class="f1-team-grid">${cards}</div>`;
}

function f1ValidRatings() {
  const seen = new Set();
  return f1Store.ratings.rows.filter(row => {
    const key = `${row["Session Key"]}|${row["Driver ID"]}`;
    const score = String(row.Rating ?? "").trim();
    if (!row["Driver ID"] || !/^\d{4}$/.test(row.Season) || !String(row["Session Key"]).startsWith(row.Season + ":") || !["Grand Prix", "Sprint"].includes(row.Session) || !score || !Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 10 || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
function f1RatingRanks(rows) {
  const drivers = new Map();
  rows.forEach(row => {
    const id = row["Driver ID"], driver = drivers.get(id) || { id, name: row.Driver || id, total: 0, weight: 0, gp: 0, sprint: 0, high: -Infinity, low: Infinity };
    const weight = row.Session === "Grand Prix" ? 3 : 1;
    driver.high = Math.max(driver.high, Number(row.Rating)); driver.low = Math.min(driver.low, Number(row.Rating));
    driver.total += Number(row.Rating) * weight; driver.weight += weight;
    driver[row.Session === "Grand Prix" ? "gp" : "sprint"]++;
    drivers.set(id, driver);
  });
  return [...drivers.values()].map(driver => ({ ...driver, average: driver.total / driver.weight }))
    .sort((a,b) => b.average - a.average || a.name.localeCompare(b.name));
}
function f1RatingLabel(key) {
  const race = f1Store.reviews.rows.find(row => row["Session Key"] === key);
  if (race) return `Round ${race.Round} · ${race.Event} · ${race.Session}`;
  const parts = key.split(":");
  return `Round ${parts[1]} · ${parts[2] === "SPRINT" ? "Sprint" : "Grand Prix"}`;
}
function f1RankingsMarkup() {
  const title = '<h2>Driver Rankings</h2><p class="f1-data-note">Drivers are rated out of 10 each race based on driver performance, excluding the car’s performance as much as possible. Season averages weight each Grand Prix three times as much as a sprint. Unrated sessions are excluded.</p>';
  const entry = f1Store.ratings;
  if (entry.state === "unconfigured" || !f1Feeds.ratings.gid) return title + '<p class="f1-empty">Driver ratings are coming soon.</p>';
  if (!entry.rows.length && entry.state !== "ready") return title + f1Pending("ratings", "Driver ratings");
  const valid = f1ValidRatings();
  const years = [...new Set(f1Store.ratings.rows.map(row => row.Season).filter(year => /^\d{4}$/.test(year)))].sort((a,b) => Number(b)-Number(a));
  if (!years.length) return title + '<p class="f1-empty">No driver ratings published yet.</p>';
  if (!years.includes(f1RatingSeason)) f1RatingSeason = years[0];
  const seasonRows = valid.filter(row => row.Season === f1RatingSeason);
  const sessions = [...new Set(seasonRows.map(row => row["Session Key"]))].sort((a,b) => Number(a.split(":")[1])-Number(b.split(":")[1]) || (a.endsWith("SPRINT") ? -1 : 1));
  if (f1RatingSession !== "all" && !sessions.includes(f1RatingSession)) f1RatingSession = "all";
  const ranks = f1RatingRanks(seasonRows.filter(row => f1RatingSession === "all" || row["Session Key"] === f1RatingSession));
  const controls = `<div class="f1-rating-controls"><div><label class="f1-select-label" for="f1-rating-season">Season</label><select id="f1-rating-season">${years.map(year => `<option ${year === f1RatingSeason ? "selected" : ""}>${year}</option>`).join("")}</select></div><div><label class="f1-select-label" for="f1-rating-session">Ratings</label><select id="f1-rating-session"><option value="all">Full season average</option>${sessions.map(key => `<option value="${escapeHtml(key)}" ${key === f1RatingSession ? "selected" : ""}>${escapeHtml(f1RatingLabel(key))}</option>`).join("")}</select></div></div>`;
  const note = entry.state === "error" ? '<p class="f1-data-note f1-warning">Update unavailable · showing previously loaded ratings.</p>' : '<p class="f1-data-note">Ratings reflect the latest loaded spreadsheet data.</p>';
  const latestRound = Math.max(0,...seasonRows.map(row => Number(row['Session Key'].split(':')[1]) || 0));
  const previous = f1RatingRanks(seasonRows.filter(row => Number(row['Session Key'].split(':')[1]) < latestRound));
  const seasonRanks = f1RatingRanks(seasonRows);
  const rankOf = (list, item) => list.findIndex(other => other.average === item.average) + 1;
  const delta = (value, decimals) => Math.abs(value) < (decimals ? .005 : .5) ? '—' : (value > 0 ? '+' : '−') + Math.abs(value).toFixed(decimals);
  const changes = f1RatingSession === 'all';
  const context = changes ? '<p class="f1-data-note">Changes compare the current average and rank with the average and rank before the latest rated round (' + latestRound + '). Sprint and Grand Prix ratings from that round are grouped together. New entries have no prior comparison.</p>' : '';
  return title + controls + note + context + '<button type="button" data-f1-retry="ratings">Refresh ratings</button>' + (ranks.length ? f1Table(['Rank','Driver','Rating /10','Season high','Season low',...(changes ? ['Rating change','Rank change'] : [])], ranks.map(driver => {
    const prior = previous.find(other => other.id === driver.id), season = seasonRanks.find(other => other.id === driver.id);
    return `<tr><td>${rankOf(ranks,driver)}</td><th scope="row">${escapeHtml(driver.name)}</th><td class="f1-table-points">${driver.average.toFixed(2)}</td><td>${season.high.toFixed(2)}</td><td>${season.low.toFixed(2)}</td>${changes ? '<td>' + (prior ? delta(driver.average-prior.average,2) : 'New') + '</td><td>' + (prior ? delta(rankOf(previous,prior)-rankOf(ranks,driver),0) : 'New') + '</td>' : ''}</tr>`;
  }), changes ? `${f1RatingSeason} driver rankings` : f1RatingLabel(f1RatingSession)) : '<p class="f1-empty">No rated sessions for this season yet.</p>');
}

function f1ResultsMarkup() {
  const results = f1Rows("results");
  if (!results.length) return `<h2>Race Results</h2>${f1Pending("results", "Race results")}`;
  const races = [...new Map([...results].sort((a, b) => Number(b.Round) - Number(a.Round)).map(row => [row["Jolpica Race Key"], row])).values()];
  if (!races.some(row => row["Jolpica Race Key"] === f1SelectedRace)) f1SelectedRace = races[0]["Jolpica Race Key"];
  const rows = results.filter(row => row["Jolpica Race Key"] === f1SelectedRace).sort((a, b) => f1Rank(a) - f1Rank(b));
  return `<h2>Race Results</h2><p class="f1-data-note">Grand Prix results · Qualifying and sprint results will be added later.</p><label class="f1-select-label" for="f1-race-select">Choose a Grand Prix</label><select id="f1-race-select">${races.map(row => `<option value="${escapeHtml(row["Jolpica Race Key"])}" ${row["Jolpica Race Key"] === f1SelectedRace ? "selected" : ""}>Round ${escapeHtml(row.Round)} · ${escapeHtml(row.Event)}</option>`).join("")}</select>${f1FeedNote("results")}<p>${escapeHtml(rows[0].Circuit)} · ${formatDate(rows[0]["Race Date UTC"])}</p>${f1Table(["Pos", "Driver", "Constructor", "Grid", "Laps", "Status", "Time / Gap", "Points"], rows.map(row => `<tr><td>${escapeHtml(row["Position Text"] || row.Position)}</td><th scope="row">${escapeHtml(f1DriverName(row))}</th><td>${escapeHtml(f1TeamName(row))}</td><td>${row.Grid === "0" ? "Pit lane / N/A" : f1Number(row.Grid)}</td><td>${f1Number(row.Laps)}</td><td>${escapeHtml(row["Finish Status"])}</td><td>${escapeHtml(row["Time or Gap"] || "—")}</td><td class="f1-table-points">${f1Number(row.Points)}</td></tr>`), rows[0].Event + " results")}`;
}


