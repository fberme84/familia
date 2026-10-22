const LOCATION = { name: 'Soto del Henares', latitude: 40.46055, longitude: -3.43996 }
const CACHE_MS = 30 * 60 * 1000

let weatherCache
let weatherRequest

export const weatherDescription = (code, isDay = true) => {
  const conditions = {
    0: [isDay ? '☀️' : '🌙', isDay ? 'Despejado' : 'Despejado'],
    1: ['🌤️', 'Mayormente despejado'],
    2: ['⛅', 'Parcialmente nublado'],
    3: ['☁️', 'Nublado'],
    45: ['🌫️', 'Niebla'],
    48: ['🌫️', 'Niebla con escarcha'],
    51: ['🌦️', 'Llovizna ligera'],
    53: ['🌦️', 'Llovizna moderada'],
    55: ['🌧️', 'Llovizna intensa'],
    56: ['🌧️', 'Llovizna helada ligera'],
    57: ['🌧️', 'Llovizna helada intensa'],
    61: ['🌧️', 'Lluvia ligera'],
    63: ['🌧️', 'Lluvia moderada'],
    65: ['🌧️', 'Lluvia intensa'],
    66: ['🌧️', 'Lluvia helada ligera'],
    67: ['🌧️', 'Lluvia helada intensa'],
    71: ['🌨️', 'Nevada ligera'],
    73: ['🌨️', 'Nevada moderada'],
    75: ['❄️', 'Nevada intensa'],
    77: ['❄️', 'Granos de nieve'],
    80: ['🌦️', 'Chubascos ligeros'],
    81: ['🌧️', 'Chubascos moderados'],
    82: ['🌧️', 'Chubascos fuertes'],
    85: ['🌨️', 'Chubascos de nieve ligeros'],
    86: ['❄️', 'Chubascos de nieve fuertes'],
    95: ['⛈️', 'Tormenta'],
    96: ['⛈️', 'Tormenta con granizo ligero'],
    99: ['⛈️', 'Tormenta con granizo fuerte'],
  }
  return conditions[code] || ['🌡️', 'Estado del cielo no disponible']
}

async function requestWeather() {
  const params = new URLSearchParams({
    latitude: String(LOCATION.latitude),
    longitude: String(LOCATION.longitude),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    timezone: 'Europe/Madrid',
    forecast_days: '5',
  })
  let response
  try { response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`) }
  catch { throw new Error('No se pudo conectar con Open-Meteo. Comprueba la conexión e inténtalo de nuevo.') }
  if (!response.ok) throw new Error('No se pudo obtener la previsión meteorológica. Inténtalo de nuevo más tarde.')
  const data = await response.json()
  if (!data.current || !data.daily?.time?.length) throw new Error('Open-Meteo devolvió una previsión incompleta.')
  return {
    current: { temperature: data.current.temperature_2m, code: data.current.weather_code, isDay: data.current.is_day === 1 },
    days: data.daily.time.map((date, index) => ({
      date,
      code: data.daily.weather_code[index],
      max: data.daily.temperature_2m_max[index],
      min: data.daily.temperature_2m_min[index],
    })),
  }
}

export function getWeather({ force = false } = {}) {
  if (!force && weatherCache && Date.now() - weatherCache.time < CACHE_MS) return Promise.resolve(weatherCache.data)
  if (weatherRequest) return weatherRequest
  weatherRequest = requestWeather()
    .then(data => {
      weatherCache = { data, time: Date.now() }
      return data
    })
    .finally(() => { weatherRequest = undefined })
  return weatherRequest
}
