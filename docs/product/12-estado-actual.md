# 12 · Estado actual y cómo retomar

**Snapshot: 2026-08-16** · Estado: Vivo — *este documento caduca rápido*

> Este es el documento de **relevo**. Responde a una sola pregunta: *si entro hoy
> al proyecto después de un tiempo fuera, ¿qué me encuentro y por dónde sigo?*
>
> A diferencia del resto de `docs/product/`, que describe cómo *debería* ser,
> este describe cómo *está*. **Actualízalo cada vez que retomes**: un estado
> desactualizado engaña más que la ausencia de estado.

---

## 1. Resumen en diez líneas

- El producto **está en producción y funcionando**: directorio, mapa, calendario,
  portal del creador y backoffice de admin.
- El **último cambio de código es del 28 de junio de 2026**. Hoy es 16 de agosto:
  llevamos **≈7 semanas sin tocar la aplicación**.
- Lo último que se hizo fue una tanda de trabajo sobre **imágenes**: WebP,
  compresión en cliente, recorte/edición al subir, limpieza de huérfanas en
  Storage.
- El único trabajo posterior es **documental**: este sistema `docs/product/`
  (16 de agosto), que todavía **no está fusionado a `main`**.
- **No hay nada a medias en el código.** No hay ramas de feature abiertas, ni
  TODOs pendientes, ni trabajo interrumpido. El árbol está limpio.
- Sí hay **dos cosas bloqueadas por credenciales**: el barrido de imágenes
  antiguas en Storage y cualquier despliegue.
- **No hay CI, ni tests, ni entorno de staging.** La única verificación
  automática que existe es `npm run lint` (`tsc --noEmit`), y hay que lanzarla a
  mano.
- Hay **riesgos de seguridad abiertos y conocidos**, el principal: los documentos
  de `users` son de lectura pública.
- **Nadie sabe hoy los números reales de producción** — cuántas fichas
  publicadas, cuánto tráfico, cuánto cuesta. Están en las consolas, sin mirar.
- El siguiente paso obvio, si hay medio día: **cerrar el Horizonte 0 de
  seguridad**. Si hay una semana: **empezar el panel de estadísticas del
  creador**.

---

## 2. Dónde está cada cosa

### Ramas

| Rama | Último commit | Estado |
|---|---|---|
| `main` | `bf2ab9e` · 2026-06-28 · *Sync deploy artifacts after image-editor release* | Es lo que hay en producción |
| `claude/decycles-product-designer-docs-km38in` | `4600f8b` · 2026-08-16 · *Add product documentation system* | **Sin fusionar.** Solo documentación, cero código |

No hay más ramas remotas. No hay trabajo perdido en ningún sitio.

### Producción

- **Proyecto Firebase:** `decycles-web-app-1777399378`
- **Hosting:** sirve `dist/`, con dos reescrituras que son la clave del SEO:
  `/event/**` → función `eventMeta`, `/creator/**` → función `creatorMeta`.
  El resto cae a `/index.html` (SPA).
- `index.html` se sirve con `no-cache` para que un despliegue se vea al instante.
- **Despliegue:** manual, `npm run deploy`. Ese script hace build, copia
  `dist/index.html` a `functions/template.html`, genera el sitemap y despliega
  hosting + functions + reglas de Firestore.

⚠️ **Ojo con el despliegue:** `functions/template.html` está commiteado en el
repo y se regenera en cada deploy. Por eso el historial tiene commits de "Sync
deploy artifacts". Si alguien despliega desde una copia desactualizada del repo,
el template se pisa con una versión vieja.

---

## 3. Inventario

