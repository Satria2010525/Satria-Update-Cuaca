
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const message = document.getElementById("message");
const weatherContent = document.getElementById("weather-content");

const weatherCodes = {
  0: ["Cerah", "☀️"],
  1: ["Cerah berawan", "🌤️"],
  2: ["Berawan sebagian", "⛅"],
  3: ["Berawan", "☁️"],
  45: ["Berkabut", "🌫️"],
  48: ["Kabut tebal", "🌫️"],
  51: ["Gerimis ringan", "🌦️"],
  53: ["Gerimis", "🌦️"],
  55: ["Gerimis lebat", "🌧️"],
  61: ["Hujan ringan", "🌦️"],
  63: ["Hujan sedang", "🌧️"],
  65: ["Hujan lebat", "🌧️"],
  71: ["Salju ringan", "🌨️"],
  73: ["Salju sedang", "🌨️"],
  75: ["Salju lebat", "❄️"],
  80: ["Hujan lokal", "🌦️"],
  81: ["Hujan lokal sedang", "🌧️"],
  82: ["Hujan lokal lebat", "⛈️"],
  95: ["Badai petir", "⛈️"],
  96: ["Badai petir dan hujan es", "⛈️"],
  99: ["Badai petir kuat", "⛈️"]
};

function describeWeather(code) {
  return weatherCodes[code] || ["Kondisi tidak diketahui", "🌡️"];
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function formatDay(dateString, options = { weekday: "long" }) {
  return new Intl.DateTimeFormat("id-ID", options)
    .format(new Date(`${dateString}T12:00:00`));
}

function formatHour(dateString) {
  return dateString.slice(11, 16);
}

async function findCity(city) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: city,
    count: "1",
    language: "id",
    format: "json"
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error("Tidak dapat mencari lokasi.");

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error("Kota tidak ditemukan. Periksa ejaan nama kota.");
  }

  return data.results[0];
}

async function fetchWeather(location) {
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude
  });

  // Permintaan prakiraan cuaca diproses oleh backend Python.
  const response = await fetch(`/api/weather?${params}`);

  if (!response.ok) {
    throw new Error("Gagal mengambil data cuaca dari server.");
  }

  return response.json();
}

function renderCurrent(location, data) {
  const current = data.current;
  const [description, icon] = describeWeather(current.weather_code);

  document.getElementById("city-name").textContent =
    [location.name, location.admin1, location.country]
      .filter(Boolean)
      .join(", ");

  document.getElementById("local-date").textContent =
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "full",
      timeStyle: "short"
    }).format(new Date(current.time));

  document.getElementById("weather-icon").textContent = icon;
  document.getElementById("temperature").textContent =
    `${Math.round(current.temperature_2m)}°`;

  document.getElementById("weather-description").textContent = description;
  document.getElementById("feels-like").textContent =
    `${Math.round(current.apparent_temperature)}°C`;

  document.getElementById("humidity").textContent =
    `${current.relative_humidity_2m}%`;

  document.getElementById("wind").textContent =
    `${Math.round(current.wind_speed_10m)} km/j`;

  document.getElementById("rain").textContent =
    `${current.precipitation_probability ?? 0}%`;
}

function renderHourly(data) {
  const container = document.getElementById("hourly-list");
  const hourly = data.hourly;
  const currentTime = data.current.time;
  const startIndex = hourly.time.findIndex(time => time >= currentTime);
  const start = Math.max(0, startIndex);

  container.replaceChildren();

  hourly.time.slice(start, start + 6).forEach((time, offset) => {
    const index = start + offset;
    const [description, icon] = describeWeather(hourly.weather_code[index]);

    const card = document.createElement("article");
    card.className = "hour-card";

    const timeLabel = document.createElement("p");
    timeLabel.textContent = offset === 0 ? "Sekarang" : formatHour(time);

    const iconLabel = document.createElement("div");
    iconLabel.className = "hour-icon";
    iconLabel.textContent = icon;
    iconLabel.title = description;

    const temp = document.createElement("strong");
    temp.textContent = `${Math.round(hourly.temperature_2m[index])}°`;

    card.append(timeLabel, iconLabel, temp);
    container.append(card);
  });
}

function renderDaily(data) {
  const container = document.getElementById("daily-list");
  const daily = data.daily;

  container.replaceChildren();

  daily.time.forEach((date, index) => {
    const [description, icon] = describeWeather(daily.weather_code[index]);

    const row = document.createElement("article");
    row.className = "day-row";

    const name = document.createElement("span");
    name.className = "day-name";
    name.textContent = index === 0 ? "Hari ini" : formatDay(date);

    const weatherIcon = document.createElement("span");
    weatherIcon.className = "day-icon";
    weatherIcon.textContent = icon;
    weatherIcon.title = description;

    const desc = document.createElement("span");
    desc.className = "day-description";
    desc.textContent = description;

    const temperatures = document.createElement("span");
    temperatures.className = "day-temperatures";
    temperatures.textContent =
      `${Math.round(daily.temperature_2m_max[index])}°`;

    const min = document.createElement("span");
    min.textContent = `${Math.round(daily.temperature_2m_min[index])}°`;
    temperatures.append(min);

    row.append(name, weatherIcon, desc, temperatures);
    container.append(row);
  });
}

async function loadCity(cityName) {
  searchButton.disabled = true;
  searchButton.textContent = "Memuat...";
  showMessage("Sedang mengambil data cuaca...");
  weatherContent.hidden = true;

  try {
    const location = await findCity(cityName);
    const data = await fetchWeather(location);

    if (!data.current || !data.hourly || !data.daily) {
      throw new Error("Format data cuaca tidak sesuai.");
    }

    renderCurrent(location, data);
    renderHourly(data);
    renderDaily(data);

    weatherContent.hidden = false;
    showMessage("Data cuaca berhasil diperbarui.");
  } catch (error) {
    showMessage(error.message || "Terjadi kesalahan. Coba lagi.", true);
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Cari Cuaca";
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const city = cityInput.value.trim();
  if (city) loadCity(city);
});

loadCity("Semarang");
