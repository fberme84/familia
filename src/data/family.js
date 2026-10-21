// Datos de muestra. Sustituye este módulo al importar calendarios en el futuro.
export const family = [
  { id: 'vera', name: 'Vera', role: 'Colegio', initials: 'V', color: '#8d7be7', soft: '#f0edff' },
  { id: 'pablo', name: 'Pablo', role: 'Colegio & bici', initials: 'P', color: '#e5a44f', soft: '#fff2df' },
  { id: 'laura', name: 'Laura', role: 'Máster', initials: 'L', color: '#57a995', soft: '#e5f5f0' },
  { id: 'family', name: 'Familia', role: 'Planes juntos', initials: 'F', color: '#e47f86', soft: '#ffebed' },
]

const date = (day, hour = '09:00') => `2026-10-${String(day).padStart(2, '0')}T${hour}:00`

export const events = [
  { id: 'e1', date: date(19, '08:30'), title: 'Lengua y literatura', person: 'vera', category: 'Clases', place: 'Colegio · Aula 2B', duration: '1 h 30 min' },
  { id: 'e2', date: date(19, '17:30'), title: 'Entrenamiento de ciclismo', person: 'pablo', category: 'Entrenamiento', place: 'Polideportivo municipal', duration: '1 h' },
  { id: 'e3', date: date(20, '09:00'), title: 'Examen de matemáticas', person: 'vera', category: 'Exámenes', place: 'Colegio · Aula 2B', duration: '1 h' },
  { id: 'e4', date: date(20, '18:00'), title: 'Seminario de innovación', person: 'laura', category: 'Máster', place: 'Campus virtual', duration: '2 h' },
  { id: 'e5', date: date(21, '08:30'), title: 'Ciencias naturales', person: 'vera', category: 'Clases', place: 'Colegio · Aula 2B', duration: '1 h' },
  { id: 'e6', date: date(21, '16:30'), title: 'Revisión del proyecto', person: 'laura', category: 'Tareas', place: 'Biblioteca', duration: '1 h 30 min' },
  { id: 'e7', date: date(21, '18:00'), title: 'Entrenamiento en pista', person: 'pablo', category: 'Entrenamiento', place: 'Velódromo', duration: '1 h 30 min' },
  { id: 'e8', date: date(22, '10:00'), title: 'Presentación de ciencias', person: 'vera', category: 'Tareas', place: 'Colegio · Aula 2B', duration: '45 min' },
  { id: 'e9', date: date(22, '18:30'), title: 'Clase de análisis de datos', person: 'laura', category: 'Máster', place: 'Campus virtual', duration: '2 h' },
  { id: 'e10', date: date(23, '17:00'), title: 'Salida en bicicleta', person: 'pablo', category: 'Ciclismo', place: 'Parque del río', duration: '2 h' },
  { id: 'e11', date: date(23, '19:00'), title: 'Preparar exposición', person: 'vera', category: 'Tareas', place: 'En casa', duration: '1 h' },
  { id: 'e12', date: date(24, '09:30'), title: 'Carrera ciclista · La vuelta verde', person: 'pablo', category: 'Carrera', place: 'Paseo de la Estación', duration: 'Mañana' },
  { id: 'e13', date: date(24, '13:30'), title: 'Comida en casa de los abuelos', person: 'family', category: 'Familia', place: 'Casa de los abuelos', duration: '2 h' },
  { id: 'e14', date: date(25, '11:00'), title: 'Paseo por el jardín botánico', person: 'family', category: 'Familia', place: 'Jardín botánico', duration: '2 h' },
  { id: 'e15', date: '2026-10-27T09:00:00', title: 'Control de lectura', person: 'vera', category: 'Exámenes', place: 'Colegio · Aula 2B', duration: '45 min' },
  { id: 'e16', date: '2026-11-03T18:00:00', title: 'Entrega trabajo final', person: 'laura', category: 'Máster', place: 'Campus virtual', duration: 'Todo el día' },
]

export const lunchMenu = {
  title: 'Menú del comedor', note: 'Menú ficticio de ejemplo · Semana del 19 al 23 oct.',
  meals: [
    { day: 19, first: 'Crema de calabaza', main: 'Tortilla de patata', side: 'Ensalada de temporada', dessert: 'Fruta de temporada' },
    { day: 20, first: 'Lentejas con verduras', main: 'Merluza al horno', side: 'Arroz blanco', dessert: 'Yogur natural' },
    { day: 21, first: 'Macarrones con tomate', main: 'Pollo al horno', side: 'Patatas asadas', dessert: 'Manzana' },
    { day: 22, first: 'Garbanzos guisados', main: 'Albóndigas caseras', side: 'Verduras salteadas', dessert: 'Pera' },
    { day: 23, first: 'Arroz con verduras', main: 'Pescado del día', side: 'Ensalada verde', dessert: 'Plátano' },
  ],
}