| | Cantidad | Notas |
|---|---|---|
| Páginas públicas y de usuario | 8 | Home, Welcome, EventPage, EditProfile, Favorites, MyEvents, ResetPassword, redirección de creador |
| Páginas de admin | 6 | Dashboard, Users, Creators, AdminCreatorEdit, CategoriesAdmin, FiltersAdmin |
| Componentes | ~25 | Agrupados en `auth/`, `events/`, `home/`, `layout/`, `modals/`, `ui/` |
| Contextos | 4 | Auth, UI, Language, Categories |
| Hooks propios | 2 | `useCreators`, `useRsvps` |
| Cloud Functions | 8 | 3 triggers, 3 callables de admin, 2 de metadatos SEO |
| Colecciones Firestore | 5 | `users`, `creators`, `taxonomy`, `rsvps`, y `events` (**muerta**) |
| Scripts de mantenimiento | 9 | En `scripts/`: seed, migraciones, sitemap, optimización |
| Claves de traducción | 95 EN · 95 ES | ✅ **Paridad 100% verificada** en este snapshot |
| Fichas semilla en `data.ts` | ≈44 | Datos de respaldo, no producción |
| Eventos GA4 instrumentados | 19 | Catálogo en [`06-metricas.md`](./06-metricas.md) |

### Los dos ficheros más caros de tocar

- `src/pages/EditProfile.tsx` — **2.325 líneas**
- `src/pages/Home.tsx` — **1.189 líneas**

Cualquier trabajo que caiga aquí cuesta el doble. Trocearlos está en el roadmap
(2.13) como esfuerzo M, impacto bajo — pero es el impuesto que se paga en cada
feature que los toque.

---

## 4. Qué se hizo en la última tanda de trabajo

Junio de 2026, todo alrededor de **imágenes y almacenamiento**:

| Fecha | Qué |
|---|---|
| 24 jun | WebP en los assets del repo (≈15 MB → 468 KB), compresión en cliente antes de subir, `loading="lazy"` |
| 27 jun | Borrado en cascada al eliminar cuenta + limpieza de imágenes superadas en Storage |
| 27 jun | Orden aleatorio de la galería de la home en cada carga |
| 28 jun | Modal de recorte y edición al subir, y clic para editar imágenes ya existentes |

Antes de eso (mayo): analítica GA4 completa, banner de cookies GDPR, panel de
admin con gestión de usuarios, bloqueo de usuarios, estadísticas de
engagement y taxonomía en el dashboard.

