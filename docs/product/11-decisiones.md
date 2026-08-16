# 11 · Registro de decisiones (ADR)

Última revisión: 2026-08-16 · Estado: Vivo

Este es el **por qué** del producto. Sin él, cada seis meses alguien deshace una
decisión buena porque no sabía que era una decisión.

Los ADR-000x son **reconstruidos**: se han inferido leyendo el código y los
comentarios, no se escribieron en su momento. Están aquí para que el contexto no
se pierda; si alguna motivación es inexacta, corrígela.

Plantilla en [`10-plantillas.md`](./10-plantillas.md) §D.

---

## Índice

| ID | Decisión | Estado | Fecha |
|---|---|---|---|
| [0001](#adr-0001) | Firebase como plataforma completa | Aceptada (reconstruida) | — |
| [0002](#adr-0002) | SPA + Cloud Functions para metadatos SEO | Aceptada (reconstruida) | — |
| [0003](#adr-0003) | Rol de admin como custom claim | Aceptada (reconstruida) | — |
| [0004](#adr-0004) | Eventos dentro del documento de creador | Aceptada, **a revisar** | — |
| [0005](#adr-0005) | Taxonomía editable desde el panel admin | Aceptada (reconstruida) | — |
| [0006](#adr-0006) | RSVP con id compuesto | Aceptada, con salvedad | — |
| [0007](#adr-0007) | gtag.js directo en vez del SDK de Firebase Analytics | Aceptada (reconstruida) | — |
| [0008](#adr-0008) | Modo oscuro por clase en body + props | Aceptada, **a revisar** | — |
| [0009](#adr-0009) | WebP + compresión en cliente para imágenes | Aceptada | 2026 |
| [0010](#adr-0010) | Sistema documental de producto en `docs/product/` | Aceptada | 2026-08-16 |

**Pendientes de decidir:** ver [§ Decisiones abiertas](#decisiones-abiertas).

---

<a id="adr-0001"></a>
## ADR-0001 · Firebase como plataforma completa

**Estado:** Aceptada (reconstruida)

**Contexto.** Proyecto llevado por una persona, sin equipo de infraestructura,
con necesidad de autenticación, base de datos, almacenamiento de imágenes,
funciones de servidor y hosting.

**Decisión.** Todo sobre Firebase: Firestore, Auth, Storage, Cloud Functions,
Hosting. Un solo proyecto (`decycles-web-app-1777399378`).

**Consecuencias.**
- ✅ Tiempo real gratis (`onSnapshot`), sin servidor que mantener, despliegue en
  un comando, coste inicial casi nulo.
- ❌ Consultas limitadas (sin búsqueda de texto, sin joins). Coste que crece con
  las lecturas. Dependencia de un proveedor. Reglas de seguridad como único
  control de acceso, sin capa de servidor donde validar.
- ⚠️ **Un solo proyecto significa que no hay staging.** Todo se prueba en
  producción. Es el punto débil más caro de esta decisión y está en el
  [roadmap H0](./08-roadmap.md).

**A revisar cuando:** el coste mensual de Firestore supere lo que costaría una
alternativa, o cuando la búsqueda de texto se vuelva un requisito de producto.

---

<a id="adr-0002"></a>
## ADR-0002 · SPA con Cloud Functions para metadatos SEO

**Estado:** Aceptada (reconstruida)

**Contexto.** El SEO de cola larga es el motor de crecimiento principal
([`01`](./01-vision-y-estrategia.md) §6), pero una SPA de React no sirve
metadatos a los rastreadores ni a los previsualizadores sociales.

**Decisión.** Mantener la SPA y añadir dos funciones HTTPS, `creatorMeta` y
`eventMeta`, que renderizan `functions/template.html` con las etiquetas OG/SEO
rellenas. El `template.html` se genera copiando el `index.html` del build en el
script de deploy. Un `generate-sitemap.cjs` produce el sitemap en cada deploy.

**Alternativas.** SSR completo (Next.js) — habría obligado a reescribir la
aplicación. Prerender de terceros — coste y otra dependencia.

**Consecuencias.**
- ✅ SEO funcional sin reescribir nada. Barato.
- ❌ Dos caminos de renderizado que hay que mantener sincronizados a mano.
- ⚠️ **Frágil:** si el build cambia la estructura de `index.html`, el template
  puede romperse en silencio. No hay ninguna comprobación automática de que los
  metadatos sigan generándose. Ver [`05`](./05-arquitectura-y-datos.md) §5.

---

<a id="adr-0003"></a>
## ADR-0003 · Rol de admin como custom claim

**Estado:** Aceptada (reconstruida)

**Contexto.** Las reglas de Firestore necesitan saber si alguien es admin. Leer
`users/{uid}.role` desde las reglas cuesta una lectura extra en cada operación y
complica el razonamiento.

**Decisión.** La función `syncAdminClaim` espeja `users/{uid}.role` al custom
claim `admin` del token. Las reglas leen `request.auth.token.admin`.
Deliberadamente se mantiene en la service account por defecto porque el trigger
de Eventarc necesita el permiso `receiveEvent`.

**Consecuencias.**
- ✅ Reglas rápidas y legibles, sin lecturas cruzadas. Mismo mecanismo en
  Firestore y en Storage.
- ❌ El claim tarda en propagarse hasta la siguiente renovación del token. Un
  usuario recién ascendido puede necesitar volver a entrar.
- ✅ Mitigado en parte: `AuthContext` se suscribe al documento, así que la
  interfaz reacciona al instante aunque el claim tarde.

---

<a id="adr-0004"></a>
## ADR-0004 · Eventos dentro del documento de creador

**Estado:** Aceptada · ⚠️ **Marcada para revisión en H2**

**Contexto.** Los eventos siempre pertenecen a un creador. Meterlos dentro de su
documento evitaba una colección más y hacía que el `onSnapshot` de `creators`
trajera todo de una vez.

**Decisión.** Los eventos viven en el array `events[]` del documento de
`creators`, más campos sueltos de nivel superior (`eventDate`, `endDate`,
`recurringEvent`). Existe una colección `events` pero **no se usa**.

**Consecuencias.**
- ✅ Una sola suscripción trae creadores y eventos. Simple mientras el volumen es
  pequeño.
- ❌ Imposible consultar "eventos de este mes" sin traer todos los creadores.
- ❌ Los documentos crecen sin límite (Firestore corta en 1 MB).
- ❌ Los RSVP dependen del **índice** del evento en el array (ver ADR-0006).
- ❌ El contador `views` es ambiguo: no se sabe si cuenta perfil o evento.
- ❌ La colección `events` huérfana sigue siendo escribible por cualquier
  autenticado.

**Revisión.** El paso a colección propia es el trabajo 2.1 del
[roadmap](./08-roadmap.md). Requiere migración con script idempotente y plan de
rollback. **Escribir el ADR-00xx que lo sustituya antes de tocar código.**

---

<a id="adr-0005"></a>
## ADR-0005 · Taxonomía editable desde el panel admin

**Estado:** Aceptada (reconstruida)

**Contexto.** Las cinco categorías y sus subcategorías van a cambiar a medida que
se entienda mejor la escena. Tenerlas solo en código obliga a desplegar para
cambiar una etiqueta.

**Decisión.** La taxonomía vive en la colección `taxonomy` (lectura pública,
escritura solo admin) y se gestiona desde `/admin/categories` y `/admin/filters`.
Los arrays de `src/constants/categories.ts` quedan como semilla y respaldo.

**Consecuencias.**
- ✅ Se evoluciona la taxonomía sin desplegar.
- ❌ **Los tipos `Category` y `SubCategory` terminan en `| string`**, lo que anula
  la comprobación de tipos en todo lo que los toque.
- ❌ Sin normalización: ya conviven `"SERVICES"`, `"road"` y `"Road"`,
  `"frame building"`. Es una fuente garantizada de filtros que no devuelven nada.
- ❌ Sin validación al escribir: un typo en el panel rompe filtros en silencio.

**Deuda.** Normalizar y validar es el trabajo 2.11 del roadmap.

---

<a id="adr-0006"></a>
## ADR-0006 · RSVP con id compuesto

**Estado:** Aceptada, con salvedad conocida

**Contexto.** Hacía falta que un usuario no pudiera confirmar dos veces el mismo
evento, sin añadir subcolecciones ni lógica de deduplicación.

**Decisión.** Un documento por RSVP con id `{creatorId}_{eventIdx}_{userId}`. La
deduplicación es implícita: el mismo id se sobrescribe.

**Consecuencias.**
- ✅ Simple, sin subcolecciones, deduplicación gratis. Reglas triviales: lectura
  pública para contar, escritura solo del dueño.
- ❌ **El id depende del índice del evento en el array.** Si el creador reordena o
  borra un evento, los RSVP existentes apuntan al evento equivocado.

**Mitigación.** Se resuelve con ADR-0004: al pasar los eventos a colección propia
con id estable, el RSVP debe pasar a `{eventId}_{userId}`. La migración tiene que
remapear los RSVP existentes.

---

<a id="adr-0007"></a>
## ADR-0007 · gtag.js directo en vez del SDK de Firebase Analytics

**Estado:** Aceptada (reconstruida)

**Contexto.** El SDK de Firebase Analytics producía un warning conocido en la
consola.

**Decisión.** Cargar `gtag.js` directamente y envolverlo en
`src/lib/analytics.ts` con `trackEvent()` y `setUserProperties()`, ambos seguros
si `gtag` no está disponible.

**Consecuencias.**
- ✅ Control total sobre el momento de carga y sobre los parámetros. Compatible
  con el consentimiento de cookies. Sin warnings.
- ❌ Se pierde la integración automática de Firebase Analytics con el resto de la
  consola (audiencias, integración con Remote Config).
- ⚠️ **Pendiente de verificar:** que el banner de consentimiento realmente
  bloquee `gtag` antes de la aceptación. Ver [`09`](./09-operativa.md) §8.

---

<a id="adr-0008"></a>
## ADR-0008 · Modo oscuro por clase en body + props

**Estado:** Aceptada · ⚠️ **Marcada para revisión**

**Contexto.** Se necesitaba un modo oscuro controlable por el usuario, no ligado
a la preferencia del sistema.

**Decisión.** `UIContext` mantiene `isDarkMode` y aplica la clase `dark` a
`<body>`. Los componentes reciben `isDarkMode` como prop y alternan clases con
ternarios. Las reglas globales de `index.css` usan `body.dark`.

**Consecuencias.**
- ✅ Control explícito, funciona también para CSS global (scrollbars, Leaflet,
  marquesina).
- ❌ **Dos sistemas conviviendo**: clase en body para CSS global, ternarios en
  props para componentes. Cada componente nuevo tiene que acordarse.
- ❌ Sin red de seguridad: un componente que olvide el modo oscuro se ve roto.
- ❌ Más verboso que la variante `dark:` de Tailwind.

**Revisión.** Unificar hacia `dark:` de Tailwind (que también soporta estrategia
por clase) sería más limpio, pero es un refactor transversal. Sin fecha.

---

<a id="adr-0009"></a>
## ADR-0009 · WebP y compresión en cliente para todas las imágenes

**Estado:** Aceptada · Documentada en
[`docs/IMAGE_OPTIMIZATION.md`](../IMAGE_OPTIMIZATION.md)

**Contexto.** Tres focos de peso: assets estáticos en PNG de ~1,8 MB cada uno
(unos 15 MB por build), subidas de usuario sin comprimir (fotos de móvil de 5–8 MB
servidas tal cual a cada visitante) y renderizado sin `lazy`.

**Decisión.** WebP en todo (descartado AVIF por complejidad y velocidad de
codificación), compresión y redimensionado en cliente antes de subir, y
`loading="lazy"` en el renderizado.

**Consecuencias.**
- ✅ Reducción drástica del peso. Soporte de navegador ~97%.
- ❌ Queda pendiente el barrido del histórico ya almacenado en Storage.

---

<a id="adr-0010"></a>
## ADR-0010 · Sistema documental de producto en `docs/product/`

**Estado:** Aceptada · **Fecha:** 2026-08-16

**Contexto.** El conocimiento de producto —por qué existe Decycles, para quién,
cómo se decide, qué no se hace— vivía solo en la cabeza del fundador. Además, el
proyecto se trabaja con Claude, que empieza cada sesión sin memoria del anterior.

**Decisión.** Crear `docs/product/` con trece documentos versionados en el repo.
`00-CLAUDE-PRODUCT-LEAD.md` funciona como prompt base del rol *Product Designer
Full-Stack con visión de CEO*; el resto es su base de conocimiento y, a la vez,
documentación para personas.

**Alternativas.** Notion — mejor para editar, pero se desincroniza del código y
no es legible por las herramientas que trabajan sobre el repo. Solo en el
`CLAUDE.md` — demasiado largo y sin estructura navegable.

**Consecuencias.**
- ✅ Una sola fuente de verdad, versionada junto al código, legible por humanos y
  por modelos. Cada sesión de Claude arranca con el mismo contexto.
- ❌ Hay que mantenerla. Documentación desactualizada es peor que ninguna.
- 📌 **Obligación derivada:** toda decisión estructural actualiza el documento
  correspondiente en el mismo trabajo.

---

<a id="decisiones-abiertas"></a>
## Decisiones abiertas

Sin resolver. Cada una bloquea trabajo. Cuando se decida, se convierte en ADR.

| # | Pregunta | Bloquea | Documento |
|---|---|---|---|
| A1 | ¿Cómo se protegen los datos de `users` sin romper el panel admin? | Roadmap H0.1 | [`05`](./05-arquitectura-y-datos.md) §4-A |
| A2 | ¿Qué proveedor de email transaccional? | Resumen mensual al creador, recordatorios | [`08`](./08-roadmap.md) 1.4 |
| A3 | ¿Precio único global o ajustado por región? | Lanzamiento de PRO | [`07`](./07-monetizacion.md) §7 |
| A4 | ¿"Verificado" va con PRO o es independiente? *(recomendación: independiente)* | Diseño del badge | [`07`](./07-monetizacion.md) §7 |
| A5 | ¿Reseñas sí o no, y en qué formato? | H3 | [`01`](./01-vision-y-estrategia.md) §9 |
| A6 | ¿Global o ciudad a ciudad en la activación? | Estrategia de captación | [`01`](./01-vision-y-estrategia.md) §9 |
| A7 | ¿Entidad legal y país de facturación? | Cualquier cobro | [`07`](./07-monetizacion.md) §7 |
| A8 | ¿Se configura o se retira el enlace de donación actual? | Nada, pero está ahí sin funcionar | [`07`](./07-monetizacion.md) §2 |
| A9 | ¿Qué buscador de texto cuando Firestore no baste? | Roadmap 2.12 | [`05`](./05-arquitectura-y-datos.md) §6 |

---

## Cómo añadir un ADR

1. Copia la plantilla de [`10-plantillas.md`](./10-plantillas.md) §D.
2. Número correlativo. Los números no se reutilizan nunca.
3. Añádelo al índice de arriba.
4. Un ADR **no se edita** cuando cambia la realidad: se escribe uno nuevo que lo
   sustituya y se marca el antiguo como `Sustituida por ADR-YYY`. El historial es
   el valor.

---

Documentos relacionados: [`05 Arquitectura`](./05-arquitectura-y-datos.md) ·
[`08 Roadmap`](./08-roadmap.md) · [`10 Plantillas`](./10-plantillas.md)
