# Publicacion Android con Trusted Web Activity

La app principal de Mango debe seguir siendo web. Para Play Store se crea un wrapper Android que abre la PWA en pantalla completa con Trusted Web Activity.

## Por que TWA

- Un solo producto: la web es la fuente de verdad.
- La app de Play Store se siente nativa y fullscreen.
- Las actualizaciones funcionales llegan al desplegar la web.
- Google valida que el sitio y la app pertenecen al mismo desarrollador usando Digital Asset Links.

## Requisitos

1. Dominio propio con HTTPS.
2. PWA instalable:
   - `manifest.webmanifest`
   - `service worker`
   - iconos maskable
   - `start_url` estable
3. Android project generado con Bubblewrap.
4. `assetlinks.json` publicado en:

```text
https://TU-DOMINIO/.well-known/assetlinks.json
```

5. Target SDK vigente para Google Play. Desde el 31 de agosto de 2025, apps nuevas y actualizaciones deben apuntar a Android 15 / API 35 o superior.

## Flujo recomendado

```bash
npm run build
npx @bubblewrap/cli init --manifest https://TU-DOMINIO/manifest.webmanifest
npx @bubblewrap/cli build
```

Luego se sube el Android App Bundle (`.aab`) a Play Console.

## Decision tecnica

Mantener `apps/android` como artefacto generado o semigenerado. No meter logica de negocio nativa salvo que sea inevitable. La logica financiera vive en la web.