**Lectura:** el trabajo reciente ha sido de **calidad técnica y backoffice**, no
de valor nuevo para el usuario. Es coherente: el producto estaba en fase de
apuntalar. Lo que falta ahora es exactamente lo contrario — ver
[§8](#8-por-dónde-seguir).

---

## 5. Lo que está bloqueado

Dos cosas, y ambas por lo mismo: **faltan credenciales**.

### 5.1 · Barrido de imágenes antiguas en Storage
- **Qué falta:** las imágenes subidas *antes* de la compresión en cliente siguen
  pesadas en el bucket y referenciadas desde Firestore.
- **El script existe y está listo:** `scripts/optimize-storage-images.cjs`
  (`npm run optimize:storage`). Es idempotente (marca `metadata.optimized = "1"`),
  tiene modo dry-run por defecto y `--apply` para ejecutar de verdad.
- **Bloqueo:** requiere `serviceAccountKey.json` en la raíz (está en
  `.gitignore`, nunca se commitea).
- **Instrucciones completas:** [`docs/IMAGE_OPTIMIZATION.md`](../IMAGE_OPTIMIZATION.md) §B.

### 5.2 · Despliegue
- `npm run deploy` necesita credenciales de Firebase con permiso sobre el
  proyecto. En un entorno nuevo, `firebase login` primero.

> ⚠️ **Corrección a `docs/IMAGE_OPTIMIZATION.md`:** ese documento marca «deploy a
> producción» como pendiente, pero el historial muestra commits de sync de
> artefactos posteriores (`74df93c`, `192a652`, `bf2ab9e`), lo que indica que el
> trabajo **sí se desplegó**. Lo que sigue pendiente de verdad es solo el barrido
> de Storage. Conviene corregir esa tabla la próxima vez que se toque.

---

## 6. Salud del proyecto

### Verificado en este snapshot

| Comprobación | Resultado |
|---|---|
| Trabajo a medias en el código | ✅ Ninguno. Sin TODO, FIXME ni ramas de feature abiertas |
| Paridad de traducciones EN/ES | ✅ 95 claves en ambos, sin huecos |
| Árbol de git limpio | ✅ Sin cambios sin commitear |
| Ramas huérfanas | ✅ Ninguna |
| Secretos commiteados | ✅ `.gitignore` cubre service accounts y `.env*` |

### Deuda visible

| Cosa | Detalle |
|---|---|
| `console.log` en producción | ~50 llamadas repartidas por 16 ficheros. Los peores: `EditProfile` (9), `AdminCreatorEdit` (7), `useCreators` (6), `Users` (6) |
| Ficheros monolito | `EditProfile.tsx` (2.325) y `Home.tsx` (1.189) |
| Cruft en la raíz | `script.js`…`script5.js`, `refactor_edit_profile.py`, `update-*.cjs`, `update_coords.ts`, `update_events.ts` |
| `package.json` | Sigue llamándose `"react-example"` |
| `.env.example` | Documenta variables de AI Studio (`GEMINI_API_KEY`, `APP_URL`) que no coinciden con las `VITE_FIREBASE_*` que el README pide |

### Lo que no existe

- ❌ Tests de cualquier tipo
- ❌ CI (nada se comprueba automáticamente en un PR)
- ❌ Entorno de staging (un solo proyecto Firebase = todo contra producción)
- ❌ Monitorización o alertas
- ❌ Registro de acciones de moderación

### Riesgos de seguridad abiertos

Sin cambios desde el análisis. Los tres primeros, textualmente:

1. 🔴 **`users` es de lectura pública** — correos y nombres reales volcables desde
   el cliente.
2. 🟠 **`views` escribible sin autenticar**, con cualquier valor.
3. 🟠 **Colección `events` muerta pero escribible** por cualquier autenticado.

Lista completa en [`05-arquitectura-y-datos.md`](./05-arquitectura-y-datos.md) §9.

---

## 7. Lo que no sabemos

**Esto es lo más importante de este documento.** El repositorio no puede
responder a ninguna de estas preguntas, y todas las decisiones de producto
dependen de ellas:

| Pregunta | Dónde se mira | Por qué importa |
|---|---|---|
| ¿Cuántas fichas publicadas hay de verdad? | Firestore o `/admin` | Define si el problema es oferta o demanda |
| ¿Cuántas están activas (tocadas en 180 días)? | Firestore | Es la contra-métrica de la North Star |
| ¿Cuánto tráfico hay al mes? | GA4 | Define si el SEO está funcionando |
| ¿Cuál es la tasa de conexión (clics salientes ÷ vistas de perfil)? | GA4 | **Es la North Star.** Hoy no la conoce nadie |
| ¿Qué se busca y no se encuentra? | GA4, evento `search_no_results` | Demanda insatisfecha literal, gratis |
| ¿En qué países y ciudades hay densidad? | Firestore | Define dónde empujar |
| ¿Cuánto cuesta Firebase al mes? | Consola de facturación | Define el margen de cualquier precio |
| ¿Cuántas cuentas de creador se registraron y nunca publicaron? | Firestore | Mide el agujero del onboarding |

**Primera tarea de cualquier sesión de retomada: contestar estas ocho.** Son
media hora de consola y cambian por completo qué merece la pena construir.

---

## 8. Por dónde seguir

Tres rutas según el tiempo disponible. No son excluyentes: son la misma
secuencia con distinto alcance.

### Ruta A · 30 minutos — *Recuperar el contexto*
1. Abrir GA4 y la consola de Firebase y contestar las ocho preguntas de §7.
2. Anotar los números **en este documento**, en §7, con fecha.
3. Con esos números, revisar si el roadmap sigue teniendo sentido.

> Sin esto, cualquier otra cosa es construir a ciegas.

### Ruta B · Medio día — *Cerrar el Horizonte 0*
Riesgos abiertos, no mejoras. Por orden:
1. **Blindar `views`** — quitar la escritura anónima. Cambio pequeño en
   `firestore.rules`. `S`
2. **Cerrar la colección `events`** — está muerta y es escribible. `S`
3. **Proteger los datos de `users`** — el grande. Requiere decidir primero cómo
   se parte el documento sin romper el panel de admin: es la decisión abierta
   **A1** de [`11-decisiones.md`](./11-decisiones.md). Escribir el ADR antes de
   tocar la regla. `M`

> Los tres tocan reglas de seguridad, así que **requieren consulta antes de
> ejecutarse** (guardarraíl del rol) y prueba con el emulador de Firebase, que
> además es el test de mayor valor por esfuerzo que se puede añadir al proyecto.

### Ruta C · Una semana o más — *La apuesta de producto*
**Panel de estadísticas del creador.** Es el trabajo 1.1 del roadmap y la
respuesta a la brecha estratégica: hoy el creador sube su ficha y no vuelve a
saber nada de Decycles.

Antes de escribir código, dos cosas baratas que lo desbloquean:
1. **Separar el clic a la web del clic a redes** en `click_creator_social`
   (`06-metricas.md` §5-1). Es el numerador de la North Star y son minutos. `S`
2. **Instrumentar el embudo de alta** para saber dónde se cae la gente entre
   registrarse y publicar. `S`

Y una decisión que hay que tomar en paralelo: **qué proveedor de email
transaccional** (decisión abierta A2), porque el resumen mensual al creador es lo
que convierte el panel en un motivo para volver.

---

## 9. Arranque en frío

Si el entorno es nuevo (como este: `node_modules` no está instalado):

```bash
npm install                  # instalar dependencias
npm run dev                  # Vite en http://localhost:3000
npm run lint                 # tsc --noEmit — la única verificación que existe
```

**Hace falta un `.env.local`** con las credenciales web de Firebase:
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
`VITE_FIREBASE_APP_ID`.

⚠️ El `.env.example` del repo **no sirve**: documenta variables de AI Studio que
no son las que la aplicación usa. Las buenas están en el README. Arreglarlo es
trabajo de cinco minutos y ahorra una hora a la siguiente persona.

**Para scripts de administración** (migraciones, optimización de Storage): hace
falta `serviceAccountKey.json` en la raíz. Nunca se commitea.

---

## 10. Checklist de retomada

Cada vez que se vuelve al proyecto después de un tiempo fuera:

- [ ] `git fetch && git log --oneline -10` — ¿qué ha cambiado?
- [ ] Leer este documento y comprobar si sigue siendo cierto
- [ ] Contestar las ocho preguntas de §7 y anotar los números con fecha
- [ ] Revisar si algún riesgo de §6 se ha cerrado o agravado
- [ ] Comprobar que la web de producción carga y el mapa pinta los pines
- [ ] Revisar las decisiones abiertas de [`11-decisiones.md`](./11-decisiones.md):
      ¿alguna se ha vuelto bloqueante?
- [ ] Elegir ruta A, B o C de §8
- [ ] **Al terminar la sesión, actualizar este documento**

---

## 11. Historial de snapshots

| Fecha | Quién | Qué cambió desde el anterior |
|---|---|---|
| 2026-08-16 | Claude (product lead) | Primer snapshot. Producto en producción, 7 semanas sin cambios de código, sistema documental creado y sin fusionar |

> Añade una fila cada vez que actualices. Dos snapshots seguidos que digan lo
> mismo son la señal más honesta de que el proyecto está parado.

---

Documentos relacionados: [`05 Arquitectura`](./05-arquitectura-y-datos.md) ·
[`06 Métricas`](./06-metricas.md) · [`08 Roadmap`](./08-roadmap.md) ·
[`11 Decisiones`](./11-decisiones.md)
