# 05 · Arquitectura y modelo de datos

Última revisión: 2026-08-16 · Estado: Vivo

> Este documento describe **lo que hay**, no lo que debería haber. Las opiniones
> van marcadas como ⚠️ *Riesgo* o 💡 *Propuesta*. Los cambios estructurales
> requieren ADR antes de código.

---

## 1. Stack

| Capa | Tecnología | Notas |
|---|---|---|
| UI | React 19 + TypeScript 5.8 | SPA, sin SSR |
| Build | Vite 6 | `npm run dev` en puerto 3000 |
| Estilos | Tailwind v4 (`@tailwindcss/vite`) + `src/index.css` | Tokens vía `@theme` |
| Routing | React Router v7 | Deep links a `/creator/:id`, `/event/:creatorId/:eventIdx` |
| Estado | React Context (`Auth`, `UI`, `Language`, `Categories`) | Sin librería de estado externa |
| Datos | Firebase v12 — Firestore, Auth, Storage | Suscripciones en tiempo real (`onSnapshot`) |
| Backend | Cloud Functions (v2 para triggers/callables, v1 https para meta) | Node |
| Mapa | Leaflet 1.9 + react-leaflet 5 | + `leaflet-gesture-handling` |
| Animación | `motion` v12 (Framer Motion) | |
| UI extra | `@dnd-kit` (orden de galería), `react-easy-crop`, `react-dropzone`, `lucide-react` | |
| Hosting | Firebase Hosting, proyecto `decycles-web-app-1777399378` | Deploy manual: `npm run deploy` |
| Analítica | GA4 vía `gtag.js` directo | Ver [`06`](./06-metricas.md) |

---

## 2. Mapa de rutas

**Público**
- `/` — Home: pestañas EXPLORE / GALLERY / EVENTS, vista grid o mapa, búsqueda,
  filtros por categoría, subcategoría y país.
- `/welcome` — landing de bienvenida.
- `/event/:creatorId/:eventIdx` — página de evento (indexable, con metadatos
  servidos por la función `eventMeta`).
- `/creator/:id` — redirección legacy: abre el modal de perfil sobre la home.
- `/reset-password` — flujo de recuperación.

**Autenticado**
- `/profile/edit` — portal del creador.
- `/favorites` — creadores y eventos guardados.
- `/my-events` — **editor de eventos del creador** (carga `creators/{uid}` y
  muestra los asistentes de cada evento). ⚠️ Pese al nombre, **no** es la lista
  de eventos a los que el usuario ha confirmado asistencia: esa pantalla no
  existe. Además, el menú de perfil enlaza aquí y a `/profile/edit` para
  cualquier usuario autenticado, sin comprobar el rol. Ver
  [`14`](./14-recurrencia-usuarios.md) §2.

**Admin** (`ProtectedRoute requiredRole="admin"`)
- `/admin` dashboard · `/admin/users` · `/admin/creators` (+ `new`, `edit/:id`)
  · `/admin/categories` · `/admin/filters`.

**Modales globales** montados en `App.tsx`: Join, perfil de creador, evento,
banner de cookies. Y un `BlockedScreen` que anula todas las rutas si
`users/{uid}.blocked` es true (excepto `/reset-password`).

---

## 3. Modelo de datos (Firestore)

### `users/{uid}`
Campos observados: `email`, `firstName`, `lastName`, `name`, `role`
(`user` | `creator` | `admin`), `blocked`, imagen de perfil, marcas temporales.

- El rol se sincroniza a un **custom claim** `admin` mediante la función
  `syncAdminClaim` (trigger `onDocumentWritten`). Las reglas leen el claim, no
  el documento: cero lecturas cruzadas.
- `AuthContext` se **suscribe** al documento, así que un cambio de rol o un
  bloqueo hecho por un admin surte efecto en la sesión abierta al instante.

### `creators/{creatorId}`
El documento central. El id **es el uid** cuando el creador se gestiona a sí
mismo. Definido en [`src/types.ts`](../../src/types.ts):

`name`, `description`, `website`, `socials{instagram,facebook,twitter}`,
`profileImage`, `coverImage`, `gallery[]`, `categories[]`, `subCategories[]`,
`location`, `country`, `address`, `coordinates [lat,lng]`, `eventDate`,
`endDate`, `recurringEvent`, `creatorName`, `creatorImage`, `creatorId`,
`views`, `isPublished`, `events[]`, `filters[]`.

⚠️ **Riesgo 1 — el documento hace dos trabajos.** `creators` guarda tanto perfiles
como eventos (`eventDate`, `endDate`, `recurringEvent`, y además un array
`events[]` anidado). Toda la aplicación filtra en cliente para separar unos de
otros. Consecuencias: consultas imposibles de indexar, documentos que crecen sin
límite, y `views` que ya no se sabe si cuenta perfil o evento.

