# 03 · Principios de producto

Última revisión: 2026-08-16 · Estado: Vivo

> Un principio útil es el que **descarta opciones atractivas**. Si un principio
> no te ha hecho decir que no a nada, no es un principio: es un eslogan. Cada
> uno de estos lleva su coste explícito.

---

## P1 · Curación por encima de cobertura

**Qué significa.** Preferimos 500 fichas que valen la pena a 50.000 scrapeadas.
El valor de Decycles es lo que deja fuera.

**Lo que descarta.** Importaciones masivas de datos de terceros. Alta automática
sin revisión. Cualquier métrica de vanidad basada en "número total de fichas".

**El coste que aceptamos.** Crecemos más lento. Necesitamos trabajo humano de
curación que no escala solo.

**Cómo se aplica.** Toda ficha nueva pasa por revisión antes de ser pública. Los
criterios están escritos en [`09-operativa.md`](./09-operativa.md) y son
aplicables por alguien que no sea el fundador.

---

## P2 · El creador es dueño de su historia

**Qué significa.** El perfil lo escribe, edita y controla el creador. Nosotros
damos estructura y distribución, no narrativa.

**Lo que descarta.** Perfiles generados sin permiso. Reescribir su bio "para que
suene mejor". Poner publicidad de terceros en su ficha. Ordenar el directorio
por quién paga más.

**El coste que aceptamos.** Los perfiles serán desiguales. Algunos estarán mal
escritos. Preferimos eso a un directorio homogéneo y falso.

**Cómo se aplica.** El portal del creador (`/profile/edit`) tiene que ser lo
bastante bueno para que quiera usarlo. El toggle publicado/borrador es suyo,
siempre.

---

## P3 · El descubrimiento gratuito nunca se degrada

**Qué significa.** Podemos vender visibilidad **añadida** (destacados, badges,
alcance extra). No podemos empeorar la experiencia del que no paga.

**Lo que descarta.** Resultados de búsqueda ordenados por pago. Ocultar el
contacto tras un muro. Limitar cuántos perfiles se pueden ver. Anuncios
intersticiales.

**El coste que aceptamos.** Menos palancas de monetización agresiva. Ingresos
más lentos.

**Por qué.** El día que la búsqueda se venda al mejor postor, Decycles deja de
ser un mapa de criterio y pasa a ser un tablón de anuncios. Y además Google lo
penaliza.

---

## P4 · Móvil, con una mano, con mala cobertura

**Qué significa.** El uso real es en la calle: en el taller, en el viaje, entre
rodada y rodada. El escritorio es el caso secundario.

**Lo que descarta.** Tablas densas. Formularios largos en una sola pantalla.
Hovers como única forma de descubrir una acción. Imágenes sin comprimir.
Cualquier interacción que necesite dos manos.

**El coste que aceptamos.** Menos densidad de información por pantalla. Más
trabajo de diseño por feature.

**Cómo se aplica.** Se prueba a 360px antes de darlo por hecho. Presupuesto de
peso por pantalla. Imágenes siempre en WebP, comprimidas en cliente y con
`loading="lazy"` (ver [`docs/IMAGE_OPTIMIZATION.md`](../IMAGE_OPTIMIZATION.md)).

---

## P5 · Cada pantalla tiene un trabajo

**Qué significa.** Home descubre. Perfil convence. Evento convoca. Editor
gestiona. Una pantalla que hace tres cosas no hace ninguna bien.

**Lo que descarta.** Añadir "una cosita más" a la home. Modales dentro de
modales. Menús que crecen porque no sabemos dónde poner algo.

**El coste que aceptamos.** A veces hay que decir que no a una feature útil
porque no tiene sitio, y crear ese sitio cuesta.

**Señal de alarma.** Si `src/pages/Home.tsx` sigue creciendo, es que estamos
rompiendo este principio. Lo mismo con `EditProfile.tsx`, que ya pasa de 2.000
líneas.

---

## P6 · La marca es un activo del producto

**Qué significa.** El brutalismo premium — Anton, alto contraste, bordes de 2px,
neón `#ccff00` — no es un tema visual intercambiable. Es la señal de que esto lo
hace alguien de dentro de la escena.

