# 08 · Roadmap

Última revisión: 2026-08-16 · Estado: Vivo

> Un roadmap no es una lista de features con fechas. Es una **secuencia de
> apuestas**, cada una con una hipótesis y una forma de saber si funcionó. Las
> fechas son intenciones; el orden es la decisión.

---

## Cómo leerlo

- **Esfuerzo:** `S` (días) · `M` (1–3 semanas) · `L` (más de un mes)
- **Impacto:** sobre la North Star — *Conexiones cualificadas al mes*
  ([`06`](./06-metricas.md))
- **Nivel:** marco de priorización de [`00`](./00-CLAUDE-PRODUCT-LEAD.md) §6

---

## HORIZONTE 0 · Ahora mismo — *Confianza y base*

**Nada de lo demás importa si esto no está.** Son riesgos abiertos, no mejoras.

| # | Trabajo | Por qué | Esfuerzo | Nivel |
|---|---|---|---|---|
| 0.1 | **Cerrar la exposición de datos de usuario.** `users` es de lectura pública: correos y nombres reales accesibles desde el cliente ([`05`](./05-arquitectura-y-datos.md) §4-A) | Privacidad + RGPD | M | 0 |
| 0.2 | **Blindar el contador `views`** — hoy escribible sin autenticar | Métricas fiables | S | 0 |
| 0.3 | **Cerrar la colección `events`**, muerta y escribible por cualquier autenticado | Superficie de abuso | S | 0 |
| 0.4 | **Entorno de staging + CI mínima** (`tsc --noEmit` + build en cada PR) | Hoy se despliega a producción a ciegas | M | 0 |
| 0.5 | **Tests de reglas de seguridad** con el emulador de Firebase | Es el test de mayor valor por esfuerzo que existe aquí | M | 0 |

**Criterio de salida:** ningún riesgo rojo abierto en [`05`](./05-arquitectura-y-datos.md) §9;
existe un entorno donde probar sin tocar producción.

---

## HORIZONTE 1 · 0–3 meses — *"Demostrar valor"*

**Hipótesis central:** el creador no vuelve porque Decycles no le devuelve nada.
Si ve lo que Decycles le trae, mantiene su ficha viva; y una ficha viva convierte
mejor.

### 1A · La prueba de valor para el creador *(la apuesta principal)*

| # | Trabajo | Esfuerzo | Impacto |
|---|---|---|---|
| 1.1 | **Panel de estadísticas del creador**: visitas al perfil, clics salientes, favoritos, RSVP de sus eventos, evolución mensual | L | 🔴 Alto |
| 1.2 | **Instrumentar bien el clic saliente** — separar `website` de redes sociales; es el numerador de la North Star ([`06`](./06-metricas.md) §5-1) | S | 🔴 Alto |
| 1.3 | **Embudo de alta de creador** instrumentado: dónde se abandona entre registro y publicación | S | 🟠 Medio |
| 1.4 | **Resumen mensual por email** al creador: "este mes, X personas fueron de Decycles a tu web" | M | 🔴 Alto |

> 1.4 requiere infraestructura de email (recomendación: Resend o Postmark, con
> gestión de bajas). Es la primera dependencia externa nueva: merece ADR.

### 1B · Señales de confianza para el visitante

| # | Trabajo | Esfuerzo | Impacto |
|---|---|---|---|
| 1.5 | **"Actualizado hace X"** en la ficha. El dato ya está en Firestore | S | 🟠 Medio |
| 1.6 | **Verificación** con criterio escrito y badge visible ([`09`](./09-operativa.md)) | M | 🔴 Alto |
| 1.7 | **Estado y horarios** del taller: abierto/cerrado, cita previa, lista de espera | M | 🟠 Medio |
| 1.8 | **Despublicado automático** de fichas sin tocar en 12 meses, con aviso previo | M | 🟠 Medio |

### 1C · Rendimiento y oficio

| # | Trabajo | Esfuerzo | Impacto |
|---|---|---|---|
| 1.9 | Web Vitals en campo + presupuesto de peso por pantalla | S | 🟠 Medio |
| 1.10 | Arreglar `.brutalist-shadow` (hoy no hace nada) y `prefers-reduced-motion` | S | 🟡 Bajo |
| 1.11 | Auditoría de accesibilidad: contraste, foco, tabulación, modales | M | 🟠 Medio |
| 1.12 | Self-host de tipografías (hoy vía CDN de Google, bloquea render) | S | 🟡 Bajo |

**Métricas de éxito de H1:**
- ≥ 40% de creadores publicados entran a su panel de estadísticas al menos una vez.
- % de fichas activas > 70%.
- Tasa de conexión (conexiones ÷ vistas de perfil) > 12%.
- LCP móvil < 2,5 s.

---

## HORIZONTE 2 · 3–9 meses — *"Cerrar el bucle"*

**Hipótesis central:** la recurrencia viene de los eventos y de la densidad
local. Con ambas, aparece la disposición a pagar.

### 2A · Eventos como motor de recurrencia

