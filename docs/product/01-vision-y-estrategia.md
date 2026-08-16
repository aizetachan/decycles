# 01 · Visión y estrategia

Última revisión: 2026-08-16 · Estado: Vivo

---

## 1. La tesis

El ciclismo no lo construyen las marcas grandes. Lo construyen constructores de
cuadros soldando en su garaje, mecánicos que mantienen bicis en la carretera,
pintores, fotógrafos persiguiendo la luz y colectivos que encienden los domingos
por la mañana.

Esa gente **existe, es buena y es invisible**. Está repartida entre Instagram
(algoritmo), Google Maps (categorías equivocadas), foros muertos y el
boca-a-boca local. No hay ningún sitio donde alguien de Madrid pueda descubrir a
un constructor de cuadros de acero en Bristol, o donde un viajero en Tokio
encuentre el taller que le arregla la bici hoy.

**DECYCLES es ese sitio.** Un mapa curado, global y con criterio de la cultura
ciclista independiente.

---

## 2. Declaraciones

**Misión**
Hacer visible y encontrable a todo el que construye cultura ciclista de forma
independiente.

**Visión (5 años)**
Que "está en Decycles" signifique algo — que sea el sello reconocible de que un
taller, un constructor o un colectivo hace las cosas bien. Y que cualquier
ciclista del mundo, en cualquier ciudad, abra Decycles antes que Google Maps.

**Posicionamiento (una frase)**
> Para el ciclista que valora el oficio por encima de la marca, DECYCLES es el
> mapa curado de la escena independiente global — a diferencia de los
> directorios genéricos y del algoritmo de Instagram, cada ficha está
> seleccionada, es del propio creador y se puede recorrer en el mapa.

---

## 3. Qué somos y qué no

| Somos | No somos |
|---|---|
| Un directorio **curado** | Un listado abierto tipo páginas amarillas |
| Un **mapa** de descubrimiento | Un GPS de rutas (Komoot, Strava) |
| Un **calendario** de escena independiente | Una plataforma de ticketing |
| Un **perfil que el creador controla** | Un perfil scrapeado de terceros |
| Un canal de **contacto directo** | Un marketplace con carrito y comisión (*hoy*) |
| Una **marca editorial** con criterio | Una red social con feed y algoritmo |

**Anti-visión.** Decycles fracasa si se convierte en: (a) un directorio infinito
sin criterio, (b) una red social más donde la gente pelea por engagement, o (c)
un tablón de anuncios pagados donde la posición se compra.

---

## 4. Los cinco mundos

La taxonomía es la columna vertebral del producto. Todo cuelga de aquí.

| Mundo | Qué contiene | Rol estratégico |
|---|---|---|
| **PRODUCTS** | Cuadros a medida, componentes, accesorios, ropa, herramienta | Aspiracional. Es el contenido que se comparte y trae tráfico. |
| **SERVICES** | Reparación, custom builds, frame building, restauración, pintura | Transaccional. Es donde hay intención real y donde primero habrá dinero. |
| **EVENTS** | Rodadas, carreras independientes, swap meets, talleres, festivales | Recurrencia. Es la única razón estructural para volver cada mes. |
| **COMMUNITY** | Clubes, colectivos, advocacy, hubs locales | Densidad local. Es lo que convierte una ciudad en un nodo vivo. |
| **CREATIVE & MEDIA** | Fotógrafos, cineastas, revistas independientes, artistas | Marca y contenido. Es lo que hace que Decycles se vea distinto a un directorio. |

Cada mundo tiene subcategorías y grupos de filtros gestionables desde
`/admin/categories` y `/admin/filters` (colección `taxonomy` en Firestore). Ver
[`05-arquitectura-y-datos.md`](./05-arquitectura-y-datos.md).

---

## 5. Por qué ganamos (y por qué podríamos perder)

### Ventajas defendibles

1. **Curación con criterio.** El coste de entrar es el filtro. Un directorio
   abierto se copia en un fin de semana; una reputación editorial no.
2. **Densidad geográfica compuesta.** Cada ciudad con masa crítica atrae a la
   siguiente. Los efectos de red aquí son *locales*, lo que significa que se
   puede ganar ciudad a ciudad en vez de tener que ganar el mundo de golpe.
3. **Datos estructurados propios.** Nadie más tiene "constructores de cuadros de
   titanio en Europa con eventos activos" como consulta resoluble.
4. **Marca.** El brutalismo premium no es decoración: es la señal de que esto lo
   hace alguien que entiende la escena. Un directorio genérico no puede
   copiarlo sin dejar de ser genérico.
5. **SEO de cola larga.** Cada creador y cada evento es una página indexable
   (funciones `creatorMeta` / `eventMeta` + sitemap generado). Miles de páginas
   con intención específica y baja competencia.

### Riesgos reales

