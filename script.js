const sheetURL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR516QHxV4Yl0LZHNzFe2avT1PYsbYkxyyct20mbuG58qZ_uCWOCxaTZoel8UjOv86swjQ904Y-i9-v/pub?gid=8036821&single=true&output=csv";



let allRaces = [];



// ==========================================
// DEFAULT SERIES ORDER
// ==========================================

const defaultSeriesOrder = [

    "Formula 1",
    "INDYCAR",
    "NASCAR Cup Series",
    "WEC",
    "IMSA",
    "Formula E",
    "O'Reilly Auto Parts Series",
    "Craftsman Truck Series",
    "ARCA Menards Series",
    "Indy NXT",
    "Formula 2",
    "Formula 3",
    "F1 Academy",
    "Formula Regional",
    "CARS Tour LMSC",
    "Dirt Sprint Cars",
    "Special Event"

];



// ==========================================
// SERIES COLORS
// ==========================================

const seriesThemes = {

    "Formula 1": {
        color: "#e10600",
        glow: "rgba(225, 6, 0, 0.22)"
    },

    "INDYCAR": {
        color: "#c8102e",
        glow: "rgba(200, 16, 46, 0.20)"
    },

    "NASCAR Cup Series": {
        color: "#f5c518",
        glow: "rgba(245, 197, 24, 0.20)"
    },

    "WEC": {
        color: "#d8b24c",
        glow: "rgba(216, 178, 76, 0.18)"
    },

    "IMSA": {
        color: "#e53935",
        glow: "rgba(229, 57, 53, 0.20)"
    },

    "Formula E": {
        color: "#00a8e8",
        glow: "rgba(0, 168, 232, 0.20)"
    },

    "O'Reilly Auto Parts Series": {
        color: "#00a651",
        glow: "rgba(0, 166, 81, 0.20)"
    },

    "Craftsman Truck Series": {
        color: "#ff6b00",
        glow: "rgba(255, 107, 0, 0.20)"
    },

    "ARCA Menards Series": {
        color: "#d71920",
        glow: "rgba(215, 25, 32, 0.20)"
    },

    "Indy NXT": {
        color: "#0072ce",
        glow: "rgba(0, 114, 206, 0.20)"
    },

    "Formula 2": {
        color: "#ff2b2b",
        glow: "rgba(255, 43, 43, 0.20)"
    },

    "Formula 3": {
        color: "#7d4cff",
        glow: "rgba(125, 76, 255, 0.20)"
    },

    "F1 Academy": {
        color: "#ff5ca8",
        glow: "rgba(255, 92, 168, 0.20)"
    },

    "Formula Regional": {
        color: "#ff8c42",
        glow: "rgba(255, 140, 66, 0.20)"
    },

    "CARS Tour LMSC": {
        color: "#00a6a6",
        glow: "rgba(0, 166, 166, 0.20)"
    },

    "Dirt Sprint Cars": {
        color: "#b87333",
        glow: "rgba(184, 115, 51, 0.20)"
    },

    "Special Event": {
        color: "#d8d8d8",
        glow: "rgba(255, 255, 255, 0.16)"
    }

};



// ==========================================
// CUSTOM SERIES SETTINGS
// ==========================================

let seriesSettings = {

    order:
        [...defaultSeriesOrder],

    hidden:
        []

};



// ==========================================
// LOAD SAVED SETTINGS
// ==========================================

function loadSeriesSettings() {

    const savedSettings =
        localStorage.getItem(
            "racingSeriesSettings"
        );


    if (!savedSettings) {

        return;

    }


    try {

        const parsedSettings =
            JSON.parse(
                savedSettings
            );


        if (
            Array.isArray(
                parsedSettings.order
            )
        ) {

            seriesSettings.order =
                parsedSettings.order;

        }


        if (
            Array.isArray(
                parsedSettings.hidden
            )
        ) {

            seriesSettings.hidden =
                parsedSettings.hidden;

        }


        // Add any newly added series

        defaultSeriesOrder.forEach(
            seriesName => {

                if (
                    !seriesSettings.order.includes(
                        seriesName
                    )
                ) {

                    seriesSettings.order.push(
                        seriesName
                    );

                }

            }
        );


        // Remove invalid series

        seriesSettings.order =
            seriesSettings.order.filter(
                seriesName =>
                    defaultSeriesOrder.includes(
                        seriesName
                    )
            );


        seriesSettings.hidden =
            seriesSettings.hidden.filter(
                seriesName =>
                    defaultSeriesOrder.includes(
                        seriesName
                    )
            );

    }


    catch (error) {

        console.error(
            "Unable to load saved series settings:",
            error
        );


        seriesSettings = {

            order:
                [...defaultSeriesOrder],

            hidden:
                []

        };

    }

}



