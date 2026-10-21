# Integración de Google Calendar

La conexión se ejecuta en el navegador mediante Google Identity Services. Solicita únicamente `https://www.googleapis.com/auth/calendar.readonly`, consulta la lista de calendarios de la cuenta y deja seleccionar hasta dos. Los eventos de Google se mantienen separados de los eventos locales y se guardan solo en memoria; al cerrar o recargar la página hay que conectar de nuevo.

## Configuración de Google Cloud

1. Habilita **Google Calendar API** en el proyecto de Google Cloud.
2. Configura la pantalla de consentimiento OAuth y un cliente OAuth de tipo **Aplicación web**.
3. En **Orígenes autorizados de JavaScript**, añade `http://localhost:5173` y `https://fberme84.github.io`. Usa solo los orígenes, sin `/familia/`.
4. El flujo emergente de Google Identity Services no utiliza una URI de redirección ni un secreto de cliente en el navegador.
5. Para uso personal, puedes mantener el consentimiento en **Testing** y añadir tu cuenta como usuario de prueba. `calendar.readonly` es un permiso sensible; una app destinada al público general puede requerir verificación de Google.

## Probar en local

Crea `.env.local` en la raíz del proyecto con el ID público del cliente web:

```dotenv
VITE_GOOGLE_CLIENT_ID=tu-id-de-cliente-web.apps.googleusercontent.com
```

Después ejecuta `npm run dev`, abre la dirección local de Vite y pulsa **Conectar Google Calendar**. Autoriza el acceso, abre **Elegir calendarios**, selecciona el calendario familiar y el de carreras entre los calendarios que devuelve Google, y asigna cada uno a un miembro para aplicar el filtro «Quién» y su color. Cada calendario empieza asignado a Fer; puedes cambiarlo.

La app pide de nuevo autorización cuando el token temporal caduca. No copies tokens a archivos, almacenamiento del navegador ni logs.

## GitHub Pages

En el repositorio abre **Settings → Secrets and variables → Actions → Variables** y crea `VITE_GOOGLE_CLIENT_ID` con el ID del cliente web. El workflow `.github/workflows/deploy.yml` pasa esa variable solamente al paso `npm run build`, que es cuando Vite la incorpora al frontend. El ID es público; no pongas aquí un secreto OAuth.

La variable no es obligatoria para compilar. Si falta, la aplicación explica cómo configurarla cuando se intenta conectar. El workflow conserva el disparador y los pasos de despliegue existentes.
