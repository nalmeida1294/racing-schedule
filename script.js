const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR516QHxV4Yl0LZHNzFe2avT1PYsbYkxyyct20mbuG58qZ_uCWOCxaTZoel8UjOv86swjQ904Y-i9-v/pub?gid=8036821&single=true&output=csv";


let allRaces = [];


fetch(sheetURL)
    .then(response => response.text())
    .then(data => {

        const rows = data.trim().split("\n");

        // Remove header row
        rows.shift();


        // Convert CSV rows into race objects
        allRaces = rows.map(row => {

            const columns = row.split(",");

            return {
                round: columns[0],
                event: columns[1],
                series: columns[2],
                date: columns[3],
                time: columns[4],
                notes: columns[5]
            };

        });


        renderHome();

    })
    .catch(error => {

        console.error("Error loading racing schedule:", error);

        document.getElementById("schedule").innerHTML =
            "<p>Unable to load racing schedule.</p>";

    });


// HOME PAGE

function renderHome() {

    const today = new Date();

    today.setHours(0, 0, 0, 0);


    // Group races by series
    const seriesList = {};


    allRaces.forEach(race => {

        if (!seriesList[race.series]) {
            seriesList[race.series] = [];
        }

        seriesList[race.series].push(race);

    });


    // Find next race for every series
    const nextRaces = [];


    Object.keys(seriesList).forEach(series => {

        const seriesRaces = seriesList[series];


        seriesRaces.sort((a, b) => {

            return new Date(a.date) - new Date(b.date);

        });


        const nextRace = seriesRaces.find(race => {

            return new Date(race.date) >= today;

        });


        if (nextRace) {

            nextRaces.push(nextRace);

        }

    });


    // Sort series based on whose next race is soonest
    nextRaces.sort((a, b) => {

        return new Date(a.date) - new Date(b.date);

    });


    const scheduleContainer = document.getElementById("schedule");

    scheduleContainer.innerHTML = "";


    // Create homepage cards
    nextRaces.forEach(race => {

        const raceCard = document.createElement("div");

        raceCard.className = "race-card";


        raceCard.innerHTML = `

            <div class="series-name">
                ${race.series}
            </div>

            <div class="next-race-label">
                NEXT RACE
            </div>

            <h2 class="event-name">
                ${race.event}
            </h2>

            <p class="race-info">
                ${formatDate(race.date)}
            </p>

            <p class="race-info">
                ${race.time}
            </p>

            ${
                race.notes
                    ? `<p class="race-notes">${race.notes}</p>`
                    : ""
            }

        `;


        // Make the entire card clickable
        raceCard.addEventListener("click", () => {

            showSeries(race.series);

        });


        scheduleContainer.appendChild(raceCard);

    });

}


// SERIES CALENDAR

function showSeries(seriesName) {

    const seriesRaces = allRaces
        .filter(race => race.series === seriesName)
        .sort((a, b) => {

            return new Date(a.date) - new Date(b.date);

        });


    const calendarContainer =
        document.getElementById("series-calendar");


    calendarContainer.innerHTML = `

        <h1>${seriesName}</h1>

        <p class="calendar-subtitle">
            Full Season Calendar
        </p>

    `;


    seriesRaces.forEach(race => {

        const raceItem = document.createElement("div");

        raceItem.className = "calendar-race";


        raceItem.innerHTML = `

            <div class="calendar-date">
                ${formatDate(race.date)}
            </div>

            <div class="calendar-event">
                ${race.event}
            </div>

            <div class="calendar-details">

                Round: ${race.round}
                <br>

                Time: ${race.time}

                ${
                    race.notes
                        ? `<br>Notes: ${race.notes}`
                        : ""
                }

            </div>

        `;


        calendarContainer.appendChild(raceItem);

    });


    // Switch views
    document.getElementById("home-view").style.display = "none";

    document.getElementById("series-view").style.display = "block";

}


// BACK BUTTON

document
    .getElementById("back-button")
    .addEventListener("click", () => {

        document.getElementById("series-view").style.display = "none";

        document.getElementById("home-view").style.display = "block";

    });


// FORMAT DATE

function formatDate(dateString) {

    const date = new Date(dateString + "T12:00:00");

    return date.toLocaleDateString("en-US", {

        month: "short",
        day: "numeric",
        year: "numeric"

    });

}