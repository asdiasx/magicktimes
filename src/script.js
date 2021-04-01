const planetOfDays = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

const symbols = {
  Sun: "<img class='svg' src='./src/img/Sol.svg'></img>",
  Moon: "<img class='svg' src='./src/img/Lua.svg'></img>",
  Mars: "<img class='svg' src='./src/img/Marte.svg'></img>",
  Mercury: "<img class='svg' src='./src/img/Mercurio.svg'></img>",
  Jupiter: "<img class='svg' src='./src/img/Jupiter.svg'></img>",
  Venus: "<img class='svg' src='./src/img/Venus.svg'></img>",
  Saturn: "<img class='svg' src='./src/img/Saturno.svg'></img>",
};

const hourSequenceOfDay = {
  Sun: ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"],
  Moon: ["Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury"],
  Mars: ["Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter"],
  Mercury: ["Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus"],
  Jupiter: ["Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn"],
  Venus: ["Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun"],
  Saturn: ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"],
};

const fieldTown = document.getElementById("town");
const fieldPlanet = document.getElementById("planet");
const fieldDate = document.getElementById("date");

let date = new Date();
fieldDate.value = dateObjToStr(date);

getAllAsyncStuff(date);
document.getElementById("defaultOpen").click();

//////////////////////////////////////////////////////////////////////////////////////////////////////
// sart of async stuff
async function getAllAsyncStuff(date) {
  const planet = calculatePlanetOfDay(date);
  fieldPlanet.innerHTML = planet;

  const [lat, lng] = await getCoords();

  const town = getTown(lat, lng);

  const [sunRise, sunSet, sunRiseNext] = await getSunHours(lat, lng, date);
  const [dayHourDuration, nightHourDuration] = calculateHoursOfDay(sunRise, sunSet, sunRiseNext);

  fieldTown.innerHTML = await town;

  const hourSequence = hourSequenceOfDay[planet];
  populateTables(sunRise, sunSet, dayHourDuration, nightHourDuration, hourSequence);
}
//end of async stuff
//////////////////////////////////////////////////////////////////////////////////////////////////////

// functions definitions
function dateObjToStr(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0"); //January is 0!
  const yyyy = dateObj.getFullYear();
  const dateStr = yyyy + "-" + mm + "-" + dd;
  return dateStr;
}

function dateStrToObj(dateStr) {
  const dateObj = new Date(dateStr + "T00:00");
  return dateObj;
}

async function getCoords() {
  const pos = await getLocationFromBrowser();
  const lat = pos.coords.latitude.toString();
  const lng = pos.coords.longitude.toString();
  return [lat, lng];
}

function getLocationFromBrowser() {
  const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  };
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
}

async function getTown(lat, lng) {
  const TKN = "pk.477b428ec8c1457679a304cf002e632c";
  const url = `https://us1.locationiq.com/v1/reverse.php?key=${TKN}&lat=${lat}&lon=${lng}&format=json`;
  const response = await fetch(url);
  const locationData = await response.json();
  const suburb = locationData.address.suburb;
  const town = locationData.address.town;
  const city = locationData.address.city;
  const state = locationData.address.state;
  if (city != undefined) {
    return city;
  } else if (town != undefined) {
    return town;
  } else if (state != undefined) {
    return state;
  } else {
    return "location error";
  }
}

async function getSunHours(lat, lng, date) {
  let sunRise, sunSet, sunRiseNext;
  let dateObjNext = new Date(date);
  dateObjNext.setDate(date.getDate() + 1);
  let dateAndNext = [dateObjToStr(date), dateObjToStr(dateObjNext)];

  for (let day = 0; day < 2; day++) {
    let dateUrl = dateAndNext[day];
    let url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateUrl}&formatted=0`;
    const response = await fetch(url);
    const sunData = await response.json();
    if (day == 1) {
      sunRiseNext = Date.parse(sunData.results.sunrise);
    } else {
      sunRise = Date.parse(sunData.results.sunrise);
      sunSet = Date.parse(sunData.results.sunset);
    }
  }
  return [sunRise, sunSet, sunRiseNext];
}

function calculatePlanetOfDay(date) {
  const dayOfWeek = date.getDay();
  const planet = planetOfDays[dayOfWeek];
  return planet;
}

function calculateHoursOfDay(sunRise, sunSet, sunRiseNext) {
  const dayHourDuration = (sunSet - sunRise) / 12;
  const nightHourDuration = (sunRiseNext - sunSet) / 12;
  return [dayHourDuration, nightHourDuration];
}

function populateTables(sunRise, sunSet, dayHourDuration, nightHourDuration, hourSequence) {
  let table, hourNumber, planet, symbol, initHour, endHour;

  const tableContents = document.getElementsByTagName("tbody");
  for (let tbl = 0; tbl < tableContents.length; tbl++) {
    tableContents[tbl].innerHTML = "";
  }

  for (let hour = 0; hour < 24; hour++) {
    let index = hour % 7;

    if (hour < 12) {
      table = "tableDay";
      hourNumber = hour + 1;
      planet = hourSequence[index];
      symbol = symbols[planet];
      initHour = timeFromMiliSec(sunRise + hour * dayHourDuration);
      endHour = timeFromMiliSec(sunRise + hour * dayHourDuration + (dayHourDuration - 60000));
    } else {
      table = "tableNight";
      hourNumber = (hour % 12) + 1;
      planet = hourSequence[index];
      symbol = symbols[planet];
      initHour = timeFromMiliSec(sunSet + (hour % 12) * nightHourDuration);
      endHour = timeFromMiliSec(sunSet + (hour % 12) * nightHourDuration + (nightHourDuration - 60000));
    }
    let tableRow = document.createElement("tr");

    createRowElement(tableRow, hourNumber, "bold");
    createRowElement(tableRow, initHour, null);
    createRowElement(tableRow, planet, null);
    createRowElement(tableRow, symbol, "bold");
    createRowElement(tableRow, endHour, null);

    document.getElementById(table).appendChild(tableRow);
  }
}
function createRowElement(tableRow, elementContent, elementClass) {
  tableCell = document.createElement("td");
  tableCell.innerHTML = elementContent;
  tableCell.classList.add(elementClass);
  tableRow.appendChild(tableCell);
}

function timeFromMiliSec(miliSeconds) {
  const date = new Date(miliSeconds);
  const hours = String(date.getHours());
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const time = `${hours}:${minutes}`;
  return time;
}

function newDate(dateStr) {
  getAllAsyncStuff(dateStrToObj(dateStr));
}

function openTab(event, tabName) {
  let i, tabcontent, tablinks;

  tablinks = document.getElementsByClassName("tablinks");
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tablinks.length; i++) {
    tabcontent[i].style.display = "none";
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  document.getElementById(tabName).style.display = "block";
  event.currentTarget.className += " active";
}
