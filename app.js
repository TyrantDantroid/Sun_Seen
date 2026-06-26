import { customPreset, presets } from "./capitals.js";

const fallbackTimezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Jerusalem",
  "Asia/Tokyo",
  "Australia/Sydney"
];

const state = {
  view: "day",
  selectedDate: startOfDay(new Date()),
  location: { ...presets[0] }
};

const els = {
  applyCoordinatesButton: document.querySelector("#applyCoordinatesButton"),
  calendarGrid: document.querySelector("#calendarGrid"),
  dateInput: document.querySelector("#dateInput"),
  installButton: document.querySelector("#installButton"),
  latitudeInput: document.querySelector("#latitudeInput"),
  locationForm: document.querySelector("#locationForm"),
  locationLabel: document.querySelector("#locationLabel"),
  longitudeInput: document.querySelector("#longitudeInput"),
  nextButton: document.querySelector("#nextButton"),
  presetSelect: document.querySelector("#presetSelect"),
  prevButton: document.querySelector("#prevButton"),
  rangeTitle: document.querySelector("#rangeTitle"),
  summaryDaylight: document.querySelector("#summaryDaylight"),
  summarySunrise: document.querySelector("#summarySunrise"),
  summarySunset: document.querySelector("#summarySunset"),
  timezoneSelect: document.querySelector("#timezoneSelect"),
  todayButton: document.querySelector("#todayButton")
};

let installPrompt = null;

init();

function init() {
  hydrateSavedState();
  renderPresetOptions();
  renderTimezoneOptions();
  syncInputs();
  bindEvents();
  registerServiceWorker();
  render();
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      persistState();
      render();
    });
  });

  els.dateInput.addEventListener("change", () => {
    state.selectedDate = parseLocalDate(els.dateInput.value);
    persistState();
    render();
  });

  els.prevButton.addEventListener("click", () => movePeriod(-1));
  els.nextButton.addEventListener("click", () => movePeriod(1));
  els.todayButton.addEventListener("click", () => {
    state.selectedDate = startOfDay(new Date());
    persistState();
    render();
  });

  els.presetSelect.addEventListener("change", () => {
    const preset = els.presetSelect.value === "custom" ? customPreset : presets[Number(els.presetSelect.value)];
    state.location = { ...preset };
    syncInputs();
    persistState();
    render();
  });

  els.locationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    applyCoordinates();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    els.installButton.classList.remove("hidden");
  });

  els.installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    els.installButton.classList.add("hidden");
  });
}

function applyCoordinates() {
  const latitude = Number(els.latitudeInput.value);
  const longitude = Number(els.longitudeInput.value);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    els.latitudeInput.setCustomValidity("Enter a latitude from -90 to 90.");
    els.latitudeInput.reportValidity();
    els.latitudeInput.setCustomValidity("");
    return;
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    els.longitudeInput.setCustomValidity("Enter a longitude from -180 to 180.");
    els.longitudeInput.reportValidity();
    els.longitudeInput.setCustomValidity("");
    return;
  }

  state.location = {
    name: "Custom Location",
    latitude,
    longitude,
    timezone: els.timezoneSelect.value
  };
  els.presetSelect.value = "custom";
  persistState();
  render();
  els.applyCoordinatesButton.textContent = "Applied";
  window.setTimeout(() => {
    els.applyCoordinatesButton.textContent = "Apply Coordinates";
  }, 1200);
}

function renderPresetOptions() {
  els.presetSelect.innerHTML = presets
    .map((preset, index) => `<option value="${index}">${preset.name}</option>`)
    .join("");
  els.presetSelect.insertAdjacentHTML("beforeend", '<option value="custom">Custom Location</option>');
}

function renderTimezoneOptions() {
  const zones = getSupportedTimezones();
  els.timezoneSelect.innerHTML = zones.map((zone) => `<option value="${zone}">${zone}</option>`).join("");
}

function getSupportedTimezones() {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }
  return fallbackTimezones;
}

