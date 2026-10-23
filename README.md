# Nuestra Familia

Panel familiar creado con React y Vite. Incluye calendario semanal y mensual, filtros por miembro, men?s escolares, meteorolog?a y modo marco de fotos. Los eventos visibles proceden de los tres feeds iCal; la aplicaci?n no a?ade actividades de demostraci?n.

## Requisitos

- Node.js 20 o posterior
- npm

## Ejecutar localmente

```bash
npm install
npm run dev
```

Vite mostrará la dirección local en la terminal. Para generar y previsualizar la versión de producción:

```bash
npm run build
npm run preview
```

## Publicar en GitHub Pages

El proyecto está preparado para el repositorio `familia` con la ruta base `/familia/`.

1. Sube estos archivos a la rama `main` del repositorio `familia` en GitHub.
2. En GitHub, abre **Settings → Pages** y selecciona **GitHub Actions** como origen de publicación.
3. El workflow `.github/workflows/deploy.yml` compilará el proyecto y publicará cada actualización de `main`. También puede iniciarse desde la pestaña **Actions**.
4. La web estará disponible en `https://<tu-usuario>.github.io/familia/` cuando termine correctamente el workflow.

## Datos locales

Los perfiles y colores de los integrantes est?n en `src/data/family.js`. Los eventos se importan desde `src/data/icalEvents.json`; el men? escolar est? en `src/data/schoolMenu.json`.

## Fuentes iCal

La aplicación combina los calendarios familiar, máster y carreras mediante el generador iCal. Para la configuración local y la validación, consulta [docs/ICAL-TESTS.md](docs/ICAL-TESTS.md).