// ==========================================
// SAVE SETTINGS
// ==========================================

function saveSeriesSettings() {

    localStorage.setItem(

        "racingSeriesSettings",

        JSON.stringify(
            seriesSettings
        )

    );

}



// Load saved preferences

loadSeriesSettings();



// ==========================================
// LOAD GOOGLE SHEET
// ==========================================

fetch(

    sheetURL +
    "&cacheBust=" +
    Date.now()

)

    .then(
        response =>
            response.text()
    )

    .then(data => {


        const rows =
            data
                .trim()
                .split("\n");


        // Remove headers

        rows.shift();



        // Convert spreadsheet rows into objects

        allRaces =
            rows.map(row => {


                const columns =
                    row.split(",");


                return {

                    raceId:
                        columns[0],

                    round:
                        columns[1],

                    event:
                        columns[2],

                    trackId:
                        columns[3],

                    series:
                        columns[4],

                    date:
                        columns[5],

                    time:
                        columns[6],

                    network:
                        columns[7],

                    notes:
                        columns[8]

                };

            });



        console.log(
            "RACES LOADED:",
            allRaces
        );


        renderHome();

    })


    .catch(error => {


        console.error(
            "Error loading racing schedule:",
            error
        );


        document
            .getElementById(
                "schedule"
            )
            .innerHTML =
            "<p>Unable to load racing schedule.</p>";

    });



// ==========================================
// HOME PAGE
// ==========================================

function renderHome() {


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    const currentYear =
        today.getFullYear();


    const scheduleContainer =
        document.getElementById(
            "schedule"
        );


    scheduleContainer.innerHTML =
        "";



    // Go through user's saved order

    seriesSettings.order.forEach(
        seriesName => {


            // Don't show hidden series

            if (
                seriesSettings.hidden.includes(
                    seriesName
                )
            ) {

                return;

            }



            // Get all races for series

            const seriesRaces =
                allRaces.filter(
                    race =>
                        race.series ===
                        seriesName
                );



            // Only races in current year

            const currentSeasonRaces =
                seriesRaces

                    .filter(
                        race => {


                            const raceDate =
                                new Date(
                                    race.date +
                                    "T12:00:00"
                                );


                            return (
                                raceDate.getFullYear() ===
                                currentYear
                            );

                        }
                    )


                    .sort(
                        (a, b) => {


                            return (

                                new Date(
                                    a.date +
                                    "T12:00:00"
                                )

                                -

                                new Date(
                                    b.date +
                                    "T12:00:00"
                                )

                            );

                        }
                    );



            // Find next race

            const nextRace =
                currentSeasonRaces.find(
                    race => {


                        const raceDate =
                            new Date(
                                race.date +
                                "T12:00:00"
                            );


                        return (
                            raceDate >=
                            today
                        );

                    }
                );



            // Create card

            const raceCard =
                document.createElement(
                    "div"
                );


            raceCard.className =
                "race-card";



            // ==================================
            // APPLY SERIES COLOR
            // ==================================

            const theme =
                seriesThemes[seriesName] || {

                    color:
                        "#888888",

                    glow:
                        "rgba(255, 255, 255, 0.12)"

                };


            raceCard.style.setProperty(

                "--series-color",

                theme.color

            );


            raceCard.style.setProperty(

                "--series-glow",

                theme.glow

            );



            // ==================================
            // UPCOMING RACE
            // ==================================

            if (nextRace) {


                raceCard.innerHTML = `

                    <div class="series-name">

                        ${seriesName}

                    </div>


                    <div class="next-race-label">

                        NEXT RACE

                    </div>


                    <h2 class="event-name">

                        ${nextRace.event}

                    </h2>


                    <p class="race-info">

                        ${formatDate(
                            nextRace.date
                        )}

                    </p>


                    <p class="race-info">

                        ${nextRace.time}

                    </p>


                    ${

                        nextRace.network

                            ?

                            `<p class="race-network">

                                ${nextRace.network}

                            </p>`

                            :

                            ""

                    }


                    ${

                        nextRace.notes

                            ?

                            `<p class="race-notes">

                                ${nextRace.notes}

                            </p>`

                            :

                            ""

                    }

                `;

            }



            // ==================================
            // SEASON COMPLETED
            // ==================================

            else {


                raceCard.classList.add(
                    "season-completed"
                );


                raceCard.innerHTML = `

                    <div class="series-name">

                        ${seriesName}

                    </div>


                    <div class="next-race-label">

                        SEASON STATUS

                    </div>


                    <h2 class="event-name">

                        🏁 Season Completed

                    </h2>


                    <p class="race-info">

                        No more races scheduled
                        for ${currentYear}

                    </p>

                `;

            }



            // Open series calendar

            raceCard.addEventListener(

                "click",

                () => {

                    showSeries(
                        seriesName
                    );

                }

            );



            scheduleContainer.appendChild(
                raceCard
            );

        }

    );

}



