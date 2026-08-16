# 04 · Design system — Premium Brutalist

Última revisión: 2026-08-16 · Estado: Vivo
Fuente de verdad en código: [`src/index.css`](../../src/index.css) (tokens y
utilidades globales) + Tailwind v4 vía `@theme`.

---

## 1. La idea

**Brutalismo premium.** Estructura visible, contraste alto, tipografía que grita
y espacios que respiran. No es "feo a propósito": es *honesto a propósito*. La
retícula se ve, los bordes se ven, nada finge ser un objeto físico.

Tres reglas que definen el estilo:

1. **El borde es la estructura.** No hay sombras suaves ni tarjetas flotantes.
   Los bloques se separan con 2px sólidos.
2. **La tipografía es la imagen.** Anton en mayúsculas ocupa espacio y manda. La
   fotografía y el tipo hacen todo el trabajo visual; no hace falta nada más.
3. **El color es información, no decoración.** Negro, blanco y un solo acento
   neón. Si algo está en neón, es porque importa.

---

## 2. Tokens

Definidos en `@theme` dentro de `src/index.css`. Se consumen como utilidades
Tailwind (`bg-rad-black`, `text-rad-neon`, `font-display`).

### Color

| Token | Valor | Uso |
|---|---|---|
| `--color-rad-black` | `#050505` | Fondo en modo oscuro · texto en modo claro · **todos los bordes** |
| `--color-rad-white` | `#f5f5f5` | Fondo en modo claro · texto en modo oscuro |
| `--color-rad-neon` | `#ccff00` | **Solo acento**: marquesina, badges activos, hover de scrollbar, estado seleccionado |

**Reglas de color:**
- El neón nunca es fondo de un bloque largo de texto. Contraste de `#ccff00`
  sobre blanco: **1.2:1** — ilegible. Sobre negro funciona como acento breve.
- No se introducen colores nuevos sin ADR. Excepción ya aprobada: los colores de
  categoría de evento (ver abajo).
- Grises: se usan las escalas `zinc`/`gray` de Tailwind para texto secundario.
  No hay tokens propios; no los inventes sin necesidad real.

**Colores de categoría de evento** — única paleta funcional adicional, definida
en [`src/constants/categories.ts`](../../src/constants/categories.ts). Sirven
para el punto de color en el calendario y el badge del modal, elegidos para ser
legibles sobre mapa claro y oscuro:

| Categoría | Color |
|---|---|
| Competitions | `#ef4444` rojo |
| Social Rides | `#f59e0b` ámbar |
| Touring | `#3b82f6` azul |
| Workshops | `#10b981` esmeralda |
| Festivals | `#a855f7` morado |

### Tipografía

| Token | Familia | Uso |
|---|---|---|
| `--font-display` | **Anton** | Titulares, `h1`–`h6`, marquesina. Siempre mayúsculas, `letter-spacing: 1px` |
| `--font-sans` | **Inter** (400/600/800) | Todo el texto de interfaz y párrafos |
| `--font-mono` | **JetBrains Mono** (400/700) | Metadatos, telemetría, códigos de estado, etiquetas técnicas |

Regla global ya activa en `index.css`: todos los `h1`–`h6` y `.font-display`
llevan Anton + `text-transform: uppercase` automáticamente. **No hace falta
añadir `uppercase` a un heading; sí hace falta no meter párrafos dentro de uno.**

**Escala tipográfica de uso** (convención observada, no tokenizada):
- Display hero / marquesina: `clamp(2.25rem, 8vw, 5.5rem)`
- Título de sección: `text-2xl` a `text-4xl`, Anton
- Título de bloque / modal: `text-lg font-bold uppercase tracking-widest`
- Cuerpo: `text-sm` a `text-base`, Inter
- Etiqueta / acción: `text-xs font-bold uppercase tracking-widest`
- Meta: `text-xs font-mono`

### Utilidades de marca

| Clase | Qué hace | Nota |
|---|---|---|
| `.brutalist-border` | `border: 2px solid var(--color-rad-black)` | Está en `@layer base` a propósito, para que cualquier utilidad `border-*` de Tailwind en el call site pueda sobrescribir el color |
| `.brutalist-shadow` | Hoy solo `transition: all 0.1s ease` | ⚠️ **Los estados hover/active están vacíos.** Es deuda de diseño: la clase promete un comportamiento que no existe. Ver §7 |
| `.marquee-container` | Banda neón con Anton a sangre, bordes arriba y abajo | El JSX debe renderizar un **número par** de copias idénticas: la animación traslada `-50%` |
| `.no-scrollbar` | Oculta la barra de scroll | Para carruseles horizontales |

---

## 3. Modo oscuro

**Mecanismo:** clase `dark` en `<body>`, gestionada por `UIContext`. **No** es
`prefers-color-scheme` ni la estrategia `dark:` de Tailwind — los componentes
reciben `isDarkMode` como prop y alternan clases con un ternario.

```tsx
className={isDarkMode ? "bg-black text-white" : "bg-white text-black"}
```

**Consecuencia práctica:** cualquier componente nuevo necesita recibir
`isDarkMode` (de `useUI()`) y contemplar los dos modos explícitamente. No hay
red de seguridad. Un componente que se olvide del modo oscuro se ve roto, no
mal.

⚠️ **Deuda conocida:** conviven dos sistemas (clase en body + ternarios en
props). Unificar hacia la variante `dark:` de Tailwind sería más limpio, pero es
un refactor transversal. Registrado como decisión pendiente en
[`11-decisiones.md`](./11-decisiones.md).

