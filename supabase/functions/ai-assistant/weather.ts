// supabase/functions/ai-assistant/weather.ts

type TemperatureUnit = "celsius" | "fahrenheit";

type WeatherRequest = {
  locationQuery: string | null;
  days: number;
  unit: TemperatureUnit;
};

type GeocodingResult = {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

type DailyForecast = {
  locationName: string;
  timezone: string;
  unit: TemperatureUnit;
  days: Array<{
    date: string; // YYYY-MM-DD
    tempMax: number | null;
    tempMin: number | null;
    precipProbMax: number | null;
    precipSum: number | null;
    windMax: number | null;
    summary: string;
  }>;
};

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function parseWeatherRequest(text: string): WeatherRequest | null {
  const t = (text ?? "").trim();
  if (!t) return null;

  const lower = t.toLowerCase();
  const isWeather = /(\bweather\b|\bforecast\b|\btemperature\b|\brain\b|\bsnow\b)/i.test(lower);
  if (!isWeather) return null;

  // Days: choose based on intent.
  // - If the user explicitly asks for N-day forecast, use N.
  // - If they say "forecast" / "next" / "days", default to 10.
  // - Otherwise default to 1 (current/today).
  let days = /\b(forecast|next|days|extended)\b/i.test(lower) ? 10 : 1;

  const m1 = lower.match(/(\d{1,2})\s*-?\s*day/);
  if (m1?.[1]) days = clampInt(Number(m1[1]), 1, 16);
  else if (/\bten\b/.test(lower)) days = 10;
  else if (/\b7\b/.test(lower) && /\bweek\b/.test(lower)) days = 7;

  // Unit
  let unit: TemperatureUnit = /\b(c|celsius|°c)\b/.test(lower) ? "celsius" : "fahrenheit";

  // Location extraction: prefer "in X" or "for X".
  let locationQuery: string | null = null;
  const inMatch = t.match(/\b(?:in|for)\s+([^?.,]+)(?:[?.,]|$)/i);
  if (inMatch?.[1]) locationQuery = inMatch[1].trim();

  // If user only wrote something like "weather boston".
  if (!locationQuery) {
    const fallback = t.replace(/\b(weather|forecast|temperature|today|tomorrow|next)\b/gi, " ").trim();
    if (fallback && fallback.length <= 80) locationQuery = fallback;
  }

  // If still empty, let index.ts ask one short clarification.
  if (locationQuery && locationQuery.length < 2) locationQuery = null;

  return { locationQuery, days, unit };
}

async function geocodeFirst(name: string): Promise<GeocodingResult | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const resp = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });
  if (!resp.ok) return null;

  const data = await resp.json().catch(() => null) as any;
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

function weatherCodeToSummary(code: number | null): string {
  if (code === null || Number.isNaN(code)) return "Unknown";

  // Open-Meteo weather codes
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([56, 57].includes(code)) return "Freezing drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([66, 67].includes(code)) return "Freezing rain";
  if ([71, 73, 75].includes(code)) return "Snow";
  if (code === 77) return "Snow grains";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm with hail";

  return `Weather code ${code}`;
}

export async function getDailyForecast(req: WeatherRequest): Promise<DailyForecast> {
  if (!req.locationQuery) {
    throw new Error("Missing location");
  }

  const geo = await geocodeFirst(req.locationQuery);
  if (!geo) {
    throw new Error(`Couldn't find a location for: ${req.locationQuery}`);
  }

  const timezone = geo.timezone ?? "auto";
  const locationName = [geo.name, geo.admin1, geo.country].filter(Boolean).join(", ");

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(geo.latitude));
  url.searchParams.set("longitude", String(geo.longitude));
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("forecast_days", String(clampInt(req.days, 1, 16)));
  url.searchParams.set("temperature_unit", req.unit);
  url.searchParams.set("windspeed_unit", "mph");
  url.searchParams.set(
    "daily",
    [
      "weathercode",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "precipitation_sum",
      "windspeed_10m_max",
    ].join(","),
  );

  const resp = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Weather API error [${resp.status}]: ${t}`);
  }

  const data = await resp.json().catch(() => null) as any;
  const daily = data?.daily;

  const times: string[] = daily?.time ?? [];
  const codes: (number | null)[] = daily?.weathercode ?? [];
  const tMax: (number | null)[] = daily?.temperature_2m_max ?? [];
  const tMin: (number | null)[] = daily?.temperature_2m_min ?? [];
  const pProb: (number | null)[] = daily?.precipitation_probability_max ?? [];
  const pSum: (number | null)[] = daily?.precipitation_sum ?? [];
  const wMax: (number | null)[] = daily?.windspeed_10m_max ?? [];

  const days = times.map((date, i) => ({
    date,
    tempMax: tMax[i] ?? null,
    tempMin: tMin[i] ?? null,
    precipProbMax: pProb[i] ?? null,
    precipSum: pSum[i] ?? null,
    windMax: wMax[i] ?? null,
    summary: weatherCodeToSummary(codes[i] ?? null),
  }));

  return {
    locationName,
    timezone: data?.timezone ?? timezone,
    unit: req.unit,
    days,
  };
}

export function formatDailyForecastText(forecast: DailyForecast): string {
  const unitSymbol = forecast.unit === "fahrenheit" ? "°F" : "°C";

  const lines: string[] = [];
  lines.push(`${forecast.locationName} — ${forecast.days.length}-day forecast (${forecast.timezone})`);
  lines.push("");

  for (const d of forecast.days) {
    const hi = d.tempMax !== null ? `${Math.round(d.tempMax)}${unitSymbol}` : "—";
    const lo = d.tempMin !== null ? `${Math.round(d.tempMin)}${unitSymbol}` : "—";
    const pop = d.precipProbMax !== null ? `${Math.round(d.precipProbMax)}%` : "—";
    const sum = d.precipSum !== null ? `${d.precipSum}mm` : "—";
    const wind = d.windMax !== null ? `${Math.round(d.windMax)} mph` : "—";

    lines.push(`${d.date}: ${d.summary}. High ${hi} / Low ${lo}. Precip ${pop} (${sum}). Wind max ${wind}.`);
  }

  lines.push("");
  lines.push("Source: Open‑Meteo forecast");
  return lines.join("\n");
}