| # | Trabajo | Esfuerzo | Impacto |
|---|---|---|---|
| 2.1 | **Separar eventos a su propia colección** — hoy viven dentro del documento del creador ([`05`](./05-arquitectura-y-datos.md) §3). Desbloquea consultas por fecha, RSVP estables y escala | L | 🔴 Alto |
| 2.2 | **Eventos recurrentes completos** — el campo existe, falta interfaz | M | 🔴 Alto |
| 2.3 | **Recordatorios** de eventos con RSVP (email, y calendario `.ics`) | M | 🔴 Alto |
| 2.4 | **Alertas por ciudad y categoría**: "avísame de nuevas rodadas de gravel en Barcelona" | M | 🔴 Alto |
| 2.5 | Duplicar evento y plantillas de evento | S | 🟠 Medio |

### 2B · Densidad local

| # | Trabajo | Esfuerzo | Impacto |
|---|---|---|---|
| 2.6 | **Páginas de ciudad** indexables: "escena ciclista independiente en Berlín" | M | 🔴 Alto |
| 2.7 | **"Cerca de mí"** con geolocalización del navegador | S | 🟠 Medio |
| 2.8 | Mapa de cobertura interno: dónde hay hueco y dónde captar | S | 🟠 Medio |
| 2.9 | Campaña de captación en 5 ciudades ancla ([`09`](./09-operativa.md)) | M | 🔴 Alto |

### 2C · Escala técnica

| # | Trabajo | Esfuerzo | Impacto |
|---|---|---|---|
| 2.10 | Consultas paginadas y filtradas en servidor (fin del `onSnapshot` global) | L | 🟠 Medio |
| 2.11 | Normalizar la taxonomía (quitar el `\| string`, unificar capitalización) | M | 🟠 Medio |
| 2.12 | Búsqueda de texto real (Algolia / Typesense o índice derivado) | M | 🟠 Medio |
| 2.13 | Trocear `EditProfile.tsx` (2.300 líneas) y `Home.tsx` (1.200) | M | 🟡 Bajo |

### 2D · Primeros ingresos

| # | Trabajo | Esfuerzo | Impacto |
|---|---|---|---|
| 2.14 | 20 entrevistas con creadores activos sobre disposición a pagar | S | — |
| 2.15 | Landing de PRO con lista de espera (mide intención, no opinión) | S | — |
| 2.16 | Stripe + facturación + portal de cliente | L | — |
| 2.17 | PRO en beta cerrada con precio de fundador ([`07`](./07-monetizacion.md)) | M | — |

**Métricas de éxito de H2:**
- Visitantes recurrentes > 25%.
- ≥ 5 ciudades con más de 15 fichas activas cada una.
- ≥ 30 creadores PRO de pago.
- RSVP por evento en crecimiento sostenido.

---

## HORIZONTE 3 · 9–24 meses — *"Convertirse en infraestructura"*

**Hipótesis central:** cuando Decycles es el índice canónico de la escena, el
valor deja de estar en la web y pasa a estar en los datos y en el sello.

- **El sello Decycles**: verificación con criterio público y proceso claro.
- **API y embeds**: que otras webs y revistas muestren nuestros datos.
- **Prueba social**: reseñas o testimonios en formato limitado y moderado
  (decisión abierta en [`01`](./01-vision-y-estrategia.md) §9).
- **Curación distribuida**: moderadores regionales con criterios y herramientas.
- **Editorial**: contenido propio que refuerce marca y SEO de cabecera.
- **Marcas e industria**: patrocinios con política editorial escrita.
- **Más idiomas** más allá de EN/ES según densidad real (DE, FR, JA).
- **App móvil** — *solo* si los datos de uso móvil lo justifican. Una PWA bien
  hecha probablemente basta.

---

## Lista de "no ahora"

Ideas buenas que **no** se hacen todavía, con la razón. Tener esta lista escrita
evita rediscutirlas cada mes.

| Idea | Por qué no ahora |
|---|---|
| Feed social / seguir creadores | Nos convierte en red social. Rompe la anti-visión ([`01`](./01-vision-y-estrategia.md) §3) |
| Mensajería interna | El contacto directo funciona. Añade moderación y responsabilidad legal |
| Marketplace con carrito | Requiere intermediar la transacción: otro negocio distinto |
| Ticketing de eventos | Atractivo, pero caro de hacer bien (pagos, devoluciones, aforo) |
| Rutas GPS / tracks | Komoot y Strava lo hacen mejor. No es nuestro trabajo |
| App nativa | Sin datos que la justifiquen frente a una PWA |
| Recomendaciones con IA | Sin datos suficientes; una buena búsqueda rinde más |
| Perfiles scrapeados para crecer rápido | Rompe P1 y P2. Es el atajo que mata el producto |

---

## Cómo se cambia este roadmap

1. Toda propuesta entra con **PRD** ([`10`](./10-plantillas.md)) e hipótesis
   explícita.
2. Se prioriza por **nivel** primero, por **impacto ÷ esfuerzo** después.
3. Si algo entra por delante de otra cosa, **se dice qué sale**. El roadmap no
   crece por los lados.
4. Cada horizonte se revisa **trimestralmente** con los datos de
   [`06`](./06-metricas.md).

---

Documentos relacionados: [`05 Arquitectura`](./05-arquitectura-y-datos.md) ·
[`06 Métricas`](./06-metricas.md) · [`07 Monetización`](./07-monetizacion.md) ·
[`09 Operativa`](./09-operativa.md)