// ==========================================
// SERIES CALENDAR
// ==========================================

function showSeries(seriesName) {


    const seriesRaces =

        allRaces

            .filter(

                race =>
                    race.series ===
                    seriesName

            )


            .sort(

                (a, b) =>

                    new Date(
                        a.date +
                        "T12:00:00"
                    )

                    -

                    new Date(
                        b.date +
                        "T12:00:00"
                    )

            );



    const calendarContainer =
        document.getElementById(
            "series-calendar"
        );



    calendarContainer.innerHTML = `

        <h1>

            ${seriesName}

        </h1>


        <p class="calendar-subtitle">

            Full Season Calendar

        </p>

    `;



    if (
        seriesRaces.length === 0
    ) {


        calendarContainer.innerHTML += `

            <p class="no-races-message">

                No races have been added
                to the schedule yet.

            </p>

        `;

    }



    seriesRaces.forEach(
        race => {


            const raceItem =
                document.createElement(
                    "div"
                );


            raceItem.className =
                "calendar-race";



            raceItem.innerHTML = `

                <div class="calendar-date">

                    ${formatDate(
                        race.date
                    )}

                </div>


                <div class="calendar-event">

                    ${race.event}

                </div>


                <div class="calendar-details">

                    Round:
                    ${race.round}

                    <br>

                    Time:
                    ${race.time}


                    ${

                        race.network

                            ?

                            `<br>

                            Network:
                            ${race.network}`

                            :

                            ""

                    }


                    ${

                        race.notes

                            ?

                            `<br>

                            Notes:
                            ${race.notes}`

                            :

                            ""

                    }

                </div>

            `;


            calendarContainer.appendChild(
                raceItem
            );

        }

    );



    document
        .getElementById(
            "home-view"
        )
        .style.display =
        "none";


    document
        .getElementById(
            "series-view"
        )
        .style.display =
        "block";

}



// ==========================================
// BACK BUTTON
// ==========================================

document
    .getElementById(
        "back-button"
    )
    .addEventListener(

        "click",

        () => {


            document
                .getElementById(
                    "series-view"
                )
                .style.display =
                "none";


            document
                .getElementById(
                    "home-view"
                )
                .style.display =
                "block";

        }

    );



// ==========================================
// CUSTOMIZE SERIES
// ==========================================

const customizeButton =
    document.getElementById(
        "customize-button"
    );


const customizeOverlay =
    document.getElementById(
        "customize-overlay"
    );


const closeCustomizeButton =
    document.getElementById(
        "close-customize"
    );


const customizeSeriesList =
    document.getElementById(
        "customize-series-list"
    );


const resetSeriesButton =
    document.getElementById(
        "reset-series"
    );



// OPEN PANEL

customizeButton.addEventListener(

    "click",

    () => {


        renderCustomizePanel();


        customizeOverlay.classList.add(
            "active"
        );

    }

);



// CLOSE PANEL

closeCustomizeButton.addEventListener(

    "click",

    () => {


        customizeOverlay.classList.remove(
            "active"
        );

    }

);



// CLOSE WHEN CLICKING BACKGROUND

