// ⚠ API key is public in source — rotate it and restrict it on the LocationIQ dashboard
const LOCATIONIQ_KEY = "pk.87af3e484cd7098e3c3e7207385f3242";
const HOUR_DISPLAY_GAP_MS = 60_000;

const planetOfDays = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

const symbols = {
  Sun:     "<img class='svg' src='./src/img/Sol.svg' alt='Sun'>",
  Moon:    "<img class='svg' src='./src/img/Lua.svg' alt='Moon'>",
  Mars:    "<img class='svg' src='./src/img/Marte.svg' alt='Mars'>",
  Mercury: "<img class='svg' src='./src/img/Mercurio.svg' alt='Mercury'>",
  Jupiter: "<img class='svg' src='./src/img/Jupiter.svg' alt='Jupiter'>",
  Venus:   "<img class='svg' src='./src/img/Venus.svg' alt='Venus'>",
  Saturn:  "<img class='svg' src='./src/img/Saturno.svg' alt='Saturn'>",
};

const hourSequenceOfDay = {
  Sun:     ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"],
  Moon:    ["Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury"],
  Mars:    ["Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter"],
  Mercury: ["Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus"],
  Jupiter: ["Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn"],
  Venus:   ["Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun"],
  Saturn:  ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"],
};

const fieldTown   = document.getElementById("town");
const fieldPlanet = document.getElementById("planet");
const fieldDate   = document.getElementById("date");
const fieldStatus = document.getElementById("status");

let currentRequestId = 0;

fieldDate.value = dateObjToStr(new Date());
fieldDate.addEventListener("change", (e) => getAllAsyncStuff(dateStrToObj(e.target.value)));

document.querySelectorAll(".tablinks").forEach((btn) =>
  btn.addEventListener("click", (e) => openTab(e, btn.getAttribute("aria-controls")))
);
document.getElementById("defaultOpen").click();

getAllAsyncStuff(new Date());

// ─── async orchestration ─────────────────────────────────────────────────────

async function getAllAsyncStuff(date) {
  const requestId = ++currentRequestId;

  setStatus("Detecting location…");

  let lat, lng;
  try {
    [lat, lng] = await getCoords();
  } catch {
    setStatus("Location access denied. Please allow location permission and reload.", true);
    return;
  }

  if (requestId !== currentRequestId) return;

  setStatus("Loading planetary hours…");

  try {
    const planet = calculatePlanetOfDay(date);
    const [[sunRise, sunSet, sunRiseNext], town] = await Promise.all([
      getSunHours(lat, lng, date),
      getTown(lat, lng),
    ]);

    if (requestId !== currentRequestId) return;

    fieldPlanet.textContent = planet;
    fieldTown.textContent   = town;

    const [dayDuration, nightDuration] = calculateHoursOfDay(sunRise, sunSet, sunRiseNext);
    populateTables(sunRise, sunSet, dayDuration, nightDuration, hourSequenceOfDay[planet]);
    setStatus("");
  } catch {
    if (requestId !== currentRequestId) return;
    setStatus("Failed to load planetary hours. Check your connection and try again.", true);
  }
}

// ─── API helpers ─────────────────────────────────────────────────────────────

function getLocationFromBrowser() {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    })
  );
}

async function getCoords() {
  const pos = await getLocationFromBrowser();
  return [pos.coords.latitude.toString(), pos.coords.longitude.toString()];
}

async function getTown(lat, lng) {
  const url = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lng}&format=json`;
  const response = await fetch(url);
  const { address } = await response.json();
  return address.city ?? address.town ?? address.state ?? "Unknown location";
}

async function getSunHours(lat, lng, date) {
  const today    = dateObjToStr(date);
  const tomorrow = dateObjToStr(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));

  const fetchDay = (d) =>
    fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${d}&formatted=0`)
      .then((r) => r.json());

  const [todayData, tomorrowData] = await Promise.all([fetchDay(today), fetchDay(tomorrow)]);

  return [
    Date.parse(todayData.results.sunrise),
    Date.parse(todayData.results.sunset),
    Date.parse(tomorrowData.results.sunrise),
  ];
}

// ─── calculations ────────────────────────────────────────────────────────────

function calculatePlanetOfDay(date) {
  return planetOfDays[date.getDay()];
}

function calculateHoursOfDay(sunRise, sunSet, sunRiseNext) {
  return [(sunSet - sunRise) / 12, (sunRiseNext - sunSet) / 12];
}

// ─── DOM rendering ───────────────────────────────────────────────────────────

function populateTables(sunRise, sunSet, dayDuration, nightDuration, hourSequence) {
  const dayFrag   = document.createDocumentFragment();
  const nightFrag = document.createDocumentFragment();
  const now = Date.now();
  let currentIsNight = false;

  for (let hour = 0; hour < 24; hour++) {
    const isDay    = hour < 12;
    const planet   = hourSequence[hour % 7];
    const hourNum  = isDay ? hour + 1 : (hour % 12) + 1;
    const base     = isDay ? sunRise + hour * dayDuration : sunSet + (hour % 12) * nightDuration;
    const duration = isDay ? dayDuration : nightDuration;

    const isCurrent = now >= base && now < base + duration;
    if (isCurrent && !isDay) currentIsNight = true;

    const row = buildRow(hourNum, timeFromMs(base), planet, symbols[planet], timeFromMs(base + duration - HOUR_DISPLAY_GAP_MS), isCurrent);
    (isDay ? dayFrag : nightFrag).appendChild(row);
  }

  const tableDay   = document.getElementById("tableDay");
  const tableNight = document.getElementById("tableNight");
  tableDay.innerHTML   = "";
  tableNight.innerHTML = "";
  tableDay.appendChild(dayFrag);
  tableNight.appendChild(nightFrag);

  if (currentIsNight) {
    document.querySelector('.tablinks[aria-controls="nightHours"]').click();
  }
}

function buildRow(hourNum, initTime, planet, symbol, endTime, isCurrent = false) {
  const row = document.createElement("tr");
  if (isCurrent) row.classList.add("current-hour");
  appendCell(row, hourNum, "bold");
  appendCell(row, initTime);
  appendCell(row, planet, isCurrent ? "current-planet" : null);
  appendCell(row, symbol, isCurrent ? "bold current-planet" : "bold", true);
  appendCell(row, endTime);
  return row;
}

function appendCell(row, content, className, isHtml = false) {
  const td = document.createElement("td");
  if (isHtml) td.innerHTML = content;
  else td.textContent = content;
  if (className) className.split(" ").forEach((c) => td.classList.add(c));
  row.appendChild(td);
}

function timeFromMs(ms) {
  const d = new Date(ms);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function setStatus(message, isError = false) {
  fieldStatus.textContent = message;
  fieldStatus.className   = "status" + (isError ? " status--error" : "");
}

// ─── UI interaction ──────────────────────────────────────────────────────────

function dateObjToStr(date) {
  return date.toLocaleDateString("en-CA");
}

function dateStrToObj(dateStr) {
  return new Date(dateStr + "T00:00");
}

function openTab(event, tabName) {
  document.querySelectorAll(".tabcontent").forEach((el) => (el.style.display = "none"));
  document.querySelectorAll(".tablinks").forEach((btn) => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
  });
  document.getElementById(tabName).style.display = "block";
  event.currentTarget.classList.add("active");
  event.currentTarget.setAttribute("aria-selected", "true");
}
