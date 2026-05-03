/**
 * Current weather via Open-Meteo (no API key).
 * Default: Nha Trang coast — override with VITE_WEATHER_LAT / VITE_WEATHER_LON.
 */

function envNum(name, fallback) {
  const v = import.meta.env?.[name];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function getHotelWeatherCoords() {
  return {
    latitude: envNum("VITE_WEATHER_LAT", 12.2388),
    longitude: envNum("VITE_WEATHER_LON", 109.1967),
  };
}

/** WMO code → short English label */
export function wmoWeatherLabelEn(code) {
  const c = Number(code);
  if (c === 0) return "Clear sky";
  if (c === 1) return "Mainly clear";
  if (c === 2) return "Partly cloudy";
  if (c === 3) return "Overcast";
  if (c === 45 || c === 48) return "Fog";
  if (c >= 51 && c <= 57) return "Drizzle";
  if (c >= 61 && c <= 67) return "Rain";
  if (c >= 71 && c <= 77) return "Snow";
  if (c >= 80 && c <= 82) return "Rain showers";
  if (c >= 95 && c <= 99) return "Thunderstorm";
  return "Weather";
}

export function isRainyWmoCode(code) {
  const c = Number(code);
  if (c >= 51 && c <= 67) return true;
  if (c >= 80 && c <= 82) return true;
  if (c >= 95 && c <= 99) return true;
  return false;
}

/**
 * @returns {Promise<{
 *   temperatureC: number,
 *   apparentC: number,
 *   humidityPct: number,
 *   precipitationMm: number,
 *   windKmh: number,
 *   windDirectionDeg: number,
 *   weatherCode: number,
 *   labelEn: string,
 *   time: string,
 *   placeLabel: string
 * }>}
 */
export async function fetchCurrentWeather({ signal, latitude, longitude, placeLabel = "Nha Trang" } = {}) {
  const lat = latitude ?? getHotelWeatherCoords().latitude;
  const lon = longitude ?? getHotelWeatherCoords().longitude;
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "windspeed_10m",
      "winddirection_10m",
    ].join(","),
    timezone: "Asia/Ho_Chi_Minh",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Could not load weather.");
  const data = await res.json();
  const cur = data?.current;
  if (!cur) throw new Error("Weather data is missing.");
  return {
    temperatureC: cur.temperature_2m,
    apparentC: cur.apparent_temperature,
    humidityPct: cur.relative_humidity_2m,
    precipitationMm: cur.precipitation ?? 0,
    windKmh: cur.windspeed_10m,
    windDirectionDeg: cur.winddirection_10m,
    weatherCode: cur.weather_code,
    labelEn: wmoWeatherLabelEn(cur.weather_code),
    time: cur.time,
    placeLabel,
  };
}
