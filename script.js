const offset = new Date().getTimezoneOffset();
const planetOfDays = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

const hourSequenceOfDay = {
  Sun: ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"],
  Moon: ["Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury"],
  Mars: ["Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter"],
  Mercury: ["Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus"],
  Jupiter: ["Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Saturn"],
  Venus: ["Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars", "Sun"],
  Saturn: ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"],
};
const fieldCity = document.getElementById("city");
const fieldPlanet = document.getElementById("planet");
const fieldDate = document.getElementById("date");

let date = new Date();
fieldDate.value = dateObjToStr(date);

getAllAsyncStuff(date);

// sart of async stuff
async function getAllAsyncStuff(date) {
  const [lat, lng] = await getCoords();

  const city = await getCity(lat, lng);
  fieldCity.innerHTML = city;

  const planet = await calculatePlanetOfDay(date);
  fieldPlanet.innerHTML = planet;

  const [sunRise, sunSet, sunRiseNext] = await getSunHours(lat, lng, date);
  console.log("teste", sunRise, sunSet, sunRiseNext); ////////////teste
  await calculateHoursOfDay(sunRise, sunSet, sunRiseNext);
} //end of async stuff

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

async function getCity(lat, lng) {
  const TKN = "pk.5af2e80a21ef4a01e99b93d01a25dcc1";
  const url = `https://us1.locationiq.com/v1/reverse.php?key=${TKN}&lat=${lat}&lon=${lng}&format=json`;
  const response = await fetch(url);
  const locationData = await response.json();
  const city = locationData.address.city;
  return city;
}

async function getSunHours(lat, lng, date) {
  let dateObjNext = new Date();
  dateObjNext.setDate(date.getDate() + 1);
  const dateStrNext = dateObjToStr(dateObjNext);
  let dateUrl = dateObjToStr(date);
  url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateUrl}&formatted=0`;
  const response = await fetch(url);
  const sunData = await response.json();
  const sunRise = sunData.results.sunrise;
  const sunSet = sunData.results.sunset;

  dateUrl = dateStrNext;
  const responseNext = await fetch(url);
  const sunDataNext = await responseNext.json();
  const sunRiseNext = sunDataNext.results.sunrise;

  return [sunRise, sunSet, sunRiseNext];
}

function calculatePlanetOfDay(date) {
  const dayOfWeek = date.getDay();
  const planet = planetOfDays[dayOfWeek];
  return planet;
}

function calculateHoursOfDay(sunRise, sunSet, sunRiseNext) {
  // const hourSequence = hourSequenceOfDay[planetOfDay[dayOfWeek]];
  // for (let hour = 0; hour < 24; hour++) {
  //   let index = hour % 7;
  //   if (hour < 6) {
  //     console.log("tabela 1", hour + 1, hourSequence[index]);
  //   } else if (hour < 12) {
  //     console.log("tabela 2", hour + 1, hourSequence[index]);
  //   } else if (hour < 18) {
  //     console.log("tabela 3", hour + 1, hourSequence[index]);
  //   } else {
  //     console.log("tabela 4", hour + 1, hourSequence[index]);
  //   }
  // }
}

function newDate(dateStr) {
  getAllAsyncStuff(dateStrToObj(dateStr));
}
