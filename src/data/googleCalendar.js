export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

let identityScriptPromise

export function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google)
  if (identityScriptPromise) return identityScriptPromise

  identityScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => window.google?.accounts?.oauth2
      ? resolve(window.google)
      : reject(new Error('Google Identity Services no se pudo inicializar.'))
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services. Comprueba la conexión e inténtalo de nuevo.'))
    document.head.appendChild(script)
  }).catch(error => {
    identityScriptPromise = undefined
    throw error
  })

  return identityScriptPromise
}

export function requestGoogleAccess(clientId) {
  const google = window.google
  if (!google?.accounts?.oauth2) return Promise.reject(new Error('Google Identity Services sigue cargando. Recarga la página e inténtalo de nuevo.'))
  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_CALENDAR_SCOPE,
      include_granted_scopes: false,
      callback: response => {
        if (response.error) {
          reject(Object.assign(new Error(response.error_description || response.error), { oauthError: response.error }))
          return
        }
        if (!response.access_token) {
          reject(new Error('Google no devolvió un token de acceso. Vuelve a autorizar la conexión.'))
          return
        }
        resolve({ token: response.access_token, expiresAt: Date.now() + Number(response.expires_in || 3600) * 1000 })
      },
      error_callback: error => reject(Object.assign(new Error(error.message || 'No se pudo abrir la ventana de autorización.'), { oauthError: error.type })),
    })
    tokenClient.requestAccessToken()
  })
}

async function calendarApiGet(path, token, params = {}, signal) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/${path}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value)
  })

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal })
  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = body.error?.message || ''
    } catch {
      // Use the HTTP status below when the response has no JSON body.
    }
    throw Object.assign(new Error(detail), { status: response.status })
  }
  return response.json()
}

export async function listGoogleCalendars(token) {
  const calendars = []
  let pageToken
  do {
    const page = await calendarApiGet('users/me/calendarList', token, { maxResults: 250, pageToken })
    calendars.push(...(page.items || []))
    pageToken = page.nextPageToken
  } while (pageToken)
  return calendars
}

function localDateTime(value) {
  const date = new Date(value)
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function eventDuration(start, end, allDay) {
  if (allDay) return 'Todo el día'
  const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours && remainder) return `${hours} h ${remainder} min`
  if (hours) return `${hours} h`
  return `${minutes} min`
}

function mapGoogleEvent(item, calendar, personId) {
  if (!item.start || (!item.start.dateTime && !item.start.date)) return null
  const allDay = Boolean(item.start.date)
  const startsAt = allDay ? `${item.start.date}T00:00` : localDateTime(item.start.dateTime)
  const endsAt = item.end?.dateTime || item.end?.date || item.start.dateTime || item.start.date
  return {
    id: `google:${calendar.id}:${item.id}`,
    source: 'google',
    googleCalendarId: calendar.id,
    iCalUID: item.iCalUID,
    date: startsAt,
    title: item.summary || 'Evento sin título',
    person: personId,
    category: calendar.summary || 'Google Calendar',
    place: item.location || 'Google Calendar',
    duration: eventDuration(item.start.dateTime || item.start.date, endsAt, allDay),
    allDay,
  }
}

async function listCalendarEvents(token, calendar, personId, timeMin, timeMax, signal) {
  const events = []
  let pageToken
  do {
    const page = await calendarApiGet(`calendars/${encodeURIComponent(calendar.id)}/events`, token, {
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: 2500,
      pageToken,
    }, signal)
    events.push(...(page.items || []).map(item => mapGoogleEvent(item, calendar, personId)).filter(Boolean))
    pageToken = page.nextPageToken
  } while (pageToken)
  return events
}

export async function listGoogleEvents(token, selectedCalendars, timeMin, timeMax, signal) {
  const calendarsEvents = await Promise.all(selectedCalendars.map(({ calendar, personId }) =>
    listCalendarEvents(token, calendar, personId, timeMin, timeMax, signal)))
  const unique = new Map()
  calendarsEvents.flat().forEach(event => {
    const start = event.date
    const key = `${event.iCalUID || event.id}:${start}`
    if (!unique.has(key)) unique.set(key, event)
  })
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function googleErrorMessage(error) {
  if (error.oauthError === 'access_denied' || error.oauthError === 'popup_closed_by_user' || error.oauthError === 'popup_closed') {
    return 'Se canceló el acceso. Puedes volver a autorizar Google Calendar cuando quieras.'
  }
  if (error.oauthError === 'popup_failed_to_open') return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.'
  if (error.status === 401) return 'El acceso a Google Calendar ha caducado. Vuelve a autorizar la conexión.'
  if (error.status === 403) return 'Google no permitió leer los calendarios. Comprueba que Calendar API esté habilitada y que la cuenta tenga acceso.'
  if (error.status === 404) return 'No se encontró uno de los calendarios seleccionados. Actualiza la lista y selecciónalo de nuevo.'
  if (error.status === 429) return 'Google Calendar está recibiendo demasiadas solicitudes. Espera un momento y vuelve a actualizar.'
  if (error instanceof TypeError) return 'No se pudo comunicar con Google Calendar. Comprueba tu conexión y que la API esté habilitada.'
  return error.message || 'No se pudo conectar con Google Calendar. Inténtalo de nuevo.'
}
