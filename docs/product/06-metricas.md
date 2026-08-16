# 06 · Métricas, North Star e instrumentación

Última revisión: 2026-08-16 · Estado: Vivo

---

## 1. La North Star

> ### CONEXIONES CUALIFICADAS AL MES
> Número de acciones en las que **una persona sale de Decycles hacia un creador
> con intención de contactar o participar**.

**Se compone de:**

| Señal | Evento actual | Peso |
|---|---|---|
| Clic a la web del creador | `click_creator_social` (`social_platform: website`) | 1 |
| Clic a red social del creador | `click_creator_social` | 1 |
| Confirmación de asistencia a evento | `join_event` | 1 |
| Compartir ficha o evento | `share` | 0,5 |
| Guardar en favoritos | `add_favorite` | 0,5 |

**Por qué esta y no otra:**

- **Es valor entregado, no actividad.** Sesiones, páginas vistas y número de
  fichas son métricas de vanidad: pueden subir mientras el producto empeora.
- **Es la métrica que el creador entiende.** Es exactamente lo que le podremos
  enseñar en su panel: *"este mes 47 personas fueron de Decycles a tu web"*. Sin
  ese número no hay monetización posible.
- **Alinea los dos lados.** Sube si entra buena oferta *y* si llega buena
  demanda. No se puede inflar creciendo por un solo lado.
- **Es imposible de hackear sin crear valor real.** No hay atajo.

**Contra-métrica obligatoria** (para que la North Star no se persiga a costa de
la calidad): **% de fichas activas** — fichas publicadas actualizadas en los
últimos 180 días. Si las conexiones suben mientras esto baja, estamos quemando
el directorio.

---

## 2. El árbol de métricas

```
                    CONEXIONES CUALIFICADAS / MES
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   ALCANCE               CONVERSIÓN              PROFUNDIDAD
   Visitantes únicos     % que abre ficha        Conexiones por
   (SEO + social)        % que contacta          visitante activo
        │                       │                       │
        ▼                       ▼                       ▼
  · Páginas indexadas     · Calidad de la ficha   · Recurrencia
  · Posición en búsqueda  · Fotos y descripción   · Favoritos usados
  · Compartidos           · Confianza percibida   · Eventos seguidos
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
                     SALUD DE LA OFERTA
              Fichas activas · Fichas nuevas/mes
              Eventos publicados/mes · Cobertura por ciudad
```

---

## 3. KPIs por área

### Demanda
| Métrica | Definición | Umbral sano |
|---|---|---|
| Visitantes únicos / mes | GA4 | Crecimiento MoM > 15% en fase temprana |
| Tasa de apertura de ficha | `view_creator_profile` / sesión | > 40% |
| Tasa de conexión | conexiones / `view_creator_profile` | > 12% |
| Búsquedas sin resultado | `search_no_results` / `search_creators` | < 15% |
| Visitantes recurrentes | GA4 | > 25% a los 3 meses |

### Oferta
| Métrica | Definición | Umbral sano |
|---|---|---|
| Fichas publicadas | `creators` con `isPublished: true` | — |
| **Fichas activas** | actualizadas en 180 días | **> 70%** |
| Altas / mes | fichas nuevas publicadas | — |
| Tasa de finalización de alta | fichas publicadas / cuentas con rol `creator` | > 60% |
| Eventos publicados / mes | `publish_event` | — |
| Creadores que vuelven | editan su ficha ≥1 vez en 90 días | > 40% |

### Producto
| Métrica | Definición | Umbral sano |
|---|---|---|
| LCP móvil | Web Vitals | < 2,5 s |
| Peso de la home | transferencia total | < 1,5 MB |
| Uso del mapa | `change_view_mode` a `map` | — |
| Uso de filtros | sesiones con `filter_creators` | > 30% |
| Cobertura i18n | claves en `es.ts` ÷ claves en `en.ts` | 100% |

### Negocio (a partir de H2)
Ingreso recurrente mensual · creadores de pago · conversión free→pago ·
abandono mensual · ingreso medio por creador · coste de infraestructura por
1.000 visitantes.

---

## 4. Instrumentación actual

GA4 vía `gtag.js` cargado directamente (no el SDK de Firebase Analytics, para
evitar un warning conocido). Envoltorios en
[`src/lib/analytics.ts`](../../src/lib/analytics.ts): `trackEvent()` y
`setUserProperties()`, ambos seguros si `gtag` no existe.

### Propiedades de usuario
- `user_role`: `anonymous` | `user` | `creator` | `admin`
- `has_shop`: `"true"` | `"false"`

