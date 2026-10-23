import { useEffect, useMemo, useState } from 'react'
import { family } from '../data/family.js'
import schoolMenu from '../data/schoolMenu.json'
import icalEventData from '../data/icalEvents.json'
import { calendarEventsOnDate, selectCalendarEvents } from '../data/calendarEvents.js'
import { eventMemberIds } from '../data/eventMembers.js'
import { getWeather, weatherDescription } from '../data/weather.js'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const fullDate = (d, options = { weekday: 'long', day: 'numeric', month: 'long' }) => new Intl.DateTimeFormat('es-ES', options).format(d)
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const nextIsoDay = value => { const [year, month, day] = value.split('-').map(Number); return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10) }
const calendarDayLabel = value => new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'))
const eventDateLabel = event => { const start = event.date.slice(0, 10); if (!event.allDay || !event.allDayEndDate || event.allDayEndDate <= nextIsoDay(start)) return calendarDayLabel(start); const end = new Date(event.allDayEndDate + 'T12:00:00Z'); end.setUTCDate(end.getUTCDate() - 1); return calendarDayLabel(start) + ' \u2013 ' + calendarDayLabel(end.toISOString().slice(0, 10)) }
const atNoon = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
const schoolMenuPeriodReady = Number.isInteger(schoolMenu.period?.month) && Number.isInteger(schoolMenu.period?.year)
const menuForDate = date => {
  if (!schoolMenuPeriodReady || schoolMenu.period.month !== date.getMonth() + 1 || schoolMenu.period.year !== date.getFullYear()) return null
  const menu = schoolMenu.days.find(item => item.day === date.getDate())
  return menu && ['available', 'holiday'].includes(menu.status) ? menu : null
}
const mondayOf = d => { const x = atNoon(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const monthTitle = d => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(d)
const countdownUntil = (event, now) => { if (!event || event.allDay) return ''; const minutes = Math.floor((new Date(event.date).getTime() - now.getTime()) / 60000); if (minutes <= 0) return ''; const days = Math.floor(minutes / 1440); const hours = Math.floor((minutes % 1440) / 60); const rest = minutes % 60; return days ? days + ' d ' + hours + ' h' : hours ? hours + ' h ' + rest + ' min' : rest + ' min' }
const eventMembers = event => {
  return eventMemberIds(event).map(id => family.find(person => person.id === id)).filter(Boolean)
}
const primaryEventMember = event => eventMembers(event)[0]
const eventColor = event => primaryEventMember(event)?.color || '#9aa49d'
const eventSoftColor = event => primaryEventMember(event)?.soft || '#f0f2ef'
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
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState('')

  const gridDays = useMemo(() => {
    if (view === 'week') return Array.from({ length: 7 }, (_, i) => { const d = mondayOf(anchor); d.setDate(d.getDate() + i); return d })
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12)
    const start = mondayOf(first)
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d })
  }, [anchor, view])

  useEffect(() => { const timer = setInterval(() => setClock(new Date()), 30000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    let mounted = true
    getWeather()
      .then(data => { if (mounted) { setWeather(data); setWeatherError('') } })
      .catch(error => { if (mounted) setWeatherError(error.message || 'No se pudo cargar el tiempo.') })
      .finally(() => { if (mounted) setWeatherLoading(false) })
    return () => { mounted = false }
  }, [])
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { setFrameMode(false); setDetail(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filterPeople = family.filter(person => person.id !== 'family')
  const visibleEvents = useMemo(() => {
    return selectCalendarEvents({ icalData: icalEventData, selectedMemberId: selectedPerson })
  }, [selectedPerson])
  const selectedEvents = calendarEventsOnDate(visibleEvents, isoDay(selected)).sort((a, b) => a.date.localeCompare(b.date))
  const madridNow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(clock).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {})
  const madridNowKey = madridNow.year + '-' + madridNow.month + '-' + madridNow.day + 'T' + madridNow.hour + ':' + madridNow.minute
  const dashboardUpcomingEvents = [...visibleEvents].filter(event => event.allDay ? (event.allDayEndDate || nextIsoDay(event.date.slice(0, 10))) > madridNowKey.slice(0, 10) : event.date >= madridNowKey).sort((a, b) => a.date.localeCompare(b.date))
  const dashboardNextEvent = dashboardUpcomingEvents[0]
  const nextEvent = dashboardNextEvent

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
  const refreshWeather = async () => {
    setWeatherLoading(true)
    setWeatherError('')
    try { setWeather(await getWeather({ force: true })) }
    catch (error) { setWeatherError(error.message || 'No se pudo cargar el tiempo.') }
    finally { setWeatherLoading(false) }
  }
  const eventsOn = date => calendarEventsOnDate(visibleEvents, isoDay(date))

  if (frameMode) return <FrameMode clock={clock} nextEvent={nextEvent} onExit={() => setFrameMode(false)} photo={photo} onPhoto={() => setPhoto((photo + 1) % 3)} />

  const period = view === 'week'
    ? `${new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(gridDays[0])} – ${new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(gridDays[6])}`
    : monthTitle(anchor)

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="Nuestra Familia, inicio"><span className="brand-mark"><Icon name="spark" size={20}/></span><span><b>Nuestra Familia</b><small>un lugar para estar al d&iacute;a</small></span></a>
      <div className="top-actions"><button className="frame-button" onClick={() => setFrameMode(true)}><Icon name="camera" size={17}/><span>Modo marco</span></button><button className="avatar-stack" aria-label="Miembros de la familia">{filterPeople.map(p => <span key={p.id} style={{ background: p.color }}>{p.initials}</span>)}</button></div>
    </header>

    <main className="layout" id="inicio">
      <section className="dashboard-masthead">
        <div className="dashboard-weather card"><div className="dashboard-clock-copy"><div className="dashboard-clock">{clock.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div><div className="dashboard-date">{fullDate(clock)}</div></div><WeatherPanel weather={weather} loading={weatherLoading} error={weatherError} onRefresh={refreshWeather}/><button className="today-button compact-today" onClick={goToday}><Icon name="calendar" size={15}/> Hoy</button></div>
        <section className="next-up-card card"><div className="next-up-copy"><span className="section-kicker">LO PR&Oacute;XIMO</span>{dashboardNextEvent ? <><h2>{dashboardNextEvent.title}</h2><p>{dashboardNextEvent.allDay ? 'Todo el d&iacute;a' : dashboardNextEvent.date.slice(11, 16)}{dashboardNextEvent.place ? ' · ' + dashboardNextEvent.place : ''}</p><small>{countdownUntil(dashboardNextEvent, clock) ? 'En ' + countdownUntil(dashboardNextEvent, clock) : eventDateLabel(dashboardNextEvent)}</small></> : <><h2>Sin pr&oacute;ximos eventos</h2><p>No hay actividades futuras en los eventos cargados.</p></>}</div>{dashboardNextEvent && <span className="next-up-member" style={{ '--member-color': eventColor(dashboardNextEvent), '--member-soft': eventSoftColor(dashboardNextEvent) }}>{eventMembers(dashboardNextEvent).map(member => member.name).join(' · ') || (dashboardNextEvent.unassigned ? 'Sin asignar' : '')}</span>}</section>
      </section>

      <div className="content-grid">
        <section className="calendar-card card">
          <div className="calendar-heading"><div><div className="section-kicker">CALENDARIO FAMILIAR</div><h2>{period}</h2>{!schoolMenuPeriodReady && <small className="school-menu-period-note">Menú cargado; falta configurar mes y año</small>}</div><div className="calendar-controls"><div className="segmented"><button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Semana</button><button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Mes</button></div><div className="nav-arrows"><button aria-label="Periodo anterior" onClick={() => move(-1)}><Icon name="chevron" size={17} className="flip"/></button><button aria-label="Periodo siguiente" onClick={() => move(1)}><Icon name="chevron" size={17}/></button></div></div></div>
          <div className="who-filter" aria-label="Filtrar calendario por persona"><span className="who-filter-label">QUIÉN</span><div className="who-filter-options">{[{ id: 'all', name: 'Todos' }, ...filterPeople, { id: 'unassigned', name: 'Sin asignar', color: '#9aa49d', soft: '#f0f2ef' }].map(person => { const isAll = person.id === 'all'; return <button key={person.id} type="button" className={`who-chip ${selectedPerson === person.id ? 'active' : ''} ${isAll ? 'all' : ''}`} style={!isAll ? { '--member-color': person.color, '--member-soft': person.soft } : undefined} aria-pressed={selectedPerson === person.id} onClick={() => setSelectedPerson(person.id)}>{!isAll && <i className="who-chip-dot" />}{person.name}</button> })}</div></div>
          <div className={`calendar-grid ${view}`}><div className="weekday-row">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div><div className="days-grid">{gridDays.map(day => { const dayEvents = eventsOn(day); const dayLunch = menuForDate(day); const isCurrent = day.getMonth() === anchor.getMonth(); const isToday = isoDay(day) === isoDay(new Date()); const isSelected = isoDay(day) === isoDay(selected); return <div key={isoDay(day)} role="group" className={`day-cell ${isCurrent ? '' : 'outside'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => setSelected(atNoon(day))} aria-label={`${fullDate(day)}${dayEvents.length ? `, ${dayEvents.length} eventos` : ''}`}><button type="button" className="day-number day-select" onClick={() => setSelected(atNoon(day))} aria-label={`Seleccionar ${fullDate(day)}`}>{day.getDate()}</button><span className="day-dots">{dayEvents.slice(0, 4).map(e => view === 'month' ? <button type="button" key={e.id} className="month-dot" aria-label={`Abrir ${e.title}`} style={{ background: eventColor(e) }} onClick={click => { click.stopPropagation(); setSelected(atNoon(day)); setDetail(e) }}/> : <i key={e.id} style={{ background: eventColor(e) }}/>)}</span>{view === 'week' && dayEvents.map(e => <button type="button" className={'day-event' + (e.allDay ? ' all-day-event' : '') + (e.unassigned ? ' unassigned-event' : '')} title={e.calendarName} key={e.id} aria-label={'Abrir ' + e.title} onClick={click => { click.stopPropagation(); setSelected(atNoon(day)); setDetail(e) }} style={{ '--event-color': eventColor(e), '--event-soft': eventSoftColor(e) }}><i style={{ background: eventColor(e) }}/><span className="day-event-copy"><span className="day-event-time">{e.allDay ? 'Todo el d\u00eda' : e.date.slice(11, 16)}</span><span className="day-event-title">{e.title}</span></span></button>)}{view === 'week' && dayLunch && <span className="day-menu"><b>COMEDOR</b><span title={dayLunch.status === 'holiday' ? 'Festivo' : `${dayLunch.firstCourse} · ${dayLunch.secondCourse}`}>{dayLunch.status === 'holiday' ? 'Festivo · sin menú' : `1.º ${dayLunch.firstCourse} · 2.º ${dayLunch.secondCourse}`}</span>{dayLunch.status !== 'holiday' && <small title={[dayLunch.saladOrSide, dayLunch.dessert, dayLunch.bread].filter(Boolean).join(' · ')}>{[dayLunch.saladOrSide, dayLunch.dessert, dayLunch.bread].filter(Boolean).join(' · ')}</small>}</span>}</div> })}</div></div>
          <div className="calendar-footer"><span><Icon name="spark" size={15}/> Una semana para compartir</span><span>{visibleEvents.length} planes en agenda</span></div>
        </section>


      </div>
      <section className="lower-cards">

        <article className="home-info-card card"><div className="section-kicker">LISTA FAMILIAR</div><h3>Compra</h3><div className="quiet-empty shopping-empty"><span>Sin lista conectada</span><small>La aplicaci&oacute;n no tiene datos de compra.</small></div></article>

      </section>


      <footer className="footer-note"><span>Hecho con cariño para organizarnos mejor</span><span>✳ <b>Nuestra Familia</b></span></footer>
    </main>

    {detail && <EventDialog event={detail} onClose={() => setDetail(null)}/>}
  </div>
}

function WeatherIcon({ code, isDay = true, size = 28 }) {
  const kind = code === 0 ? (isDay ? 'clear' : 'night')
    : code === 1 ? 'mostly-clear'
      : code === 2 ? 'partly-cloudy'
        : [3].includes(code) ? 'cloudy'
          : [45, 48].includes(code) ? 'fog'
            : [51, 53, 55, 56, 57].includes(code) ? 'drizzle'
              : [61, 63, 65, 66, 67, 80, 81, 82].includes(code) ? 'rain'
                : [71, 73, 75, 77, 85, 86].includes(code) ? 'snow'
                  : [95, 96, 99].includes(code) ? 'storm' : 'unknown'
  const cloud = <path d="M14 34h21a8 8 0 0 0 .5-16 12 12 0 0 0-22.8 3.4A6.4 6.4 0 0 0 14 34Z" />
  const sun = <><circle cx="17" cy="16" r="6"/><path d="M17 4v3m0 18v3M5 16h3m18 0h3M8.5 7.5l2.1 2.1m12.8 12.8 2.1 2.1m0-17-2.1 2.1m-12.8 12.8-2.1 2.1"/></>
  let artwork
  if (kind === 'clear') artwork = sun
  else if (kind === 'night') artwork = <path d="M27 7a14 14 0 1 0 14 21A15 15 0 0 1 27 7Z" />
  else if (kind === 'mostly-clear' || kind === 'partly-cloudy') artwork = <>{sun}{cloud}</>
  else if (kind === 'cloudy') artwork = cloud
  else if (kind === 'fog') artwork = <>{cloud}<path d="M8 39h25m-19 5h25"/></>
  else if (kind === 'drizzle' || kind === 'rain') artwork = <>{cloud}<path d="m18 38-2 4m10-4-2 4m10-4-2 4"/></>
  else if (kind === 'snow') artwork = <>{cloud}<path d="M17 39v6m-2.6-4.5 5.2 3m0-3-5.2 3m11.6-2.5v6m-2.6-4.5 5.2 3m0-3-5.2 3"/></>
  else if (kind === 'storm') artwork = <>{cloud}<path d="m25 35-5 8h5l-2 6 8-10h-5l2-4"/></>
  else artwork = <><circle cx="24" cy="24" r="15"/><path d="M24 14v11m0 6h.01"/></>
  return <svg className="weather-icon-svg" width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{artwork}</svg>
}

function WeatherPanel({ weather, loading, error, onRefresh }) {
  const current = weather && weatherDescription(weather.current.code, weather.current.isDay)
  return <div className="weather-panel" aria-label="Previsión meteorológica de Soto del Henares">
    <div className="weather-main">
      {weather ? <div className="weather-current" title={current[1]}><WeatherIcon code={weather.current.code} isDay={weather.current.isDay} size={40}/><b>{Math.round(weather.current.temperature)}°</b><small>{current[1]}</small></div> : <div className="weather-current weather-current-empty"><span className="weather-current-placeholder">{loading ? '…' : '—'}</span><small>{loading ? 'Cargando' : 'Sin datos'}</small></div>}
      {weather ? <div className="weather-days">{weather.days.map((day, index) => {
        const [, description] = weatherDescription(day.code)
        const date = new Date(`${day.date}T12:00:00`)
        const label = index === 0 ? 'Hoy' : new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).replace('.', '')
        return <div className="weather-day" key={day.date} title={`${label}: ${description}, máxima ${Math.round(day.max)}°, mínima ${Math.round(day.min)}°`}><b>{label}</b><WeatherIcon code={day.code} size={27}/><small>{Math.round(day.max)}° <i>{Math.round(day.min)}°</i></small></div>
      })}</div> : <div className={`weather-message ${error ? 'has-error' : ''}`} role={error ? 'alert' : 'status'}>{loading ? 'Cargando previsión…' : error}</div>}
      <button type="button" className="weather-refresh" onClick={onRefresh} disabled={loading} aria-label="Actualizar previsión" title="Actualizar previsión">↻</button>
    </div>
    <a className="weather-attribution" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Soto del Henares · Weather data by Open-Meteo.com</a>
  </div>
}

function EventCard({ event, onClick }) {
  const members = eventMembers(event)
  const peopleLabel = members.map(member => member.name).join(' · ') || (event.unassigned ? 'Sin asignar' : '')
  return <button className="event-card" onClick={onClick} style={{ '--person-color': eventColor(event), '--person-soft': eventSoftColor(event) }}>
    <span className="event-time"><b>{event.allDay ? 'Todo el d&iacute;a' : event.date.slice(11, 16)}</b></span>
    <span className="event-stripe"/>
    <span className="event-main"><b title={event.title}>{event.title}</b><small>{peopleLabel}{event.calendarName ? `${peopleLabel ? ' · ' : ''}${event.calendarName}` : ''}{event.category ? ' &middot; ' + event.category : ''}</small></span>
    <span className="event-open"><Icon name="chevron" size={17}/></span>
  </button>
}

function EventDialog({ event, onClose }) {
  const members = eventMembers(event)
  const person = members[0]
  const startTime = event.allDay ? '' : event.date?.slice(11, 16)
  const endTime = event.endDateTime?.slice(11, 16)
  const timeText = event.allDay
    ? event.duration || 'Todo el d&iacute;a'
    : endTime
      ? startTime + ' - ' + endTime
      : [startTime, event.duration].filter(Boolean).join(' / ')

  return <div className="modal-backdrop" role="presentation" onClick={onClose}>
    <section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-title" onClick={click => click.stopPropagation()}>
      <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">&times;</button>
      {person && <span className="modal-person" style={{ color: person.color, background: person.soft }}>{person.initials}</span>}
      <span className="section-kicker">DETALLE DE LA ACTIVIDAD</span>
      <h2 id="event-title">{event.title}</h2>
      <div className="modal-tags">
        {event.category && <span className="modal-chip" style={{ color: person?.color, background: person?.soft }}>Categor&iacute;a &middot; {event.category}</span>}
      </div>
      <div className="modal-detail">
        <div className="modal-field"><Icon name="calendar"/><span><small>Fecha</small><b>{eventDateLabel(event)}</b></span></div>
        {timeText && <div className="modal-field"><Icon name="clock"/><span><small>{event.allDay ? 'Horario' : 'Hora'}</small><b>{timeText}</b></span></div>}
        {(members.length > 0 || event.unassigned) && <div className="modal-field"><span className="modal-member-dots">{members.length ? members.map(member => <i key={member.id} style={{ background: member.color }}/>) : <i style={{ background: '#9aa49d' }}/>}</span><span><small>Miembro{members.length === 1 ? '' : 's'}</small><b>{members.map(member => member.name).join(', ') || 'Sin asignar'}</b></span></div>}
        {event.place && <div className="modal-field"><Icon name="pin"/><span><small>Ubicaci&oacute;n</small><b>{event.place}</b></span></div>}
        {event.calendarName && <div className="modal-field"><Icon name="book"/><span><small>Calendario</small><b>{event.calendarName}</b></span></div>}
      </div>
      {event.description && <section className="modal-description"><span>Descripci&oacute;n</span><p>{event.description}</p></section>}
      {event.source === 'ical' && <small className="modal-readonly">Evento importado de iCal · solo lectura.</small>}
    </section>
  </div>
}

const photos = [
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=2200&q=85',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2200&q=85',
]
function FrameMode({ clock, nextEvent, onExit, photo, onPhoto }) {
  const members = nextEvent ? eventMembers(nextEvent) : []
  return <main className="frame-mode" style={{ backgroundImage: `linear-gradient(90deg, rgba(16,26,26,.58), rgba(16,26,26,.03) 80%), url('${photos[photo]}')` }}><button className="frame-exit" onClick={onExit}>× <span>Salir del marco</span></button><button className="photo-next" onClick={onPhoto} aria-label="Siguiente fotografía">›</button><section className="frame-copy"><span className="frame-brand"><Icon name="spark" size={23}/> NUESTRA FAMILIA</span><div className="frame-time">{clock.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div><div className="frame-date">{fullDate(clock, { weekday: 'long', day: 'numeric', month: 'long' })}</div><div className="frame-next"><span className="section-kicker">LO PRÓXIMO EN FAMILIA</span>{nextEvent ? <><b>{nextEvent.title}</b><span>{eventDateLabel(nextEvent)} · {nextEvent.allDay ? 'Todo el día' : nextEvent.date.slice(11, 16)}</span>{members.map((member, index) => <i key={member.id} style={{ background: member.color, right: `${16 + index * 29}px` }}>{member.initials}</i>)}{!members.length && nextEvent.unassigned && <small>Sin asignar</small>}</> : <b>Un día para disfrutar juntos</b>}</div></section><div className="frame-caption">Un momento tranquilo en casa <span>·</span> {photo + 1} / {photos.length}</div></main>
}

export default App