| Riesgo | Severidad | Mitigación |
|---|---|---|
| **Directorio fantasma** — fichas que nadie actualiza | Alta | Fecha de última actualización visible, recordatorios, despublicado automático de fichas muertas |
| **Sin razón para volver** — descubrimiento es de un solo uso | Alta | Eventos + favoritos + alertas por ciudad/categoría |
| **Curación no escala** — el cuello de botella es humano | Media-alta | Onboarding autoservicio con cola de revisión, criterios públicos, moderadores por región |
| **Instagram sigue siendo suficiente** para el creador | Media | Decycles tiene que aportar algo que IG no da: SEO propio, contacto cualificado, calendario |
| **Marketplaces genéricos** (Etsy, Google Business) | Baja-media | No competimos en transacción; competimos en contexto y criterio |
| **Dependencia de Firebase** — coste al escalar | Media | Ver sección de coste en [`05`](./05-arquitectura-y-datos.md) |

---

## 6. El bucle de crecimiento

```
        ┌─────────────────────────────────────────────┐
        │                                             │
        ▼                                             │
  Creador publica ficha ────► Página indexable ───► Tráfico SEO
        ▲                          │                  │
        │                          ▼                  ▼
        │                    Evento publicado ──► Visitante descubre
        │                          │                  │
        │                          ▼                  ▼
        │                    Se comparte  ◄──── Contacta / guarda / RSVP
        │                          │                  │
        │                          ▼                  │
        └──── Otros creadores lo ven y quieren entrar ◄┘
```

**Los tres motores, por orden de prioridad:**

1. **SEO de cola larga** (principal). Cada ficha y cada evento es una landing.
   Escala sin coste marginal. Requiere: metadatos correctos, sitemap al día,
   contenido único por ficha, velocidad.
2. **Compartir social** (secundario). Los eventos y las galerías son lo que se
   comparte. Requiere: OG images buenas, deep links que funcionen, botón de
   compartir en todo.
3. **Boca a boca entre creadores** (acelerador). Un constructor le dice a otro.
   Requiere: que estar en Decycles se sienta como un reconocimiento, no como
   rellenar un formulario.

---

## 7. Estado actual (línea base)

**Lo que existe y funciona:**
- Directorio con búsqueda, filtros por categoría/subcategoría/país, vista grid y
  mapa (Leaflet).
- Calendario mensual de eventos con RSVP.
- Galería visual de imágenes reales de las fichas (orden aleatorio por carga).
- Portal de creador: edición de perfil, categorías, galería, geolocalización por
  dirección, publicación de eventos, toggle publicado/borrador.
- Favoritos de creadores y eventos.
- Backoffice admin: dashboard con métricas, gestión de usuarios (roles, bloqueo),
  gestión de creadores, taxonomía y filtros.
- Bilingüe EN/ES. Modo claro/oscuro. Banner de cookies GDPR. GA4 instrumentado.
- SEO: renderizado de metadatos por creador y evento vía Cloud Functions,
  sitemap generado en el deploy.

**Lo que no existe todavía:**
- Cualquier forma de ingreso (solo un enlace a Buy Me a Coffee, sin configurar).
- Verificación o sello de calidad visible.
- Notificaciones o email (ni transaccional ni de producto).
- Reseñas, valoraciones o prueba social.
- Mensajería interna: el contacto se va fuera (web, Instagram).
- Cualquier métrica de negocio más allá de conteos brutos.

**La brecha estratégica principal:** el producto sabe *mostrar* creadores pero no
sabe todavía **demostrar que genera valor para ellos**. Sin eso no hay
monetización posible. Es el foco del Horizonte 1 en el
[roadmap](./08-roadmap.md).

---

## 8. Objetivos por horizonte

**H1 · 0–3 meses — "Demostrar valor"**
Que un creador pueda ver, con datos, qué le ha dado Decycles. Y que el visitante
tenga una razón para volver.

**H2 · 3–9 meses — "Cerrar el bucle"**
Densidad en 5–10 ciudades ancla. Eventos como motor de recurrencia. Primeros
ingresos de creadores que ya han visto el valor.

**H3 · 9–24 meses — "Convertirse en infraestructura"**
El sello Decycles significa algo. API/embeds para que otros usen nuestros datos.
Expansión de categorías adyacentes solo si refuerzan el núcleo.

Detalle en [`08-roadmap.md`](./08-roadmap.md).

---

## 9. Decisiones estratégicas abiertas

Estas preguntas no tienen respuesta todavía. Están aquí para que no se olviden y
para que cualquier trabajo relacionado las tenga en cuenta.

1. **¿Global desde el principio o ciudad a ciudad?** La densidad geográfica
   sugiere ciudades ancla; la marca y el SEO sugieren global. *Recomendación
   actual: global en catálogo, focalizado en activación.*
2. **¿Quién paga primero: creador o marca?** El creador independiente tiene poco
   presupuesto pero mucha motivación. Ver [`07`](./07-monetizacion.md).
3. **¿Reseñas sí o no?** Aportan confianza pero traen moderación, conflicto y
   riesgo legal. Probablemente sí, pero tarde y en formato limitado.
4. **¿Eventos con ticketing propio?** Es el camino más directo a ingresos
   transaccionales, y el más caro de construir bien.
5. **¿Contenido editorial propio?** Refuerza la marca y el SEO, pero es un
   negocio de contenidos con su propio coste operativo.

---

Documentos relacionados: [`02 Usuarios`](./02-usuarios-y-jobs.md) ·
[`07 Monetización`](./07-monetizacion.md) · [`08 Roadmap`](./08-roadmap.md)