**Lo que descarta.** Componentes genéricos de librería sin adaptar. Ilustraciones
de stock. Gradientes, sombras suaves, esquinas redondeadas grandes. Un rediseño
"más limpio" que quite personalidad.

**El coste que aceptamos.** Cada componente cuesta más de construir. La
accesibilidad hay que trabajarla explícitamente porque el estilo tira hacia el
contraste extremo y las mayúsculas.

**Regla concreta.** El neón es acento, nunca fondo de bloques grandes de texto.
Las mayúsculas son para display, nunca para párrafos.

Detalle completo en [`04-design-system.md`](./04-design-system.md).

---

## P7 · Bilingüe de verdad, global por defecto

**Qué significa.** EN y ES son ciudadanos de primera. El producto asume desde el
principio que el usuario puede estar en cualquier país.

**Lo que descarta.** Texto hardcodeado en componentes. Formatos de fecha
asumidos. Ordenaciones que solo funcionan en un alfabeto. "esto ya lo
traducimos luego".

**El coste que aceptamos.** Cada cadena cuesta el doble. Los diseños tienen que
aguantar textos un 30% más largos en español.

**Cómo se aplica.** Toda cadena visible en `src/i18n/en.ts` **y**
`src/i18n/es.ts`. Claves en kebab-case agrupadas por área. Si añades una clave a
uno, la añades al otro en el mismo commit.

---

## P8 · La confianza se gana con señales, no con adjetivos

**Qué significa.** Decir "creadores verificados" no genera confianza. Enseñar
cuándo se actualizó la ficha, cuántos eventos ha hecho el colectivo o quién
responde, sí.

**Lo que descarta.** Copy autoelogioso. Sellos sin criterio detrás. Contadores
inflados. Métricas de vanidad enseñadas al usuario.

**El coste que aceptamos.** Las señales hay que producirlas, y algunas solo
aparecen con el tiempo.

**Aplicación inmediata.** Mostrar "actualizado hace X" en la ficha es la señal
más barata y más honesta que existe. El dato ya está en Firestore.

---

## P9 · Instrumentar antes de opinar

**Qué significa.** Ninguna feature se da por terminada sin sus eventos de
analítica. Ninguna discusión sobre prioridades se gana con "yo creo que".

**Lo que descarta.** Lanzar y ver qué pasa sin haber definido qué mirar. Debates
de gustos sobre cosas medibles.

**El coste que aceptamos.** Un poco más de trabajo por feature, y la disciplina
de mirar los datos después.

**Cómo se aplica.** Convención de eventos y catálogo actual en
[`06-metricas.md`](./06-metricas.md).

---

## P10 · Construir para 50×, no para 50.000×

**Qué significa.** Las decisiones aguantan un orden de magnitud de crecimiento,
no tres. Sobre-arquitecturar hoy es tan caro como no arquitecturar nada.

**Lo que descarta.** Microservicios. Abstracciones para casos que no existen.
Migrar de Firebase "por si acaso".

**El coste que aceptamos.** Habrá que reescribir cosas. Está bien: reescribir
algo que funciona y tiene usuarios es un buen problema.

**Traducción práctica.** Hoy `useCreators` lee la colección entera de creadores
en cliente. Funciona con cientos. Con miles hay que paginar o indexar. Lo
sabemos, está registrado, y se hará cuando el número lo pida — no antes.

---

## Cómo se usan estos principios

**Para decidir.** Cuando dos opciones son defendibles, gana la que respeta más
principios. Cuando un principio bloquea algo valioso, es una decisión de nivel
ADR: se documenta la excepción y por qué.

**Para revisar.** En cualquier review, la pregunta es "¿qué principio rompe
esto?". Si no rompe ninguno, no hay debate de gustos.

**Para cambiarlos.** Un principio se puede cambiar. Pero se cambia
explícitamente, con una entrada en [`11-decisiones.md`](./11-decisiones.md), no
por deriva.

---

Documentos relacionados: [`00 Rol`](./00-CLAUDE-PRODUCT-LEAD.md) ·
[`04 Design system`](./04-design-system.md) · [`11 Decisiones`](./11-decisiones.md)
