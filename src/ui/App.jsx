import { useEffect, useMemo, useState } from 'react'
import { events, family, lunchMenu } from '../data/family.js'
import { googleErrorMessage, listGoogleCalendars, listGoogleEvents, loadGoogleIdentity, requestGoogleAccess } from '../data/googleCalendar.js'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const fullDate = (d, options = { weekday: 'long', day: 'numeric', month: 'long' }) => new Intl.DateTimeFormat('es-ES', options).format(d)
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const atNoon = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
const mondayOf = d => { const x = atNoon(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const monthTitle = d => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(d)
const eventIdentity = event => `${event.title.trim().toLocaleLowerCase('es-ES').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}|${event.date.slice(0, event.allDay ? 10 : 16)}`
const Icon = ({ name, size = 18, className = '' }) => {
  const paths = { chevron: <path d="m9 18 6-6-6-6" />, calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18"/></>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>, spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.1L19 22l-1.1-2.9L15 18l2.9-1.2L19 14Z"/></>, camera: <><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10H2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3"/></>, arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>, book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 16a2 2 0 0 1 2-2h14M8 7h7"/></> }
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const [selected, setSelected] = useState(atNoon(new Date(2026, 9, 21)))
  const [anchor, setAnchor] = useState(atNoon(new Date(2026, 9, 21)))
  const [view, setView] = useState('week')
  const [selectedPerson, setSelectedPerson] = useState('all')
  const [frameMode, setFrameMode] = useState(false)
  const [clock, setClock] = useState(new Date())
  const [photo, setPhoto] = useState(0)
  const [detail, setDetail] = useState(null)
  const [googleConnection, setGoogleConnection] = useState(null)
  const [googleCalendars, setGoogleCalendars] = useState([])
  const [googleCalendarAssignments, setGoogleCalendarAssignments] = useState({})
  const [googleEvents, setGoogleEvents] = useState([])
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleEventsBusy, setGoogleEventsBusy] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const [googleIdentityReady, setGoogleIdentityReady] = useState(false)

  const gridDays = useMemo(() => {
    if (view === 'week') return Array.from({ length: 7 }, (_, i) => { const d = mondayOf(anchor); d.setDate(d.getDate() + i); return d })
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12)
    const start = mondayOf(first)
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d })
  }, [anchor, view])

  useEffect(() => { const timer = setInterval(() => setClock(new Date()), 30000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined
    let mounted = true
    loadGoogleIdentity()
      .then(() => { if (mounted) setGoogleIdentityReady(true) })
      .catch(error => { if (mounted) setGoogleError(googleErrorMessage(error)) })
    return () => { mounted = false }
  }, [])
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { setFrameMode(false); setDetail(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filterPeople = family.filter(person => person.id !== 'family')
  const selectedGoogleCalendars = useMemo(() => Object.entries(googleCalendarAssignments).flatMap(([id, personId]) => {
    const calendar = googleCalendars.find(item => item.id === id)
    return calendar ? [{ calendar, personId }] : []
  }), [googleCalendars, googleCalendarAssignments])
  const visibleEvents = useMemo(() => {
    const localEvents = selectedPerson === 'all' ? events : events.filter(event => event.person === selectedPerson)
    const localIdentities = new Set(localEvents.map(eventIdentity))
    const selectedGoogleEvents = (selectedPerson === 'all' ? googleEvents : googleEvents.filter(event => event.person === selectedPerson))
      .filter(event => !localIdentities.has(eventIdentity(event)))
    return [...localEvents, ...selectedGoogleEvents]
  }, [googleEvents, selectedPerson])
  const selectedEvents = visibleEvents.filter(e => e.date.slice(0, 10) === isoDay(selected)).sort((a, b) => a.date.localeCompare(b.date))
  const lunch = lunchMenu.meals.find(m => m.day === selected.getDate() && selected.getMonth() === 9)
  const nextEvent = [...events].filter(e => new Date(e.date) >= clock).sort((a, b) => a.date.localeCompare(b.date))[0]

  useEffect(() => {
    if (!googleConnection) return undefined
    const delay = Math.max(0, googleConnection.expiresAt - Date.now())
    const timer = setTimeout(() => {
      setGoogleConnection(null)
      setGoogleEvents([])
      setGoogleError('El acceso a Google Calendar ha caducado. Vuelve a autorizar la conexión.')
    }, delay)
    return () => clearTimeout(timer)
  }, [googleConnection])

  useEffect(() => {
    if (!googleConnection) {
      setGoogleEvents([])
      setGoogleEventsBusy(false)
      return undefined
    }
    if (googleConnection.expiresAt <= Date.now()) {
      setGoogleConnection(null)
      setGoogleEvents([])
      setGoogleError('El acceso a Google Calendar ha caducado. Vuelve a autorizar la conexión.')
      return undefined
    }
    if (!selectedGoogleCalendars.length) {
      setGoogleEvents([])
      setGoogleEventsBusy(false)
      return undefined
    }

    const controller = new AbortController()
    const start = atNoon(gridDays[0])
    start.setHours(0, 0, 0, 0)
    const end = atNoon(gridDays[gridDays.length - 1])
    end.setDate(end.getDate() + 1)
    end.setHours(0, 0, 0, 0)
    setGoogleEventsBusy(true)
    listGoogleEvents(googleConnection.token, selectedGoogleCalendars, start.toISOString(), end.toISOString(), controller.signal)
      .then(items => {
        setGoogleEvents(items)
        setGoogleError('')
      })
      .catch(error => {
        if (controller.signal.aborted) return
        setGoogleEvents([])
        if (error.status === 401) setGoogleConnection(null)
        setGoogleError(googleErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setGoogleEventsBusy(false)
      })
    return () => controller.abort()
  }, [googleConnection, selectedGoogleCalendars, gridDays])

  const move = amount => {
    const next = new Date(anchor)
    if (view === 'week') next.setDate(next.getDate() + amount * 7)
    else next.setMonth(next.getMonth() + amount)
    setAnchor(next)
    let chosen
    if (view === 'week') {
      chosen = new Date(selected)
      chosen.setDate(chosen.getDate() + amount * 7)
    } else {
      const month = new Date(anchor.getFullYear(), anchor.getMonth() + amount, 1, 12)
      const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12).getDate()
      chosen = new Date(month.getFullYear(), month.getMonth(), Math.min(selected.getDate(), lastDay), 12)
    }
    setSelected(atNoon(chosen))
  }
  const goToday = () => { const d = atNoon(new Date()); setSelected(d); setAnchor(d) }
  const connectGoogle = async () => {
    if (!GOOGLE_CLIENT_ID) {
      setGoogleError('Falta configurar VITE_GOOGLE_CLIENT_ID. Consulta README.md para prepararlo en local o en GitHub Actions.')
      return
    }
    setGoogleBusy(true)
    setGoogleError('')
    try {
      const connection = await requestGoogleAccess(GOOGLE_CLIENT_ID)
      setGoogleConnection(connection)
      const calendars = await listGoogleCalendars(connection.token)
      setGoogleCalendars(calendars)
      if (!calendars.length) setGoogleError('Google no devolvió calendarios para esta cuenta.')
      setGoogleCalendarAssignments(current => {
        const next = Object.fromEntries(Object.entries(current).filter(([id]) => calendars.some(calendar => calendar.id === id)).slice(0, 2))
        return next
      })
    } catch (error) {
      if (error.status === 401) setGoogleConnection(null)
      setGoogleError(googleErrorMessage(error))
    } finally {
      setGoogleBusy(false)
    }
  }
  const refreshGoogleCalendars = async () => {
    if (!googleConnection || googleConnection.expiresAt <= Date.now()) {
      setGoogleConnection(null)
      setGoogleEvents([])
      setGoogleError('El acceso a Google Calendar ha caducado. Vuelve a autorizar la conexión.')
      return
    }
    setGoogleBusy(true)
    setGoogleError('')
    try {
      const calendars = await listGoogleCalendars(googleConnection.token)
      setGoogleCalendars(calendars)
      setGoogleCalendarAssignments(current => Object.fromEntries(Object.entries(current).filter(([id]) => calendars.some(calendar => calendar.id === id)).slice(0, 2)))
    } catch (error) {
      if (error.status === 401) setGoogleConnection(null)
      setGoogleError(googleErrorMessage(error))
    } finally {
      setGoogleBusy(false)
    }
  }
  const toggleGoogleCalendar = (calendarId, checked) => {
    if (checked && !googleCalendarAssignments[calendarId] && Object.keys(googleCalendarAssignments).length >= 2) {
      setGoogleError('Puedes seleccionar hasta dos calendarios de Google.')
      return
    }
    setGoogleError('')
    setGoogleCalendarAssignments(current => {
      const next = { ...current }
      if (checked) next[calendarId] = 'fer'
      else delete next[calendarId]
      return next
    })
  }
  const assignGoogleCalendar = (calendarId, personId) => setGoogleCalendarAssignments(current => ({ ...current, [calendarId]: personId }))
  const eventsOn = date => visibleEvents.filter(e => e.date.slice(0, 10) === isoDay(date))

  if (frameMode) return <FrameMode clock={clock} nextEvent={nextEvent} onExit={() => setFrameMode(false)} photo={photo} onPhoto={() => setPhoto((photo + 1) % 3)} />

  const period = view === 'week'
    ? `${new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(gridDays[0])} – ${new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(gridDays[6])}`
    : monthTitle(anchor)

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="Nuestra Familia, inicio"><span className="brand-mark"><Icon name="spark" size={20}/></span><span><b>Nuestra Familia</b><small>un lugar para estar al día</small></span></a>
      <div className="top-actions"><span className="today-label">{fullDate(clock, { weekday: 'short', day: 'numeric', month: 'short' })}</span><button className="frame-button" onClick={() => setFrameMode(true)}><Icon name="camera" size={17}/><span>Modo marco</span></button><button className="avatar-stack" aria-label="Miembros de la familia">{family.map(p => <span key={p.id} style={{ background: p.color }}>{p.initials}</span>)}</button></div>
    </header>

    <main className="layout" id="inicio">
      <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> NUESTRO ESPACIO FAMILIAR</div><h1>Buenos días, familia <span>☀️</span></h1><p>Todo lo que tenemos por delante, en un mismo lugar.</p></div><button className="today-button" onClick={goToday}><Icon name="calendar" size={16}/> Ir a hoy</button></section>

      <div className="content-grid">
        <section className="calendar-card card">
          <div className="calendar-heading"><div><div className="section-kicker">CALENDARIO FAMILIAR</div><h2>{period}</h2></div><div className="calendar-controls"><div className="segmented"><button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Semana</button><button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Mes</button></div><div className="nav-arrows"><button aria-label="Periodo anterior" onClick={() => move(-1)}><Icon name="chevron" size={17} className="flip"/></button><button aria-label="Periodo siguiente" onClick={() => move(1)}><Icon name="chevron" size={17}/></button></div></div></div>
          <div className="google-calendar-tools">
            <div className="google-calendar-state" role="status"><i className={googleConnection && googleConnection.expiresAt > Date.now() ? 'connected' : ''}/><span>Google Calendar · {googleConnection && googleConnection.expiresAt > Date.now() ? 'Conectado' : 'No conectado'}</span>{googleEventsBusy && <small>Actualizando eventos…</small>}</div>
            <div className="google-calendar-actions"><button type="button" className="google-connect-button" onClick={connectGoogle} disabled={googleBusy || Boolean(GOOGLE_CLIENT_ID && !googleIdentityReady)}>{googleBusy ? 'Conectando…' : GOOGLE_CLIENT_ID && !googleIdentityReady ? 'Cargando Google…' : googleConnection ? 'Volver a autorizar' : 'Conectar Google Calendar'}</button>{googleConnection && <button type="button" className="google-refresh-button" onClick={refreshGoogleCalendars} disabled={googleBusy || googleEventsBusy}>{googleBusy ? 'Actualizando…' : 'Actualizar eventos'}</button>}</div>
          </div>
          {googleError && <p className="google-calendar-error" role="alert">{googleError}</p>}
          {googleCalendars.length > 0 && <details className="google-calendar-picker"><summary>Elegir calendarios · {Object.keys(googleCalendarAssignments).length}/2</summary><div className="google-calendar-picker-content"><p>Selecciona hasta dos calendarios y asigna sus eventos a una persona para aplicar los colores y el filtro «Quién».</p>{googleCalendars.map(calendar => { const personId = googleCalendarAssignments[calendar.id]; const member = filterPeople.find(person => person.id === personId); return <div className="google-calendar-option" key={calendar.id}><label><input type="checkbox" checked={Boolean(personId)} onChange={event => toggleGoogleCalendar(calendar.id, event.target.checked)}/><span className="google-calendar-option-name">{calendar.summary || 'Calendario sin nombre'}{calendar.primary && <small>Principal</small>}</span></label>{personId && <select aria-label={`Mostrar ${calendar.summary || 'calendario'} como`} value={personId} onChange={event => assignGoogleCalendar(calendar.id, event.target.value)}>{filterPeople.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select>}{member && <i className="google-calendar-member-dot" style={{ background: member.color }}/>}</div> })}</div></details>}
          <div className="who-filter" aria-label="Filtrar calendario por persona"><span className="who-filter-label">QUIÉN</span><div className="who-filter-options">{[{ id: 'all', name: 'Todos' }, ...filterPeople].map(person => { const isAll = person.id === 'all'; return <button key={person.id} type="button" className={`who-chip ${selectedPerson === person.id ? 'active' : ''} ${isAll ? 'all' : ''}`} style={!isAll ? { '--member-color': person.color, '--member-soft': person.soft } : undefined} aria-pressed={selectedPerson === person.id} onClick={() => setSelectedPerson(person.id)}>{!isAll && <i className="who-chip-dot" />}{person.name}</button> })}</div></div>
          <div className={`calendar-grid ${view}`}><div className="weekday-row">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div><div className="days-grid">{gridDays.map(day => { const dayEvents = eventsOn(day); const isCurrent = day.getMonth() === anchor.getMonth(); const isToday = isoDay(day) === isoDay(new Date()); const isSelected = isoDay(day) === isoDay(selected); return <button key={isoDay(day)} className={`day-cell ${isCurrent ? '' : 'outside'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => setSelected(atNoon(day))} aria-label={`${fullDate(day)}${dayEvents.length ? `, ${dayEvents.length} eventos` : ''}`}><span className="day-number">{day.getDate()}</span><span className="day-dots">{dayEvents.slice(0, 4).map((e, i) => <i key={e.id} style={{ background: family.find(p => p.id === e.person)?.color }} className={view === 'month' ? 'month-dot' : ''}/>)}</span>{view === 'week' && dayEvents.slice(0, 2).map(e => <span className="day-event" key={e.id}><i style={{ background: family.find(p => p.id === e.person)?.color }}/>{e.title}</span>)}</button> })}</div></div>
          <div className="calendar-footer"><span><Icon name="spark" size={15}/> Una semana para compartir</span><span>{visibleEvents.length} planes en agenda</span></div>
        </section>

        <aside className="side-column">
          <section className="lunch-card card"><div className="lunch-top"><span className="lunch-icon">✳</span><span className="section-kicker">MENÚ DE MUESTRA · {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(selected).toUpperCase()}</span></div><h3>Menú del comedor</h3><p className="fiction-label">Menú ficticio de ejemplo</p>{lunch ? <><div className="meal-list"><div><span>PRIMERO</span><b>{lunch.first}</b></div><div><span>SEGUNDO</span><b>{lunch.main}</b></div><div><span>ACOMPAÑA</span><b>{lunch.side}</b></div><div><span>POSTRE</span><b>{lunch.dessert}</b></div></div><div className="allergy-note">♡ <span>Consulta siempre los alérgenos en el centro.</span></div></> : <div className="no-menu"><span>🍃</span><p>No hay menú disponible para este día.</p><small>El menú de ejemplo es de lunes a viernes.</small></div>}</section>
        </aside>
      </div>

      <section className="agenda-section"><div className="agenda-heading"><div><div className="section-kicker">TU DÍA, A TU RITMO</div><h2>{fullDate(selected)}</h2></div><span className="event-count">{selectedEvents.length} {selectedEvents.length === 1 ? 'actividad' : 'actividades'}</span></div><div className="agenda-content">{selectedEvents.length ? <div className="event-list">{selectedEvents.map(event => <EventCard key={event.id} event={event} onClick={() => setDetail(event)}/>)}</div> : <div className="empty-day"><span className="empty-illustration">☁</span><div><b>Un día con espacio para improvisar</b><p>No hay actividades para este día. ¡Disfrutadlo!</p></div></div>}</div></section>
      <footer className="footer-note"><span>Hecho con cariño para organizarnos mejor</span><span>✳ <b>Nuestra Familia</b></span></footer>
    </main>

    {detail && <EventDialog event={detail} onClose={() => setDetail(null)}/>}
  </div>
}

function EventCard({ event, onClick }) {
  const person = family.find(p => p.id === event.person)
  return <button className="event-card" onClick={onClick} style={{ '--person-color': person.color, '--person-soft': person.soft }}><span className="event-time"><b>{event.allDay ? 'Todo el día' : event.date.slice(11, 16)}</b><small>{event.duration}</small></span><span className="event-stripe"/><span className="event-main"><span className="event-topline"><b>{event.title}</b><span className="event-category">{event.category}</span></span><span className="event-details"><span><Icon name="pin" size={14}/>{event.place}</span><span><i className="mini-avatar" style={{ background: person.color }}>{person.initials}</i>{person.name}</span></span></span><span className="event-open"><Icon name="chevron" size={17}/></span></button>
}

function EventDialog({ event, onClose }) {
  const person = family.find(p => p.id === event.person)
  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button><span className="modal-person" style={{ color: person.color, background: person.soft }}>{person.initials}</span><span className="section-kicker">DETALLE DE LA ACTIVIDAD</span><h2 id="event-title">{event.title}</h2><span className="modal-chip" style={{ color: person.color, background: person.soft }}>{event.category} · {person.name}</span><div className="modal-detail"><span><Icon name="calendar"/>{fullDate(new Date(event.date))}</span><span><Icon name="clock"/>{event.allDay ? event.duration : `${event.date.slice(11, 16)} · ${event.duration}`}</span><span><Icon name="pin"/>{event.place}</span></div><small className="fiction-label">{event.source === 'google' ? 'Evento de Google Calendar · solo lectura' : 'Actividad de demostración'}</small></section></div>
}

const photos = [
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2200&q=85',
]
function FrameMode({ clock, nextEvent, onExit, photo, onPhoto }) {
  const person = nextEvent && family.find(p => p.id === nextEvent.person)
  return <main className="frame-mode" style={{ backgroundImage: `linear-gradient(90deg, rgba(16,26,26,.58), rgba(16,26,26,.03) 80%), url('${photos[photo]}')` }}><button className="frame-exit" onClick={onExit}>× <span>Salir del marco</span></button><button className="photo-next" onClick={onPhoto} aria-label="Siguiente fotografía">›</button><section className="frame-copy"><span className="frame-brand"><Icon name="spark" size={23}/> NUESTRA FAMILIA</span><div className="frame-time">{clock.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div><div className="frame-date">{fullDate(clock, { weekday: 'long', day: 'numeric', month: 'long' })}</div><div className="frame-next"><span className="section-kicker">LO PRÓXIMO EN FAMILIA</span>{nextEvent ? <><b>{nextEvent.title}</b><span>{new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(nextEvent.date))} · {nextEvent.date.slice(11, 16)}</span><i style={{ background: person.color }}>{person.initials}</i></> : <b>Un día para disfrutar juntos</b>}</div></section><div className="frame-caption">Un momento tranquilo en casa <span>·</span> {photo + 1} / {photos.length}</div></main>
}

export default App
