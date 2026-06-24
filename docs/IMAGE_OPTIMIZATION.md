# Optimización del peso de imágenes

Estado del trabajo de optimización de imágenes en DECYCLES. Este documento es
el punto de partida para cualquier sesión futura (humana o Claude) que retome
el tema: explica qué quedó hecho, cómo funciona y **qué queda pendiente**.

Rama de trabajo: `claude/image-weight-optimization-t5yw0a`
Commit principal: `c6d8758` — "Optimize image weight: WebP assets, client-side
upload compression, lazy loading".

---

## Contexto

Había tres fuentes de peso:

1. **Assets estáticos del repo** (`assets/`): avatares y portada por defecto en
   PNG 1024×1024 (~1.8 MB cada uno). ~15 MB que se empaquetaban en cada build.
2. **Subidas de usuarios/creadores**: las imágenes se subían a Firebase Storage
   **sin comprimir ni redimensionar** — una foto de móvil de 5-8 MB se guardaba
   y se servía tal cual a cada visitante.
3. **Renderizado**: sin `loading="lazy"`, el navegador descargaba imágenes fuera
   de pantalla.

Decisión de formato: **WebP** (no AVIF por complejidad/velocidad de encode, no
"webm" que es vídeo). Soporte ~97% de navegadores.

---

## ✅ Hecho

### 1. Assets del repo → WebP (`assets/`: ~15 MB → 468 KB)
- Avatares de usuario `assets/avatars/users/avatarNN.webp` (512², ~25-31 KB).
- Avatar de tienda `assets/avatars/avatar-creator.webp` (512², ~26 KB).
- Portada `assets/cover-creator/cover-creator.webp` (≤1280px, ~92 KB).
- `assets/thumbnail.png` (tarjeta social Open Graph) **se mantiene PNG a
  propósito** —algunos scrapers de redes no renderizan WebP— pero re-comprimido
  (368 KB → 154 KB).
- Referencias actualizadas en `src/data.ts` y `src/lib/defaultAvatars.ts`.
- Script reutilizable: **`npm run optimize:assets`** (`scripts/optimize-assets.cjs`,
  usa `sharp`). Para futuros assets: deja el PNG/JPG en `assets/` y corre el
  script; convierte a `.webp` y borra el original.

### 2. Subidas futuras → compresión en cliente (sin coste de servidor)
- Nuevo módulo `src/lib/imageCompression.ts`: redimensiona a un borde máximo de
  **1600px** y re-codifica a **WebP calidad 0.82** vía `canvas`, sin dependencias.
  - Respeta orientación EXIF (fotos verticales de móvil no salen giradas).
  - Fallback seguro: SVG, GIF animado, fallo de decodificación o navegador sin
    WebP → sube el original sin romper la subida.
  - Se queda con el archivo más pequeño (no agranda imágenes ya diminutas).
- `src/lib/upload.ts` aplica `compressImage` a **todas** las subidas (avatares de
  usuario y tienda, portadas de tienda y evento, galerías de tienda y evento).
  Acepta override de `{ maxDimension, quality }` o `false` para subir sin tocar.

### 3. Lazy loading
- `loading="lazy"` + `decoding="async"` en imágenes fuera de pantalla.

### Tooling / dependencias
- `sharp` añadido como `devDependency` (solo build-time / scripts admin; **no**
  se usa en el navegador ni en producción runtime).
- Scripts en `package.json`: `optimize:assets`, `optimize:storage`.
- `tsc --noEmit` (lint) pasa sin errores.

---

## ⏳ Pendiente

### B) Re-comprimir las imágenes que los usuarios YA subieron a Storage
Las subidas **antiguas** (anteriores a la compresión en cliente) siguen pesadas
en el bucket de Firebase Storage y referenciadas desde Firestore. Hay un script
listo pero **no ejecutado** porque requiere credenciales de admin.

- Script: **`scripts/optimize-storage-images.cjs`** (`npm run optimize:storage`).
- Qué hace: recorre `creators/{id}` (profileImage, coverImage, creatorImage,
  gallery[].url, events[].coverImage, events[].gallery[].url) y `users/{id}`
  (profileImage, photoURL); por cada imagen en nuestro bucket la descarga,
  re-encoda a WebP (≤1600px, q82), sube el `.webp`, actualiza el campo en
  Firestore y **borra el original**. También reescribe rutas de defaults
  `/.../*.png` → `.webp`. Es **idempotente** (marca `metadata.optimized = "1"`).
- Bucket objetivo: `decycles-web-app-1777399378.firebasestorage.app`.

**Cómo ejecutarlo (cuando haya credenciales):**
1. Colocar el service account JSON en la raíz del repo como
   `serviceAccountKey.json` (mismo convenio que el resto de scripts admin;
   está en `.gitignore`, **nunca commitear**).
2. Dry run (solo reporta, no modifica nada):
   ```
   node scripts/optimize-storage-images.cjs
   ```
3. Desplegar antes el build que sirve los defaults `.webp` (`npm run deploy`).
4. Aplicar de verdad (re-encoda, reescribe Firestore y borra originales):
   ```
   node scripts/optimize-storage-images.cjs --apply
   ```

### Otros (opcional, no bloqueante)
- **Deploy a producción**: estos cambios viven en la rama; entran en producción
  con `npm run deploy` (requiere credenciales de Firebase).
- **`<picture>` / srcset responsivo**: si en el futuro se quiere afinar más, se
  podrían servir tamaños distintos por breakpoint. Hoy no es necesario.
- **AVIF**: comprimiría algo más que WebP, a cambio de encode más lento y soporte
  algo menor. No prioritario.

---

## Resumen rápido para retomar

| Frente | Estado | Dónde |
|---|---|---|
| Assets del repo → WebP | ✅ hecho | `assets/`, `scripts/optimize-assets.cjs` |
| Compresión de subidas (cliente) | ✅ hecho | `src/lib/imageCompression.ts`, `src/lib/upload.ts` |
| Lazy loading | ✅ hecho | componentes `.tsx` |
| Backlog de Storage (punto B) | ⏳ pendiente — falta `serviceAccountKey.json` | `scripts/optimize-storage-images.cjs` |
| Deploy a producción | ⏳ pendiente — falta credencial Firebase | `npm run deploy` |
