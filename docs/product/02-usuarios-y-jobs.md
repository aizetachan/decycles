# 02 · Usuarios y jobs-to-be-done

Última revisión: 2026-08-16 · Estado: Vivo

> ⚠️ Estos perfiles son **hipótesis fundadas**, construidas desde el producto
> existente y el conocimiento de la escena, no desde entrevistas sistemáticas.
> Cada uno lleva marcado qué habría que validar. Validarlos es trabajo de
> Horizonte 1.

---

## 1. Mapa de actores

Decycles es un **marketplace de descubrimiento de dos lados** con un tercer
actor que lo sostiene:

```
   DEMANDA                    PLATAFORMA                  OFERTA
   ────────                   ──────────                  ─────
   Ciclista curioso    ──►    Directorio curado    ◄──    Constructor / taller
   Ciclista viajero    ──►    Mapa                 ◄──    Colectivo / club
   Organizador local   ──►    Calendario           ◄──    Creativo / medio
                                   ▲
                                   │
                              Curador / admin
                            (el que da criterio)
```

Sin oferta no hay nada que descubrir. Sin demanda la oferta se marcha. Sin
curación esto es un directorio genérico. **En este orden se construye: oferta →
curación → demanda.**

---

## 2. Perfiles de demanda

### 🚴 D1 · El Buscador de Oficio
*El corazón del producto.*

**Quién es.** Ciclista con criterio, 28–50. Ya tiene bici; ahora quiere *la*
bici, o quiere que se la arregle alguien que sepa. Sigue a constructores en
Instagram. Le importa quién hizo las cosas.

**Job-to-be-done.**
> Cuando estoy pensando en un cuadro a medida o en un trabajo serio en mi bici,
> quiero encontrar a gente que haga ese trabajo concreto y ver si su mano me
> gusta, para no jugármelo con el primero que salga en Google.

**Cómo lo resuelve hoy sin nosotros.** Instagram + hashtags, recomendaciones en
foros y Discord, preguntar en su tienda local.

**Qué le duele.** Instagram no tiene mapa ni filtros; los foros están muertos;
Google devuelve cadenas y tiendas genéricas.

**Qué necesita de Decycles.** Filtros por especialidad y material · fotos reales
del trabajo · ubicación · contacto directo · señal de que el creador está activo.

**Momento de éxito.** Encuentra a alguien nuevo, le escribe.

**A validar:** ¿el filtro por material/especialidad es lo que usa, o busca por
ciudad primero?

---

### ✈️ D2 · El Ciclista en Movimiento

**Quién es.** Viaja por trabajo o por rodar. Bikepacker, cicloturista, alguien
que se muda de ciudad.

**Job-to-be-done.**
> Cuando estoy en una ciudad que no es la mía, quiero saber dónde hay taller
> bueno, café ciclista y gente con la que rodar esta semana, para no perder el
> viaje ni quedarme tirado.

**Qué necesita.** Mapa con geolocalización · horarios y contacto · eventos de
estos días · funcionamiento en móvil con mala conexión.

**Momento de éxito.** Abre el mapa en una ciudad nueva y encuentra algo el mismo
día.

**Nota de producto.** Es el perfil con **mayor urgencia** y el que mejor valida
el mapa. Hoy el producto no tiene horarios ni "abierto ahora", que es
exactamente lo que este perfil pide.

---

### 🎪 D3 · El Que Busca Plan

**Quién es.** Quiere rodar acompañado. Recién llegado a la escena o recién
llegado a la ciudad.

**Job-to-be-done.**
> Cuando quiero rodar con gente, quiero ver qué pasa cerca de mí las próximas
> semanas y saber si encajo, para no presentarme en el sitio equivocado.

**Qué necesita.** Calendario filtrable por ciudad y tipo · nivel/ritmo esperado ·
saber cuánta gente va · recordatorio.

**Momento de éxito.** Hace RSVP y aparece.

**Nota de producto.** Es el **motor de recurrencia**. Un evento tiene fecha, y
una fecha es una razón para volver. Es el único perfil con frecuencia natural
semanal/mensual.

---

## 3. Perfiles de oferta

### 🔧 O1 · El Artesano
*Constructor de cuadros, pintor, restaurador, mecánico especializado.*

**Quién es.** Trabaja solo o con una persona más. Lista de espera de meses o
ninguna, sin término medio. Odia el marketing. Su web es de 2016 o no existe.

**Job-to-be-done.**
> Quiero que la gente que valora mi trabajo me encuentre, sin tener que
> convertirme en creador de contenido.

**Qué le duele.** Instagram le exige publicar constantemente. Google le pide SEO.
Su tiempo se va en el taller, que es donde debe estar.

**Qué necesita de Decycles.** Alta en menos de 10 minutos · una página que se vea
profesional sin esfuerzo · aparecer en búsquedas de su especialidad · **prueba de
que le llega gente**.

