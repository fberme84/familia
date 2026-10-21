# Nuestra Familia

Panel familiar de demostración creado con React y Vite. Incluye calendario semanal y mensual, filtros por miembro, agenda diaria, menú escolar ficticio y modo marco de fotos. La integración opcional de Google Calendar mantiene los tokens solo en memoria.

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

## Datos de demostración

Los eventos, integrantes y menús están en `src/data/family.js`, separados de los componentes visuales. Todos los datos son ficticios. No añadas información familiar personal a este repositorio público.

## Integración de Google Calendar

Consulta [GOOGLE-CALENDAR.md](GOOGLE-CALENDAR.md) para configurar OAuth, probar en local y pasar el ID público al build de GitHub Pages.
