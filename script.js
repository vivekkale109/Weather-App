// Replace with your OpenWeatherMap API key.
const API_KEY = "YOUR_OPENWEATHERMAP_API_KEY";
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const ICON_URL = "https://openweathermap.org/img/wn";

const weatherForm = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const statusMessage = document.getElementById("statusMessage");
const currentWeather = document.getElementById("currentWeather");
const forecastSection = document.getElementById("forecastSection");
const forecastList = document.getElementById("forecastList");
const geoButton = document.getElementById("geoButton");
const themeToggle = document.getElementById("themeToggle");

const cityNameEl = document.getElementById("cityName");
const weatherConditionEl = document.getElementById("weatherCondition");
const temperatureEl = document.getElementById("temperature");
const humidityEl = document.getElementById("humidity");
const windSpeedEl = document.getElementById("windSpeed");
const weatherIconEl = document.getElementById("weatherIcon");

const formatDay = (dateText) =>
  new Date(dateText).toLocaleDateString(undefined, {
    weekday: "short",
  });

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function iconFor(iconCode) {
  return `${ICON_URL}/${iconCode}@2x.png`;
}

function renderCurrentWeather(data) {
  const { name, main, weather, wind } = data;
  const current = weather?.[0] ?? { description: "Unknown", icon: "01d" };

  cityNameEl.textContent = name;
  weatherConditionEl.textContent = current.description;
  temperatureEl.textContent = `${Math.round(main.temp)}\u00B0C`;
  humidityEl.textContent = `${main.humidity}%`;
  windSpeedEl.textContent = `${wind.speed.toFixed(1)} m/s`;
  weatherIconEl.src = iconFor(current.icon);
  weatherIconEl.alt = `${current.description} icon`;

  currentWeather.classList.remove("hidden");
}

function renderForecast(data) {
  const dailySnapshots = data.list
    .filter((item) => item.dt_txt.includes("12:00:00"))
    .slice(0, 5);

  forecastList.innerHTML = "";

  dailySnapshots.forEach((item) => {
    const iconCode = item.weather?.[0]?.icon ?? "01d";
    const condition = item.weather?.[0]?.main ?? "-";

    const card = document.createElement("article");
    card.className = "forecast-item";
    card.innerHTML = `
      <p>${formatDay(item.dt_txt)}</p>
      <img src="${iconFor(iconCode)}" alt="${condition} icon" />
      <p><strong>${Math.round(item.main.temp)}\u00B0C</strong></p>
      <p>${condition}</p>
    `;

    forecastList.appendChild(card);
  });

  forecastSection.classList.toggle("hidden", dailySnapshots.length === 0);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.message || "Unable to fetch weather data.";
    throw new Error(message);
  }
  return response.json();
}

async function getWeatherByCity(city) {
  const currentUrl = `${BASE_URL}/weather?q=${encodeURIComponent(
    city
  )}&appid=${API_KEY}&units=metric`;

  const currentData = await fetchJson(currentUrl);

  const forecastUrl = `${BASE_URL}/forecast?lat=${currentData.coord.lat}&lon=${
    currentData.coord.lon
  }&appid=${API_KEY}&units=metric`;

  const forecastData = await fetchJson(forecastUrl);
  return { currentData, forecastData };
}

async function getWeatherByCoords(lat, lon) {
  const currentUrl = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const currentData = await fetchJson(currentUrl);

  const forecastUrl = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const forecastData = await fetchJson(forecastUrl);

  return { currentData, forecastData };
}

async function loadWeatherByCity(city) {
  if (!API_KEY || API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") {
    setStatus("Add your OpenWeatherMap API key in script.js before running.", true);
    return;
  }

  setStatus("Fetching weather...");
  try {
    const { currentData, forecastData } = await getWeatherByCity(city);
    renderCurrentWeather(currentData);
    renderForecast(forecastData);
    setStatus(`Updated for ${currentData.name}.`);
  } catch (error) {
    currentWeather.classList.add("hidden");
    forecastSection.classList.add("hidden");
    const message = /city not found/i.test(error.message)
      ? "City not found. Try a valid city name."
      : `Error: ${error.message}`;
    setStatus(message, true);
  }
}

async function loadWeatherByLocation() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported by your browser.", true);
    return;
  }

  if (!API_KEY || API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") {
    setStatus("Add your OpenWeatherMap API key in script.js before running.", true);
    return;
  }

  setStatus("Fetching your location...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const { currentData, forecastData } = await getWeatherByCoords(latitude, longitude);
        renderCurrentWeather(currentData);
        renderForecast(forecastData);
        setStatus(`Updated for ${currentData.name}.`);
      } catch (error) {
        setStatus(`Error: ${error.message}`, true);
      }
    },
    (error) => {
      setStatus(`Location access failed: ${error.message}`, true);
    }
  );
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem("weatherTheme") || "light";
  document.body.classList.toggle("dark", savedTheme === "dark");
}

weatherForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (!city) {
    setStatus("Please enter a city name.", true);
    return;
  }

  await loadWeatherByCity(city);
});

geoButton.addEventListener("click", loadWeatherByLocation);

themeToggle.addEventListener("click", () => {
  const darkMode = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", darkMode);
  localStorage.setItem("weatherTheme", darkMode ? "dark" : "light");
});

applySavedTheme();
setStatus("Search for a city or use your location.");
