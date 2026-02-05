// Weather Tool — uses Open-Meteo free API (no key needed)

interface WeatherArgs {
  location: string;
  days?: number;
  unit?: "fahrenheit" | "celsius";
}

interface GeoResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

async function geocode(name: string): Promise<GeoResult | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const resp = await fetch(url.toString());
  if (!resp.ok) return null;
  const data = await resp.json();
  const r = data?.results?.[0];
  if (!r) return null;
  return {
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  };
}

const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Light snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

export async function executeWeatherTool(args: WeatherArgs): Promise<string> {
  const { location, days = 1, unit = "fahrenheit" } = args;

  const geo = await geocode(location);
  if (!geo) {
    return JSON.stringify({ error: `Could not find location: ${location}` });
  }

  const tz = geo.timezone ?? "auto";
  const locationName = [geo.name, geo.admin1, geo.country].filter(Boolean).join(", ");
  const forecastDays = Math.max(1, Math.min(16, days));

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(geo.latitude));
  url.searchParams.set("longitude", String(geo.longitude));
  url.searchParams.set("timezone", tz);
  url.searchParams.set("forecast_days", String(forecastDays));
  url.searchParams.set("temperature_unit", unit);
  url.searchParams.set("windspeed_unit", "mph");
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m");
  url.searchParams.set(
    "daily",
    "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,windspeed_10m_max",
  );

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    return JSON.stringify({ error: `Weather API error: ${resp.status}` });
  }

  const data = await resp.json();
  const unitSym = unit === "fahrenheit" ? "°F" : "°C";

  // Current conditions
  const current = data.current;
  const currentCondition = current
    ? {
        temperature: `${Math.round(current.temperature_2m)}${unitSym}`,
        feels_like: `${Math.round(current.apparent_temperature)}${unitSym}`,
        humidity: `${current.relative_humidity_2m}%`,
        wind: `${Math.round(current.wind_speed_10m)} mph`,
        condition: WMO_CODES[current.weather_code] ?? "Unknown",
        precipitation: `${current.precipitation} mm`,
      }
    : null;

  // Daily forecast
  const daily = data.daily;
  const forecast = (daily?.time ?? []).map((date: string, i: number) => ({
    date,
    condition: WMO_CODES[daily.weathercode?.[i]] ?? "Unknown",
    high: daily.temperature_2m_max?.[i] != null ? `${Math.round(daily.temperature_2m_max[i])}${unitSym}` : null,
    low: daily.temperature_2m_min?.[i] != null ? `${Math.round(daily.temperature_2m_min[i])}${unitSym}` : null,
    precip_chance: daily.precipitation_probability_max?.[i] != null ? `${daily.precipitation_probability_max[i]}%` : null,
    precip_total: daily.precipitation_sum?.[i] != null ? `${daily.precipitation_sum[i]}mm` : null,
    wind_max: daily.windspeed_10m_max?.[i] != null ? `${Math.round(daily.windspeed_10m_max[i])} mph` : null,
  }));

  return JSON.stringify({
    location: locationName,
    timezone: data.timezone ?? tz,
    unit,
    current: currentCondition,
    forecast,
    source: "Open-Meteo",
  });
}
