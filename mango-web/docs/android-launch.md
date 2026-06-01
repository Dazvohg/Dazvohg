# CheMonei — Lanzamiento Android (Capacitor 5)

Guía completa para generar el AAB firmado y subirlo a Google Play Console.

---

## Requisitos previos

| Requisito | Dónde obtenlo |
|-----------|---------------|
| Java 17+ | `sudo apt install openjdk-17-jdk` / [Adoptium](https://adoptium.net) |
| Android Studio Iguana 2023.2+ | [developer.android.com/studio](https://developer.android.com/studio) |
| Android SDK Build Tools 35 | Android Studio → SDK Manager → API 35 |
| Node 20+ + npm | ya instalado |
| Google Play Console (cuenta US$25) | [play.google.com/console](https://play.google.com/console) |

---

## Paso 1 — Instalar dependencias y agregar plataforma Android

```bash
cd mango-web

# Instalar Capacitor (ya declarado en package.json)
npm install

# Agregar la plataforma Android (genera la carpeta android/)
npx cap add android
```

Esto crea `android/` con el proyecto Gradle. Solo se hace **una vez**.

---

## Paso 2 — Build y sync

Cada vez que cambies la app web:

```bash
# Atajo declarado en package.json:
npm run android:sync

# Equivale a:
npm run build          # genera dist/
npx cap sync android   # copia dist/ → android/app/src/main/assets/public
```

---

## Paso 3 — Configurar íconos y splash en Android Studio

```bash
npm run android:open   # abre el proyecto en Android Studio
```

Dentro de Android Studio:

1. **Íconos adaptativos**: `res/` → `New → Image Asset`
   - Foreground: `public/icons/icon-512-maskable.png` (ya es maskable, full-bleed)
   - Background: color `#0A1628` (navy CheMonei)
2. **Splash screen**: ya configurado vía `capacitor.config.ts` → `SplashScreen.backgroundColor: #0A1628`

---

## Paso 4 — Crear keystore para firma

Guardar el keystore en un lugar **seguro y con backup** (si se pierde, no podés actualizar la app).

```bash
keytool -genkey -v \
  -keystore chemonei-release.jks \
  -alias chemonei \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Anota la contraseña del keystore y del alias — se necesitan en cada build.

---

## Paso 5 — Configurar firma en Gradle

Editar `android/app/build.gradle`:

```groovy
android {
    // ... existente ...

    signingConfigs {
        release {
            storeFile file("../../chemonei-release.jks")   // ruta relativa a android/app/
            storePassword "TU_KEYSTORE_PASSWORD"
            keyAlias "chemonei"
            keyPassword "TU_KEY_PASSWORD"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

> **Alternativa más segura**: usar variables de entorno en lugar de hardcodear passwords:
> ```groovy
> storePassword System.getenv("KEYSTORE_PASSWORD") ?: ""
> keyPassword System.getenv("KEY_PASSWORD") ?: ""
> ```

---

## Paso 6 — Generar AAB firmado

```bash
cd android
./gradlew bundleRelease
```

El AAB quedará en:
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## Paso 7 — Obtener SHA-256 del certificado (para assetlinks.json)

```bash
keytool -list -v \
  -keystore chemonei-release.jks \
  -alias chemonei \
  | grep "SHA256:"
```

Copiar el fingerprint (formato `AA:BB:CC:...`) y reemplazarlo en:

```
mango-web/public/.well-known/assetlinks.json
```

Campo `sha256_cert_fingerprints`. Luego hacer `npm run build` y redeploy para que el archivo quede publicado en `https://usechemonei.app/.well-known/assetlinks.json`.

---

## Paso 8 — Configurar target SDK 35

En `android/app/build.gradle` verificar:

```groovy
android {
    compileSdk 35

    defaultConfig {
        targetSdk 35
        minSdk 26       // Android 8.0 — cubre >95% de dispositivos activos
        // ...
    }
}
```

Capacitor 5 ya configura esto por defecto al agregar la plataforma.

---

## Paso 9 — Subir a Google Play Console

1. Entrar a [play.google.com/console](https://play.google.com/console)
2. **Crear app** → Android → Nombre: "CheMonei" → No es un juego → Gratis
3. **Completar ficha de Play Store**:
   - Ícono: `public/icons/icon-512.png` (512×512)
   - Feature graphic: 1024×500px (generar con Canva o Figma — pendiente)
   - Descripción corta (80 chars): *"Finanzas personales + simulador de inversiones para Argentina"*
   - Capturas de pantalla: al menos 2 (teléfono)
4. **Producción → Versiones → Crear versión → Subir AAB**
5. **Content rating**: completar cuestionario (finanzas = sin restricciones)
6. **Privacidad**: URL → `https://usechemonei.app/legal/privacy`
7. **Términos**: URL → `https://usechemonei.app/legal/tos`
8. Enviar revisión (tarda 1-7 días)

---

## Digital Asset Links (TWA verification)

Para que la app se abra en modo fullscreen (sin barra de URL de Chrome), el dominio debe verificar el ownership:

1. Subir la app UNA VEZ a Play Console (internal testing es suficiente)
2. En Play Console → App Signing → copiar el SHA-256 del **App Signing Certificate** (no el del upload key)
3. Pegar ese SHA-256 en `assetlinks.json` → redeploy
4. Verificar en: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://usechemonei.app&relation=delegate_permission/common.handle_all_urls`

---

## Flujo de actualizaciones

```bash
# 1. Editar código en src/
# 2. Buildear y sincronizar
npm run android:sync

# 3. Generar nuevo AAB (incrementar versionCode en android/app/build.gradle)
cd android && ./gradlew bundleRelease

# 4. Subir AAB en Play Console → Producción → Nueva versión
```

Cada nueva versión en Play Store requiere incrementar `versionCode` (número entero).

---

## Checklist pre-lanzamiento

- [ ] `assetlinks.json` con SHA-256 real del App Signing Certificate
- [ ] `targetSdk 35` en build.gradle
- [ ] Feature graphic 1024×500 creado
- [ ] 2+ capturas de pantalla reales de la app
- [ ] Privacy Policy URL funcionando: `https://usechemonei.app/legal/privacy`
- [ ] TOS URL funcionando: `https://usechemonei.app/legal/tos`
- [ ] Keystore guardado en lugar seguro (Bitwarden, Google Drive cifrado, etc.)
- [ ] Content rating completado en Play Console
- [ ] AAB firmado con release keystore (no debug)
- [ ] Build libre de errores: `npx tsc --noEmit && npm run build`

---

## Troubleshooting

**Error: `JAVA_HOME not set`**
```bash
export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
```

**Error: `SDK location not found`**
Crear `android/local.properties`:
```
sdk.dir=/home/TU_USUARIO/Android/Sdk
```

**Error: `minSdk too low`**
Capacitor 5 requiere minSdk 22+. Recomendado: 26 (Android 8.0).

**La app muestra barra de URL de Chrome**
→ `assetlinks.json` no está publicado o el SHA-256 no coincide. Verificar con el link de Digital Asset Links de arriba.