⚠️ **Riesgo 2 — tipado con escotilla.** `Category` y `SubCategory` terminan en
`| string`, lo que anula la comprobación de tipos. Los datos reales ya contienen
variantes con distinta capitalización (`"SERVICES"`, `"road"` vs `"Road"`,
`"frame building"`). Es una fuente garantizada de filtros que no encuentran nada.

⚠️ **Riesgo 3 — `gallery: any[]` y `events: any[]`.** Sin contrato. Nadie sabe
qué forma tienen sin abrir Firestore.

### `taxonomy/{docId}`
Categorías, subcategorías y grupos de filtros gestionados desde `/admin`.
Lectura pública, escritura solo admin. Es la taxonomía viva; los arrays de
[`src/constants/categories.ts`](../../src/constants/categories.ts) actúan como
semilla y respaldo.

### `rsvps/{creatorId}_{eventIdx}_{userId}`
Un documento por (evento, usuario). El id compuesto hace la deduplicación
implícita — decisión buena y barata. Lectura pública (para contar), escritura
solo del propio usuario.

⚠️ **Riesgo 4 — el id depende del índice del evento.** Si un creador reordena o
borra un evento del array, los RSVP existentes apuntan al evento equivocado.

### `events/{eventId}`
⚠️ **Colección muerta.** No la usa ningún componente de `src/`, pero las reglas
permiten **escritura a cualquier usuario autenticado**
(`allow write: if isSignedIn()`). Superficie de abuso sin ningún beneficio.

---

## 4. Reglas de seguridad — revisión

Estado en [`firestore.rules`](../../firestore.rules) y
[`storage.rules`](../../storage.rules).

**Lo que está bien resuelto:**
- El claim `admin` evita lecturas cruzadas en las reglas: rápido y gratis.
- Storage segmentado por `creators/{uid}/**` y `users/{uid}/**`.
- Limpieza automática de imágenes huérfanas y en cascada al borrar cuenta
  (`cleanupCreatorImages`, `cleanupUserImages`).

**Lo que hay que revisar** (no cambiar sin ADR — cada punto tiene contexto):

| # | Regla | Problema | Severidad |
|---|---|---|---|
| A | `users/{userId}` → `allow read: if true` | **Todos los documentos de usuario son públicos**, incluidos correos y nombres reales. Cualquiera puede volcar la colección desde el cliente. Riesgo de privacidad y de RGPD | 🔴 Alta |
| B | `creators` → cláusula `hasOnly(['views'])` sin `isSignedIn()` | Cualquiera, sin autenticar, puede escribir el campo `views` con **cualquier valor**. El contador no es fiable y es manipulable | 🟠 Media |
| C | `events` → `allow write: if isSignedIn()` | Colección sin uso, escribible por cualquier autenticado | 🟠 Media |
| D | Storage → `allow read: if true` en todo el bucket | Correcto para imágenes públicas, pero significa que **cualquier cosa** que se suba ahí es pública. Ningún fichero privado puede vivir en este bucket | 🟡 Baja hoy, alta si se suben documentos |

💡 **Propuesta A** (la más urgente): partir el perfil en un documento público
mínimo (nombre, avatar) y datos privados en subcolección o restringidos a
`request.auth.uid == userId || isAdmin()`. Requiere tocar `AuthContext` y el
panel de admin: es un ADR.

💡 **Propuesta B**: mover el conteo de visitas a un `onCall` de Cloud Function
con límite de frecuencia, o directamente derivarlo de GA4 y dejar de escribir en
Firestore desde el cliente.

---

## 5. Cloud Functions

| Función | Tipo | Qué hace |
|---|---|---|
| `syncAdminClaim` | Firestore trigger | Espeja `users/{uid}.role` → custom claim `admin`. Se queda en la SA por defecto porque Eventarc necesita `receiveEvent` |
| `cleanupCreatorImages` | Firestore trigger | Borra de Storage las imágenes que dejan de estar referenciadas |
| `cleanupUserImages` | Firestore trigger | Igual, para usuarios |
| `adminUpdateUserEmail` | `onCall` | Cambio de email desde el panel admin |
| `adminDeleteUser` | `onCall` | Borrado completo (Auth + Firestore + Storage en cascada) |
| `adminListOrphanedUsers` | `onCall` | Detecta cuentas de Auth sin documento en Firestore |
| `eventMeta` | https v1 | Renderiza metadatos OG/SEO para `/event/...` |
| `creatorMeta` | https v1 | Renderiza metadatos OG/SEO para fichas de creador |

`eventMeta` y `creatorMeta` son la pieza que hace **posible el SEO en una SPA**:
sirven `functions/template.html` con las etiquetas rellenas para los rastreadores.
Es un activo estratégico — cualquier cambio en la estructura de la home o del
build (`cp dist/index.html functions/template.html` en el script de deploy)
puede romperlo en silencio.