---

## 4. Patrones de componente

### Botón primario
```
text-xs font-bold uppercase tracking-widest px-6 py-4
+ inversión de color en hover (negro↔blanco)
```

### Botón icono
```
p-2 brutalist-border brutalist-shadow
+ inversión de color en hover
```

### Modal / panel lateral
- Overlay: `bg-black/50 backdrop-blur-sm`, z-index 100.
- Panel: entra desde la derecha con `motion` (spring, damping 25, stiffness 200),
  ancho completo en móvil y `sm:w-[400px]` en escritorio, z-index 101.
- Cabecera: título en `uppercase tracking-widest` + botón de cierre con borde.
- Los modales globales (join, perfil de creador, evento) se montan en `App.tsx`,
  no en las páginas — así son alcanzables desde cualquier ruta y admiten deep
  link.

### Ficha de creador
Imagen de portada + nombre en display + ubicación en mono + badges de categoría.
La foto hace el trabajo; el chrome se aparta.

### Mapa
Leaflet con override de preflight obligatorio (ya en `index.css`): Tailwind pone
`img { max-width: 100% }` global, lo que colapsa los marcadores y tiles de
Leaflet. **No toques ese bloque** sin entender por qué está.

---

## 5. Movimiento

- Librería: `motion` (Framer Motion v12).
- **Entradas de panel:** spring, `damping: 25`, `stiffness: 200`.
- **Fades:** 100–200 ms.
- **Marquesina:** `40s linear infinite`.
- **Principio:** el movimiento explica de dónde viene algo. Nunca decora ni
  retrasa. Nada que tarde más de 300 ms en responder a un toque.
- Pendiente: respetar `prefers-reduced-motion` (ver §7).

---

## 6. Contenido y voz

**Tono:** directo, con oficio, sin corporativismo. Como habla un mecánico bueno:
te dice lo que pasa y lo que cuesta.

| Contexto | Regla |
|---|---|
| Botones y acciones | Verbo en infinitivo o imperativo, en mayúsculas. Máximo 3 palabras |
| Estados vacíos | Explica por qué está vacío y da la siguiente acción concreta |
| Errores | Qué pasó + qué puede hacer el usuario. Nunca códigos crudos |
| Etiquetas de meta | Mono, minúsculas o mayúsculas cortas |
| Párrafos | Nunca en mayúsculas. Nunca en neón sobre blanco |

**Bilingüe:** cada cadena en `src/i18n/en.ts` y `src/i18n/es.ts`, misma clave,
en el mismo commit. Claves en kebab-case agrupadas por área
(`header.*`, `filter.*`, `join.*`, `map.*`, `home.*`). El diccionario es plano
a propósito: la búsqueda es O(1).

**El español ocupa más.** Diseña los componentes con margen: un botón que cabe
justo con "Join" no cabe con "Únete a DECYCLES.CC".

---

## 7. Deuda de diseño conocida

Lista honesta de lo que hay que arreglar. Ordenada por impacto.

| # | Problema | Impacto | Esfuerzo |
|---|---|---|---|
| 1 | **`.brutalist-shadow` no hace nada.** Todos sus estados hover/active están vacíos. El nombre promete profundidad que no existe | Alto — es la utilidad de marca más usada | S |
| 2 | **Sin tokens de espaciado ni de radio.** Cada componente elige su `p-*` y `gap-*`. La retícula se desalinea sola | Alto al crecer | M |
| 3 | **Accesibilidad no verificada.** El estilo tira a contraste extremo y mayúsculas: hay que auditar contraste real, foco visible, orden de tabulación y etiquetas de los modales | Alto (legal + usuarios) | M |
| 4 | **Sin `prefers-reduced-motion`.** La marquesina infinita es un problema real para usuarios sensibles al movimiento | Medio | S |
| 5 | **Dos sistemas de modo oscuro** conviviendo (clase en body vs. ternarios) | Medio | L |
| 6 | **Componentes sin catálogo.** No hay Storybook ni página de sistema: cada patrón se redescubre leyendo otro componente | Medio | M |
| 7 | **Tipografía por CDN de Google Fonts.** Bloquea render y añade dependencia externa; self-host mejoraría LCP | Medio | S |
| 8 | **Sin escala tipográfica tokenizada.** Los tamaños se eligen a ojo por componente | Bajo-medio | S |

**Recomendación de secuencia:** 1 → 4 → 7 (baratos y visibles) → 3 (obligatorio
antes de crecer) → 2 y 8 juntos → 6 → 5.

---

## 8. Reglas para añadir algo nuevo

Antes de crear un componente:

1. **¿Existe ya?** Busca en `src/components/`. Los modales y controles suelen
   estar resueltos.
2. **¿Se puede resolver con los patrones de §4?** Prefiere componer a inventar.
3. Si es nuevo de verdad:
   - Usa solo tokens existentes. Color nuevo = ADR.
   - Contempla los dos modos de color explícitamente.
   - Contempla los cinco estados: vacío, cargando, error, sin permiso, éxito.
   - Prueba a 360 / 768 / 1440.
   - Textos a i18n, los dos idiomas.
   - **Añade el patrón a este documento.** Un componente que no está aquí se
     duplicará dentro de tres meses.

---

Documentos relacionados: [`03 Principios`](./03-principios-de-producto.md) ·
[`05 Arquitectura`](./05-arquitectura-y-datos.md) ·
[`IMAGE_OPTIMIZATION`](../IMAGE_OPTIMIZATION.md)