function syncInputs() {
  const presetIndex = presets.findIndex(
    (preset) =>
      preset.name === state.location.name &&
      preset.latitude === state.location.latitude &&
      preset.longitude === state.location.longitude &&
      preset.timezone === state.location.timezone
  );
  els.presetSelect.value = presetIndex >= 0 ? String(presetIndex) : "custom";
  els.latitudeInput.value = state.location.latitude.toFixed(4);
  els.longitudeInput.value = state.location.longitude.toFixed(4);

  if (![...els.timezoneSelect.options].some((option) => option.value === state.location.timezone)) {
    const option = document.createElement("option");
    option.value = state.location.timezone;
    option.textContent = state.location.timezone;
    els.timezoneSelect.append(option);
  }
  els.timezoneSelect.value = state.location.timezone;
  els.dateInput.value = toInputDate(state.selectedDate);
}

function render() {
  syncInputs();
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });

  const days = getVisibleDays();
  const selectedSun = getSunInfo(state.selectedDate, state.location);
  els.locationLabel.textContent = `${state.location.name} · ${formatCoordinate(state.location.latitude, "N", "S")}, ${formatCoordinate(state.location.longitude, "E", "W")}`;
  els.rangeTitle.textContent = getRangeTitle(days);
  els.summarySunrise.textContent = selectedSun.sunrise;
  els.summarySunset.textContent = selectedSun.sunset;
  els.summaryDaylight.textContent = selectedSun.daylight;

  els.calendarGrid.className = `calendar-grid ${state.view}`;
  els.calendarGrid.innerHTML = state.view === "month" ? renderWeekdayHeaders() : "";
  els.calendarGrid.insertAdjacentHTML("beforeend", days.map(renderDayCard).join(""));
}

