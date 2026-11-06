# Deriva Jurídico

Portal web de publicaciones jurídicas centrado en Derecho Civil y Arbitraje. El sitio permite organizar artículos y presenta páginas de detalle con metadatos para compartir contenido en redes sociales.

## Tecnologías

- HTML, CSS y JavaScript.
- Firebase Hosting.
- Firebase Authentication, Firestore y Storage.
- Cloud Functions para generar metadatos de vista previa.

## Estructura

- `public/`: sitio web publicado.
- `functions/`: función que prepara los metadatos de las páginas de detalle.
- `firebase.json`: configuración de Hosting y Functions.

## Desarrollo y despliegue

Instala Firebase CLI y configura el proyecto de Firebase correspondiente antes de usar los emuladores o desplegar:

```bash
cd functions
npm install
npm run serve
```

La versión alojada ya no está en línea. El repositorio conserva el código fuente y la configuración del proyecto; no contiene credenciales de despliegue.