customizeOverlay.addEventListener(

    "click",

    event => {


        if (
            event.target ===
            customizeOverlay
        ) {

            customizeOverlay.classList.remove(
                "active"
            );

        }

    }

);



// ==========================================
// RENDER CUSTOMIZE PANEL
// ==========================================

function renderCustomizePanel() {


    customizeSeriesList.innerHTML =
        "";



    seriesSettings.order.forEach(
        seriesName => {


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "customize-series-item";


            item.draggable =
                true;


            item.dataset.series =
                seriesName;



            const isVisible =
                !seriesSettings.hidden.includes(
                    seriesName
                );



            item.innerHTML = `

                <div class="drag-handle">

                    ⠿

                </div>


                <div class="customize-series-name">

                    ${seriesName}

                </div>


                <label class="series-toggle">

                    <input

                        type="checkbox"

                        ${
                            isVisible
                                ? "checked"
                                : ""
                        }

                    >

                    <span>

                        Show

                    </span>

                </label>

            `;



            const checkbox =
                item.querySelector(
                    "input"
                );



            checkbox.addEventListener(

                "change",

                () => {


                    if (
                        checkbox.checked
                    ) {


                        seriesSettings.hidden =
                            seriesSettings.hidden.filter(

                                series =>
                                    series !==
                                    seriesName

                            );

                    }


                    else {


                        if (

                            !seriesSettings.hidden.includes(
                                seriesName
                            )

                        ) {

                            seriesSettings.hidden.push(
                                seriesName
                            );

                        }

                    }



                    saveSeriesSettings();


                    renderHome();

                }

            );



            // DRAG START

            item.addEventListener(

                "dragstart",

                () => {

                    item.classList.add(
                        "dragging"
                    );

                }

            );



            // DRAG END

            item.addEventListener(

                "dragend",

                () => {


                    item.classList.remove(
                        "dragging"
                    );


                    updateSeriesOrderFromDOM();


                    saveSeriesSettings();


                    renderHome();

                }

            );



            customizeSeriesList.appendChild(
                item
            );

        }

    );

}



// ==========================================
// DRAG OVER
// ==========================================

customizeSeriesList.addEventListener(

    "dragover",

    event => {


        event.preventDefault();


        const draggingItem =
            document.querySelector(
                ".dragging"
            );


        if (!draggingItem) {

            return;

        }


        const afterElement =
            getDragAfterElement(

                customizeSeriesList,

                event.clientY

            );



        if (
            afterElement === null
        ) {

            customizeSeriesList.appendChild(
                draggingItem
            );

        }


        else {

            customizeSeriesList.insertBefore(

                draggingItem,

                afterElement

            );

        }

    }

);



// ==========================================
// DRAG POSITION
// ==========================================

function getDragAfterElement(
    container,
    mouseY
) {


    const elements = [

        ...container.querySelectorAll(

            ".customize-series-item:not(.dragging)"

        )

    ];



    let closestElement =
        null;


    let closestOffset =
        Number.NEGATIVE_INFINITY;



    elements.forEach(
        element => {


            const box =
                element.getBoundingClientRect();


            const offset =

                mouseY -

                box.top -

                (
                    box.height / 2
                );



            if (

                offset < 0 &&

                offset > closestOffset

            ) {


                closestOffset =
                    offset;


                closestElement =
                    element;

            }

        }

    );


    return closestElement;

}



// ==========================================
// SAVE ORDER FROM DRAGGED LIST
// ==========================================

function updateSeriesOrderFromDOM() {


    const items = [

        ...customizeSeriesList.querySelectorAll(
            ".customize-series-item"
        )

    ];



    seriesSettings.order =
        items.map(

            item =>
                item.dataset.series

        );

}



// ==========================================
// RESET SERIES
// ==========================================

resetSeriesButton.addEventListener(

    "click",

    () => {


        seriesSettings = {

            order:
                [...defaultSeriesOrder],

            hidden:
                []

        };


        saveSeriesSettings();


        renderCustomizePanel();


        renderHome();

    }

);



// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(
    dateString
) {


    const date =
        new Date(

            dateString +
            "T12:00:00"

        );


    return date.toLocaleDateString(

        "en-US",

        {

            month:
                "short",

            day:
                "numeric",

            year:
                "numeric"

        }

    );

}