⚠️ **Riesgo:** no hay ninguna comprobación automática de que los metadatos se
sigan generando correctamente después de un deploy.

---

## 6. Rendimiento y coste

**El punto caliente:** `useCreators` mantiene un `onSnapshot` sobre la
**colección `creators` completa**, sin filtro ni paginación. Cada cliente
descarga todos los documentos, incluidos los no publicados, y recibe cada
cambio de cualquier ficha.

| Escala | Comportamiento |
|---|---|
| ~200 fichas | Bien. Filtrado en cliente instantáneo, coste despreciable |
| ~2.000 fichas | Carga inicial pesada en móvil; lecturas de Firestore empiezan a notarse en factura |
| ~20.000 fichas | Insostenible. Hay que paginar, filtrar en servidor e indexar la búsqueda |

💡 **Secuencia propuesta** (cuando el número lo pida, ver principio P10):
1. Filtrar por `isPublished` en la consulta, no en cliente.
2. Consultas por país/categoría con índices compuestos.
3. Separar eventos a su propia colección con consultas por rango de fecha.
4. Búsqueda de texto a un servicio dedicado (Algolia/Typesense) o a un índice
   derivado.
5. Paginación o carga por viewport en el mapa.

**Peso de imágenes:** ya hay un trabajo hecho — WebP, compresión en cliente al
subir, `loading="lazy"`. Estado y pendientes en
[`docs/IMAGE_OPTIMIZATION.md`](../IMAGE_OPTIMIZATION.md). Sigue pendiente el
barrido del histórico en Storage.

---

## 7. Deploy y entornos

```
npm run dev       # Vite en :3000
npm run lint      # tsc --noEmit  ← la única verificación automática que existe
npm run build     # build de producción
npm run deploy    # build + copia template + sitemap + firebase deploy
npm run seed      # semilla de datos
```

⚠️ **Riesgos operativos:**
- **Un solo proyecto Firebase.** No hay staging. Cualquier prueba de reglas,
  funciones o migración se hace contra producción.
- **Sin CI.** El deploy es un comando manual desde la máquina de alguien. No hay
  ninguna comprobación previa automática.
- **Sin tests.** Ni unitarios, ni de integración, ni de reglas de seguridad. El
  emulador de Firebase permite testear reglas: es el test de mayor valor por
  esfuerzo que se puede añadir.
- **Artefactos de deploy commiteados.** Varios commits del historial son "Sync
  deploy artifacts": salida de build dentro del repo.

💡 **Propuesta mínima de higiene** (S, alto valor): proyecto de staging + GitHub
Action que ejecute `tsc --noEmit` y el build en cada PR.

---

## 8. Higiene del repositorio

Cosas que confunden a cualquiera que llegue nuevo — incluido un modelo leyendo
el repo:

- `script.js`, `script2.js` … `script5.js` en la raíz, sin propósito claro.
- `refactor_edit_profile.py`, `update-app.cjs`, `update-descriptions.cjs`,
  `update-sidebar.cjs`, `update_coords.ts`, `update_events.ts` en la raíz:
  scripts de migración de un solo uso mezclados con el código de la aplicación.
- `package.json` con `"name": "react-example"`.
- `.env.example` documenta variables de AI Studio (`GEMINI_API_KEY`, `APP_URL`)
  que no coinciden con las que el README dice que hacen falta
  (`VITE_FIREBASE_*`).
- `src/pages/EditProfile.tsx` con más de 2.300 líneas y `src/pages/Home.tsx` con
  casi 1.200: son los dos ficheros donde más caro sale cada cambio.

💡 Ninguno es urgente, todos son baratos, y juntos determinan cuánto tarda la
siguiente persona (o el siguiente modelo) en ser útil.

---

## 9. Resumen de riesgos priorizado

| Prioridad | Riesgo | Documento |
|---|---|---|
| 1 | Documentos de usuario públicos (correos expuestos) | §4-A |
| 2 | Sin entorno de staging ni CI: se despliega a ciegas | §7 |
| 3 | `creators` mezcla perfiles y eventos | §3 |
| 4 | `views` escribible sin autenticar | §4-B |
| 5 | Suscripción a colección completa sin paginar | §6 |
| 6 | Taxonomía sin normalizar (`\| string`) | §3 |
| 7 | RSVP acoplado al índice del evento | §3 |
| 8 | Colección `events` muerta y escribible | §4-C |
| 9 | SEO sin verificación tras deploy | §5 |
| 10 | Ficheros monolito y cruft en raíz | §8 |

---

Documentos relacionados: [`03 Principios`](./03-principios-de-producto.md) ·
[`08 Roadmap`](./08-roadmap.md) · [`11 Decisiones`](./11-decisiones.md)