function renderWeekdayHeaders() {
  return `
    <div class="weekday-row">
      ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<div class="weekday">${day}</div>`).join("")}
    </div>
  `;
}

function renderDayCard(day) {
  const sun = getSunInfo(day.date, state.location);
  const isCompact = state.view === "month";
  const isToday = sameDate(day.date, new Date());
  const dateLabel = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(day.date);

  return `
    <article class="day-card ${isCompact ? "compact" : ""} ${day.inMonth === false ? "muted" : ""} ${isToday ? "today" : ""}">
      <div class="day-head">
        <div class="date-number">
          <strong>${day.date.getDate()}</strong>
          <span>${dateLabel}</span>
        </div>
        ${isToday ? '<span class="day-badge">Today</span>' : ""}
      </div>
      <div class="sun-facts">
        ${fact("Sunrise", sun.sunrise)}
        ${fact("Sunset", sun.sunset)}
        ${fact("Solar noon", sun.solarNoon, "optional")}
        ${fact("Daylight", sun.daylight)}
        ${fact("Night", sun.night, "optional")}
      </div>
    </article>
  `;
}

function fact(label, value, className = "") {
  return `<div class="fact ${className}"><span>${label}</span><strong>${value}</strong></div>`;
}

function getVisibleDays() {
  if (state.view === "day") {
    return [{ date: state.selectedDate, inMonth: true }];
  }

  if (state.view === "week") {
    const start = addDays(state.selectedDate, -state.selectedDate.getDay());
    return Array.from({ length: 7 }, (_, index) => ({ date: addDays(start, index), inMonth: true }));
  }

  const monthStart = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return { date, inMonth: date.getMonth() === state.selectedDate.getMonth() };
  });
}

function getRangeTitle(days) {
  const dateFormatter = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" });
  if (state.view === "day") return dateFormatter.format(days[0].date);
  if (state.view === "week") {
    return `${dateFormatter.format(days[0].date)} - ${dateFormatter.format(days[days.length - 1].date)}`;
  }
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(state.selectedDate);
}

function movePeriod(direction) {
  if (state.view === "day") state.selectedDate = addDays(state.selectedDate, direction);
  if (state.view === "week") state.selectedDate = addDays(state.selectedDate, direction * 7);
  if (state.view === "month") {
    state.selectedDate = new Date(
      state.selectedDate.getFullYear(),
      state.selectedDate.getMonth() + direction,
      Math.min(state.selectedDate.getDate(), 28)
    );
  }
  persistState();
  render();
}

function getSunInfo(date, location) {
  const sunriseDate = calculateSunEvent(date, location, true);
  const sunsetDate = calculateSunEvent(date, location, false);
  const solarNoonDate = new Date((sunriseDate.getTime() + sunsetDate.getTime()) / 2);
  const daylightMinutes = Math.max(0, Math.round((sunsetDate - sunriseDate) / 60000));
  const nightMinutes = 1440 - daylightMinutes;

  return {
    sunrise: formatTime(sunriseDate, location.timezone),
    sunset: formatTime(sunsetDate, location.timezone),
    solarNoon: formatTime(solarNoonDate, location.timezone),
    daylight: formatDuration(daylightMinutes),
    night: formatDuration(nightMinutes)
  };
}

function calculateSunEvent(date, location, isSunrise) {
  const zenith = 90.833;
  const dayOfYear = getDayOfYear(date);
  const lngHour = location.longitude / 15;
  const approxTime = dayOfYear + ((isSunrise ? 6 : 18) - lngHour) / 24;
  const meanAnomaly = 0.9856 * approxTime - 3.289;
  let trueLongitude =
    meanAnomaly +
    1.916 * Math.sin(toRadians(meanAnomaly)) +
    0.02 * Math.sin(toRadians(2 * meanAnomaly)) +
    282.634;
  trueLongitude = normalizeDegrees(trueLongitude);

  let rightAscension = toDegrees(Math.atan(0.91764 * Math.tan(toRadians(trueLongitude))));
  rightAscension = normalizeDegrees(rightAscension);
  rightAscension += Math.floor(trueLongitude / 90) * 90 - Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;

  const sinDeclination = 0.39782 * Math.sin(toRadians(trueLongitude));
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHour =
    (Math.cos(toRadians(zenith)) - sinDeclination * Math.sin(toRadians(location.latitude))) /
    (cosDeclination * Math.cos(toRadians(location.latitude)));

  if (cosHour > 1 || cosHour < -1) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), isSunrise ? 6 : 18));
  }

  const hourAngle = isSunrise ? 360 - toDegrees(Math.acos(cosHour)) : toDegrees(Math.acos(cosHour));
  const localMeanTime = hourAngle / 15 + rightAscension - 0.06571 * approxTime - 6.622;
  const utcHour = localMeanTime - lngHour;
  const wholeHour = Math.floor(utcHour);
  const minuteFloat = (utcHour - wholeHour) * 60;
  const wholeMinute = Math.floor(minuteFloat);
  const second = Math.round((minuteFloat - wholeMinute) * 60);

  const candidate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), wholeHour, wholeMinute, second));
  return alignEventToLocalDate(candidate, date, location.timezone);
}

function alignEventToLocalDate(eventDate, targetDate, timezone) {
  const targetKey = toInputDate(targetDate);
  let aligned = eventDate;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const eventKey = dateKeyInTimeZone(aligned, timezone);
    if (eventKey === targetKey) return aligned;
    aligned = addUtcDays(aligned, eventKey < targetKey ? 1 : -1);
  }

  return aligned;
}

function dateKeyInTimeZone(date, timezone) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatTime(date, timezone) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone
  }).format(date);
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function formatCoordinate(value, positive, negative) {
  return `${Math.abs(value).toFixed(2)}°${value >= 0 ? positive : negative}`;
}

function hydrateSavedState() {
  const saved = JSON.parse(localStorage.getItem("sun-seen-state") || "null");
  if (!saved) return;
  state.view = saved.view || state.view;
  state.selectedDate = saved.selectedDate ? parseLocalDate(saved.selectedDate) : state.selectedDate;
  state.location = saved.location || state.location;
}

function persistState() {
  localStorage.setItem(
    "sun-seen-state",
    JSON.stringify({
      view: state.view,
      selectedDate: toInputDate(state.selectedDate),
      location: state.location
    })
  );
}

function registerServiceWorker() {
  if (location.protocol.startsWith("http") && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addUtcDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}