**Momento de éxito.** Alguien le escribe diciendo "te vi en Decycles".

**El bloqueo real.** Hoy el producto no le devuelve *ninguna* señal de valor.
Sube su ficha y no vuelve a saber nada. Ese es el problema número uno del
producto.

---

### 🏴 O2 · El Colectivo

**Quién es.** Club, crew, grupo de rodada, asociación de advocacy. Gestionado por
voluntarios. Comunica por WhatsApp e Instagram Stories.

**Job-to-be-done.**
> Quiero que llegue gente nueva a nuestras rodadas sin tener que perseguir el
> algoritmo cada semana.

**Qué necesita.** Publicar eventos rápido · eventos recurrentes sin reintroducir
datos · ver cuánta gente confirma · un enlace que compartir.

**Nota de producto.** El campo `recurringEvent` ya existe en el modelo pero no
tiene interfaz completa. Es la mejora de mayor ratio impacto/esfuerzo para este
perfil.

---

### 📷 O3 · El Creativo

**Quién es.** Fotógrafo, cineasta, ilustrador, revista independiente. Vive de
encargos.

**Job-to-be-done.**
> Quiero que marcas, tiendas y organizadores del mundo ciclista me encuentren
> cuando necesitan a alguien que entienda esto.

**Qué necesita.** Portfolio visual con peso · categorización clara de lo que hace
· contacto profesional.

**Nota de producto.** Es el perfil que más **aporta a la marca**: sus imágenes
son las que hacen que la galería y el grid se vean bien. Merece un trato de
producto mejor del que tiene.

---

## 4. El curador

### 👁️ C1 · El Guardián del Criterio
*Hoy: el fundador. Mañana: un equipo pequeño o moderadores por región.*

**Job-to-be-done.**
> Quiero mantener el nivel del directorio a medida que crece, sin revisar cada
> ficha a mano.

**Qué necesita.** Cola de revisión con contexto · criterios escritos y aplicables
por otros · señales automáticas de ficha muerta o sospechosa · acciones en lote.

**Nota de producto.** El backoffice actual (`/admin`) sirve para *gestionar*
pero no para *curar*: no hay estado de revisión, ni cola, ni motivo de rechazo.
Es el cuello de botella que aparecerá justo cuando el producto empiece a
funcionar. Ver [`09-operativa.md`](./09-operativa.md).

---

## 5. Matriz job → estado del producto

| Job | Perfil | Cubierto hoy | Hueco principal |
|---|---|---|---|
| Encontrar especialista por oficio | D1 | 🟢 Alto | Sin señal de actividad/verificación |
| Ver el trabajo antes de contactar | D1, O3 | 🟢 Alto | Galería sin contexto (qué es cada foto) |
| Encontrar taller estando de viaje | D2 | 🟡 Medio | Sin horarios, sin "abierto ahora", sin "cerca de mí" |
| Encontrar plan para rodar | D3 | 🟡 Medio | Sin recordatorios, sin nivel/ritmo, sin filtro por distancia |
| Ser encontrado sin hacer marketing | O1 | 🟡 Medio | **Sin ninguna prueba de valor devuelta al creador** |
| Publicar eventos con poco esfuerzo | O2 | 🟡 Medio | Recurrentes incompletos, sin duplicar evento |
| Mostrar portfolio profesional | O3 | 🟡 Medio | Sin créditos, sin enlace a encargo |
| Mantener el nivel al escalar | C1 | 🔴 Bajo | Sin flujo de revisión ni criterios operativos |
| Volver cada mes sin que me avisen | D3 | 🔴 Bajo | Sin notificaciones de ningún tipo |
| Confiar en un desconocido | D1, D2 | 🔴 Bajo | Sin verificación, reseñas ni prueba social |

**Lectura:** el producto es fuerte en *descubrir* y débil en *confiar*, *volver*
y *demostrar valor*. Los tres huecos rojos son, por ese orden, la agenda del
Horizonte 1.

---

## 6. Cómo se investiga esto

No inventes perfiles nuevos sin datos. Fuentes disponibles hoy:

1. **GA4** — qué se filtra, qué se busca, qué búsquedas no dan resultados
   (`search_no_results` ya está instrumentado y es oro puro: es demanda
   insatisfecha literal).
2. **Panel admin** — qué fichas se ven más, cuáles están sin publicar, cuáles
   llevan meses sin tocarse.
3. **Firestore** — distribución real por país, categoría y densidad.
4. **Conversación directa** — 10 llamadas de 20 minutos con creadores ya dados de
   alta valen más que cualquier análisis. Es lo que falta.

Plantilla de guion de entrevista en [`10-plantillas.md`](./10-plantillas.md).

---

Documentos relacionados: [`01 Visión`](./01-vision-y-estrategia.md) ·
[`06 Métricas`](./06-metricas.md) · [`08 Roadmap`](./08-roadmap.md)