Se fijan desde `AuthContext` en cuanto se resuelve el perfil.

### Catálogo de eventos

| Evento | Dónde | Parámetros clave |
|---|---|---|
| `page_view` | `App.tsx` en cada cambio de ruta | `page_path`, `page_title` |
| `sign_up` / `login` | `JoinModal` | método |
| `view_creator_profile` | `CreatorProfileModal` | `creator_id`, `creator_name`, `creator_category` |
| `click_creator_social` | `CreatorProfileModal` | `social_platform`, `link_url`, `creator_name` |
| `add_favorite` / `remove_favorite` | `CreatorProfileModal` | creador |
| `share` | perfil, evento, página de evento | contenido compartido |
| `view_gallery_image` | perfil y galería | creador, imagen |
| `click_map_pin` | `CreatorMap` | creador / evento |
| `view_event` | `EventPage` | evento |
| `join_event` | `EventModal`, `EventPage` | evento |
| `change_tab` | `Home` | pestaña destino |
| `change_view_mode` | `Home` | `grid` \| `map` |
| `filter_creators` | `Home` | categoría / subcategoría / país |
| `search_creators` | `Home` | término |
| `search_no_results` | `Home` | término ← **demanda insatisfecha literal** |
| `click_create_event` | `EditProfile` | — |
| `publish_event` / `unpublish_event` | `EditProfile` | evento |
| `click_support_platform` | `SupportModal` | plataforma |

Además hay un contador `views` incrementado en el documento del creador al abrir
su perfil, con deduplicación por apertura. Alimenta el ranking de "más visitados"
del panel admin.

---

## 5. Huecos de instrumentación

Ordenados por lo que bloquean.

| # | Hueco | Bloquea | Esfuerzo |
|---|---|---|---|
| 1 | **Clic a la web del creador no distinguible.** Va dentro de `click_creator_social`; hay que garantizar `social_platform: "website"` y separarlo en el análisis | El numerador de la North Star | S |
| 2 | **Sin embudo de alta de creador.** No se sabe dónde abandona alguien entre registrarse y publicar | La métrica de activación de oferta | S |
| 3 | **`view_creator_profile` no dice de dónde viene** (grid, mapa, búsqueda, calendario, enlace directo) | Saber qué superficie de descubrimiento funciona | S |
| 4 | **Sin Web Vitals.** Ninguna medida real de rendimiento en campo | El principio P4 (móvil) | S |
| 5 | **`views` no separa perfil de evento** y es escribible sin autenticar (ver [`05`](./05-arquitectura-y-datos.md) §4-B) | Fiabilidad de cualquier informe al creador | M |
| 6 | **Sin cohortes.** No se puede seguir la retención de una camada de creadores | Entender si el producto retiene | M |
| 7 | **Sin eventos de error.** Fallos de subida, de geocodificación o de guardado son invisibles | Calidad percibida | S |

**Recomendación:** los huecos 1–4 son todos "S" y desbloquean la North Star, la
activación y el rendimiento. Es el primer trabajo de instrumentación a hacer.

---

## 6. Convención para eventos nuevos

```
verbo_objeto        →  view_creator_profile, click_map_pin, publish_event
```

- `snake_case`, verbo primero, en inglés (consistente con GA4).
- Reutiliza los nombres reservados de GA4 cuando encajen (`share`, `login`,
  `sign_up`, `search`).
- Parámetros: `snake_case`, valores en minúscula, sin datos personales nunca.
- **Todo evento nuevo se añade a la tabla de §4 en el mismo PR.** Un evento no
  documentado es un evento que nadie mirará.

---

## 7. Ritual de revisión

| Cadencia | Qué se mira | Quién |
|---|---|---|
| **Semanal (15 min)** | North Star, altas de creador, `search_no_results`, errores | Product lead |
| **Mensual (1 h)** | Árbol completo, contra-métrica de fichas activas, cobertura por ciudad, resultado de experimentos | Product lead |
| **Trimestral** | Revisión de estrategia: ¿sigue siendo la North Star correcta? Roadmap del siguiente horizonte | Fundador + product lead |

**Regla:** una métrica que nadie mira en la revisión mensual se elimina del
panel. Un panel lleno de números que nadie usa es ruido con aspecto de rigor.

---

Documentos relacionados: [`02 Usuarios`](./02-usuarios-y-jobs.md) ·
[`07 Monetización`](./07-monetizacion.md) · [`08 Roadmap`](./08-roadmap.md)
