# 13 · Espacio de oportunidad

Última revisión: 2026-08-16 · Estado: Vivo — *documento de exploración*

---

## Cómo leer esto

Este documento es **deliberadamente sin filtro**. Recoge todo lo que podría
aportar valor a alguien en Decycles, sin descartar nada por dificultad técnica,
coste o falta de recursos. Si algo es difícil, se anota qué haría falta — no se
elimina.

**Esto no es un roadmap.** El roadmap ([`08`](./08-roadmap.md)) es una secuencia
de compromisos; esto es un catálogo de posibilidades. Una idea de aquí solo pasa
allí después de pasar por la criba de [§14](#14-cómo-se-criba-esto).

Tres marcas aparecen a lo largo del documento:

| Marca | Significa |
|---|---|
| 🔥 | **Apuesta grande.** Podría redefinir qué es Decycles, no solo mejorarlo |
| ⚡ | **Desproporcionada.** Poco esfuerzo para lo que devuelve |
| ⚠️ | **Tensiona un principio** de [`03`](./03-principios-de-producto.md). No es un veto: es un aviso de que hace falta una decisión explícita |

Las ideas se agrupan por **el trabajo que resuelven**, no por área técnica.
Perfiles de usuario en [`02`](./02-usuarios-y-jobs.md): D1 Buscador de Oficio ·
D2 Ciclista en Movimiento · D3 El Que Busca Plan · O1 Artesano · O2 Colectivo ·
O3 Creativo · C1 Curador.

---

## 1 · Encontrar mejor

*El bucle principal. Todo lo que hace que alguien dé con la persona correcta.*

| Idea | Qué es | Para quién | Por qué vale |
|---|---|---|---|
| **Búsqueda por intención** ⚡ | Escribir "quiero un cuadro de acero a medida en España" y que funcione, en vez de buscar por palabra clave | D1 | La gente busca por problema, no por taxonomía |
| **Filtro por material y técnica** | Acero, titanio, carbono, aluminio · fillet brazed, lugged, TIG, soldadura de latón | D1 | Es *exactamente* como piensa quien busca un constructor |
| **Filtro por plazo de entrega** | Disponible ya · 1–3 meses · 6+ meses · lista cerrada | D1 | El plazo es tan decisivo como el precio, y hoy es invisible |
| **Filtro por rango de precio** | Orientativo por horquillas, no precio exacto | D1 | Ahorra conversaciones que no van a ningún sitio, en los dos lados |
| **"Cerca de mí"** ⚡ | Geolocalización del navegador, ordenado por distancia real | D2 | El caso de uso más urgente y hoy no existe |
| **Abierto ahora** | Horarios reales, festivos, cierre por vacaciones | D2 | Un taller cerrado es una ficha inútil en el momento de necesidad |
| **Radio de búsqueda en el mapa** | "Todo lo que hay a 30 km de aquí" | D2, D3 | El mapa hoy muestra, pero no responde a esa pregunta |
| **Búsqueda por ruta** 🔥 | Dibuja un trayecto Madrid→Lisboa y te devuelve todo lo que hay en el corredor | D2 | Nadie tiene esto. Es el descubrimiento nativo del cicloturista |
| **Rutas guardadas con paradas** | Un viaje planificado con talleres, cafés y eventos como waypoints | D2 | Convierte el descubrimiento en un plan de viaje |
| **Búsqueda visual** 🔥 | Subes una foto de una bici que te gusta y te muestra quién hace algo así | D1 | La escena es visual. La gente guarda fotos, no nombres |
| **Filtro por estética** | Clásico · racing · randonneur · bikepacking · urbano · pista | D1 | El estilo es lo que realmente busca la gente, y no está en la taxonomía |
| **Búsqueda por problema de la bici** | "Se me sale la cadena", "quiero convertirla a gravel" → especialistas que lo resuelven | D1, D2 | Baja la barrera del que no sabe cómo se llama lo que necesita |
| **Comparador de creadores** | Poner dos o tres fichas lado a lado: especialidad, materiales, plazo, zona | D1 | El momento de decidir hoy es un ir y venir entre pestañas |
| **Descubrimiento serendípico** | "Enséñame algo que no buscaba" — una ficha excelente al azar | D1, D3 | La curación merece un modo de exploración, no solo de búsqueda |
| **Filtro por accesibilidad e inclusión** | Talleres con acceso adaptado, grupos femeninos, iniciativas inclusivas | D3 | Amplía quién puede entrar en la escena, no solo quién ya está dentro |
| **Filtro por idioma de atención** | Qué idiomas habla el taller | D2 | Determinante viajando, e invisible hoy |
| **Filtro por sostenibilidad** | Reacondicionado, reparación frente a reemplazo, materiales reciclados | D1 | Valor real y creciente en esta escena concreta |

---

## 2 · Confiar antes de contactar

*El hueco más grande del producto hoy. Ver [`02`](./02-usuarios-y-jobs.md) §5.*

| Idea | Qué es | Para quién | Por qué vale |
|---|---|---|---|
| **"Actualizado hace X"** ⚡ | Fecha visible de última edición de la ficha | D1, D2 | La señal de confianza más barata que existe. El dato ya está |
| **Sello de verificado** | Identidad y trabajo comprobados, con criterio público | Todos | Convierte la curación invisible en algo que el usuario ve |
| **Historial del taller** | "Trabajando desde 1998" · "más de 200 cuadros construidos" | D1 | Ninguna reseña compite con la antigüedad demostrada |
| **Reseñas verificadas** ⚠️ | Solo de quien demuestre haber sido cliente | D1 | Prueba social real. Tensiona P1 por el coste de moderación |
| **Testimonios elegidos por el creador** | Él escoge qué citas de clientes muestra | O1 | Prueba social sin abrir la puerta al conflicto |
| **Trabajos terminados con ficha** 🔥 | Cada bici construida con su historia: cliente, materiales, geometría, fotos, tiempo | D1, O1 | Es el portfolio real de un constructor, y hoy es una galería sin contexto |
| **Créditos cruzados** | El fotógrafo aparece acreditado en la ficha del constructor, y viceversa | O1, O3 | Teje la red y da trabajo a los creativos. Nadie más puede hacerlo |
| **Respuesta típica** | "Suele responder en 2 días" | D1 | Calibra la expectativa y premia al que atiende |
| **Estado de agenda** | Aceptando encargos · lista de espera · cerrado | O1, D1 | Evita frustración en ambos lados |
| **Menciones en prensa** | Enlaces a artículos, vídeos y revistas donde ha salido | O1 | Prueba social externa que ya existe y nadie está agregando |
| **Firmas y certificaciones** | Formación en frame building, certificaciones de mecánica | O1 | Señal de oficio en un sector sin titulaciones claras |
| **"Recomendado por"** | Otros creadores del directorio lo avalan | Todos | Confianza entre pares: la moneda real de esta escena |
| **Precio orientativo publicado** | Horquillas por tipo de trabajo | D1 | La pregunta que todo el mundo tiene y nadie se atreve a hacer |

---

## 3 · Volver

*Hoy el descubrimiento es de un solo uso. Esto lo convierte en una relación.*

| Idea | Qué es | Para quién | Por qué vale |
|---|---|---|---|
| **Alertas por ciudad y categoría** ⚡ | "Avísame de nuevas rodadas de gravel en Barcelona" | D3, D2 | La razón más barata para volver que existe |
| **Resumen semanal por email** | Lo nuevo en tu zona y en tus categorías | Todos | Recurrencia sin depender de que se acuerden de nosotros |
| **Recordatorios de evento** | Aviso 48 h antes de lo que confirmaste + fichero de calendario | D3 | Convierte un RSVP en asistencia real |
| **Listas propias** | "Mi próximo viaje a Japón", "Talleres para la restauración" | D1, D2 | Los favoritos actuales son un cajón; las listas son un plan |
| **Listas públicas y compartibles** 🔥 | Curación hecha por usuarios: "los 12 mejores constructores de acero de Europa" | Todos | Contenido, SEO y comunidad a coste cero para nosotros |
| **Seguir a un creador** ⚠️ | Enterarte cuando publica trabajo o evento nuevo | D1 | Recurrencia real. Tensiona la anti-visión de "red social" |
| **"Nuevo desde tu última visita"** | Qué ha cambiado en lo que te interesa | Todos | Da sentido a volver aunque no busques nada |
| **Racha de descubrimiento** ⚠️ | Reconocimiento por descubrir y guardar creadores nuevos | D1 | Gamificación: eficaz, pero mal ejecutada abarata la marca |
| **Diario de la bici** 🔥 | Tu bici, sus componentes, quién hizo qué, mantenimientos y kilómetros | D1, D2 | Razón para volver cada mes, y conecta con los talleres del directorio |
| **Recordatorio de mantenimiento** | "Llevas 4.000 km, toca revisar la transmisión" → talleres cerca | D2 | Utilidad pura, recurrente y con intención comercial altísima |
| **Notificaciones push (PWA)** | Sin app nativa, con permiso explícito | D3 | Eventos y alertas en el bolsillo |

---

## 4 · Eventos y comunidad

*El motor natural de recurrencia. Hoy está a medio construir.*

| Idea | Qué es | Para quién | Por qué vale |
|---|---|---|---|
| **Eventos recurrentes completos** ⚡ | El campo existe en el modelo; falta la interfaz | O2 | La mayor parte de la escena son rodadas semanales fijas |
| **Duplicar evento** ⚡ | Clonar la edición del año pasado | O2 | Elimina la fricción que hace que no se publique |
| **Nivel y ritmo** | Principiante · social · rápido · competitivo · km y desnivel | D3 | El miedo a no encajar es la barrera nº1 para asistir |
| **Punto de encuentro en el mapa** | Pin exacto, no una dirección aproximada | D3 | En una rodada, cinco minutos de retraso es perder el grupo |
| **Lista de asistentes visible** ⚠️ | Ver quién va (con opción de ir en privado) | D3 | La prueba social es lo que decide la asistencia |
| **Chat del evento** ⚠️ | Hilo para el día de antes: dudas, tiempo, cambios | D3, O2 | Utilidad real. Trae moderación y responsabilidad |
| **Cancelación por meteorología** | Avisar a los confirmados con un botón | O2 | El caso real más frecuente en una rodada |
| **Track GPS del recorrido** | Adjuntar GPX y previsualizarlo | D3 | Saber por dónde va antes de apuntarse |
| **Fotos después del evento** | Álbum colectivo del día | D3, O3 | Cierra el bucle y genera el contenido del año siguiente |
| **Serie de eventos** | Una liga, un calendario de gravel, un ciclo de talleres | O2 | Convierte eventos sueltos en algo que se sigue |
| **Ticketing y aforo** 🔥 | Plazas limitadas, entradas, lista de espera | O2 | Camino directo a ingresos transaccionales |
| **Coche compartido para llegar** | Coordinar transporte hasta la salida | D3 | Elimina la barrera logística de eventos fuera de la ciudad |
| **Swap meets y mercadillos** ⚠️ | Formato propio para intercambio y venta entre particulares | Todos | Es una parte enorme de esta cultura y no tiene sitio hoy |
| **Voluntariado y apoyo** | Quién hace falta para que un evento salga | O2 | Los colectivos viven de esto |

---

## 5 · El taller del creador

*Herramientas que le ahorran trabajo y le devuelven algo. La clave de la retención de oferta.*

| Idea | Qué es | Para quién | Por qué vale |
|---|---|---|---|
| **Panel de estadísticas** 🔥 | Visitas, clics salientes, favoritos, de dónde viene la gente | O1, O2, O3 | **La brecha central del producto.** Sin esto no hay retención ni monetización |
| **Resumen mensual por email** | "Este mes 47 personas fueron de Decycles a tu web" | O1 | Convierte una ficha estática en una relación |
| **Alta en 5 minutos** ⚡ | Formulario mínimo + segundo paso opcional | O1 | El abandono en el alta es un agujero invisible hoy |
| **Importar desde Instagram** 🔥 | Rellenar la ficha desde su perfil existente: fotos, bio, ubicación | O1 | Elimina la razón nº1 para no completar el perfil |
| **Importar desde web o Google Business** | Lo mismo, desde otras fuentes | O1 | El artesano no quiere volver a escribir lo que ya escribió |
| **Recordatorio de ficha desactualizada** | "Llevas 8 meses sin tocarla, ¿sigue todo igual?" | O1, C1 | Mantiene vivo el directorio con un email |
| **Vista previa pública** | Ver la ficha como la ve un desconocido | O1 | Corrige el sesgo de quien lleva meses editándola |
| **Ayuda con el texto** | Sugerencias para escribir una bio a partir de cuatro preguntas | O1 | El artesano no es escritor, y su bio lo delata |
| **Editor de galería mejorado** | Reordenar, agrupar por proyecto, pies de foto | O1, O3 | Hoy es un montón de imágenes sin contexto |
| **Vídeo en la ficha** | Un vídeo corto del taller trabajando | O1 | El oficio se entiende viéndolo, no leyéndolo |
| **Recorrido 360º del taller** | Vista inmersiva del espacio | O1 | Diferencial brutal para talleres con personalidad |
| **Multi-idioma de la ficha** | El creador escribe en su idioma, se ofrece traducción | O1 | Abre su alcance a todo el directorio global |
| **Varios gestores por ficha** | Que un colectivo no dependa de una sola cuenta | O2 | Los voluntarios rotan; las cuentas no deberían morir con ellos |
| **Formulario de contacto propio** | Con campos útiles: tipo de trabajo, plazo, presupuesto | O1 | Filtra consultas y ahorra horas de correo |
| **Bandeja de solicitudes** | Las consultas recibidas, ordenadas, con estado | O1 | Empieza a ser una herramienta de trabajo, no un escaparate |
| **Exportar sus datos** | Llevarse fotos, textos y contactos cuando quiera | O1 | Refuerza P2: es suyo de verdad, y se nota |
| **Widget para su web** ⚡ | "Próximos eventos" o "verificado en Decycles" incrustable | O1, O2 | Backlinks, marca y utilidad, todo a la vez |
| **Tarjeta compartible** | Imagen de su ficha lista para Stories | O1 | Distribución gratuita hecha por ellos mismos |
| **Comparativa con su categoría** | "Estás en el 20% más visitado de constructores de acero" | O1 | El dato que hace volver al panel cada mes |

---

## 6 · Contenido y marca

*Lo que hace que Decycles sea una publicación con criterio y no un listado.*

| Idea | Qué es | Para quién | Por qué vale |
|---|---|---|---|
| **Perfil largo del mes** 🔥 | Un reportaje editorial sobre un creador | Todos | Marca, SEO de cabecera y el mayor incentivo para entrar al directorio |
| **Guías de ciudad** ⚡ | "La escena independiente de Berlín" | D2 | SEO potentísimo y densidad local en un solo movimiento |
| **Anuario impreso** 🔥 | Un libro anual de la escena, con las mejores fichas y reportajes | Todos | Objeto de deseo, ingresos y marca en un formato que nadie espera |
| **Boletín editorial** | Semanal o quincenal, con criterio, no automático | Todos | Canal propio que no depende de ningún algoritmo |
| **Podcast de oficio** | Conversaciones largas con constructores y mecánicos | Todos | El formato que mejor encaja con esta cultura |
| **Documentación técnica abierta** | Geometrías, materiales, procesos, glosario | D1 | Educar al comprador hace crecer todo el mercado |
| **Historia de la escena** | Archivo de marcas, talleres y eventos históricos | Todos | Nadie lo está haciendo y se está perdiendo |
| **Mapa de la industria** | Quién provee a quién: tubos, pintura, componentes | O1 | B2B invisible que solo nosotros vemos |
| **Galería de trabajos destacados** | Curada, con crédito completo | O3 | Vitrina para creativos y contenido para compartir |
| **Retos y convocatorias** | "Enséñanos tu bici de invierno" | Todos | Contenido generado con propósito, no por engagement |

---

## 7 · Dinero y transacción

*Todo lo que convierte descubrimiento en negocio. Ver [`07`](./07-monetizacion.md).*

| Idea | Qué es | Para quién | Por qué vale |
|---|---|---|---|
| **Suscripción PRO del creador** | Estadísticas completas, galería ilimitada, herramientas | O1 | El motor principal previsto |
| **Eventos destacados** | Visibilidad extra, siempre etiquetada | O2 | Ingreso por unidad, sin compromiso recurrente |
| **Reserva de cita** 🔥 | Pedir hora en el taller desde la ficha | D2, O1 | Utilidad enorme; convierte intención en visita |
| **Presupuesto guiado** | Un flujo que produce una petición bien formada | D1, O1 | Ahorra horas de ida y vuelta a los dos lados |
| **Señal de encargo** ⚠️ | Depósito para entrar en lista de espera | O1 | Filtra clientes serios. Nos mete en la transacción |
| **Mercado de segunda mano** 🔥⚠️ | Compraventa entre particulares, curada | Todos | Es donde ocurre gran parte de esta cultura. Otro producto, en realidad |
| **Tienda de trabajos disponibles** | Lo que un constructor tiene hecho y listo para vender | O1, D1 | El stock existente hoy no tiene escaparate |
| **Bonos de taller** | Prepago de mantenimiento anual | O1 | Ingreso recurrente para el creador, no para nosotros |
| **Patrocinio de categoría** | Marcas de nicho patrocinando una sección | — | Ticket alto y encaje natural |
| **Directorio de proveedores B2B** | Para constructores: tubos, pintura, herramienta | O1 | Un negocio distinto dentro del mismo mapa |
| **Afiliación honesta** ⚠️ | Comisión solo en enlaces a productos de los propios creadores | — | Ingreso pasivo. Riesgo de sesgar la curación |
| **Micromecenazgo de proyectos** | Financiar un cuadro, una expedición, una revista | Todos | La escena ya lo hace en otras plataformas, sin contexto |

---

## 8 · Inteligencia y datos

*Lo que solo se puede hacer teniendo estos datos estructurados.*

| Idea | Qué es | Para quién | Por qué vale |
|---|---|---|---|
| **Asistente de búsqueda conversacional** 🔥 | "Busco quien restaure una Colnago del 87 cerca de Milán" | D1 | El interfaz natural para un problema complejo |
| **Recomendación por afinidad** | "Si te gusta este constructor, mira estos tres" | D1 | Descubrimiento que hoy depende del azar |
| **Detección de fichas muertas** | Señales automáticas de abandono y webs caídas | C1 | La curación a escala necesita que la máquina avise |
| **Detección de duplicados** | Mismo creador dado de alta dos veces | C1 | Higiene del directorio sin trabajo manual |
| **Sugerencia de categorías** | Al crear la ficha, proponer taxonomía a partir del texto | O1, C1 | Menos fricción y taxonomía más limpia |
| **Traducción automática de fichas** | Con revisión del creador | O1 | Alcance global sin trabajo extra |
| **Descripción automática de imágenes** | Alt text real para accesibilidad y SEO | Todos | Dos problemas resueltos con una acción |
| **Informe de escena** | "Densidad de constructores de acero en Europa 2027" | — | Producto de datos y pieza de prensa a la vez |
| **Mapa de calor de demanda** | Dónde se busca y no hay oferta | C1 | Dice exactamente dónde captar |
| **Predicción de encargo** | Qué fichas están a punto de recibir consultas | O1 | Insight que justifica una suscripción por sí solo |

---

## 9 · Plataforma abierta

*Convertir Decycles en infraestructura que otros usan.*

| Idea | Qué es | Para quién | Por qué vale |
|---|---|---|---|
| **API pública** 🔥 | Que otros consulten creadores y eventos | — | Distribución sin coste marginal y posición de estándar |
| **Widgets incrustables** ⚡ | Mapa o calendario en la web de cualquiera | O1, O2 | Backlinks masivos y presencia fuera de casa |
| **Calendario en formato abierto** | Suscripción iCal por ciudad o categoría | D3 | Los eventos aparecen en el calendario personal de la gente |
| **Exportación de datos abiertos** | Volcado agregado para investigación y prensa | — | Autoridad y cobertura mediática |
| **Integración con Komoot / Strava** | Puntos de interés del directorio dentro de sus rutas | D2 | Distribución en el sitio exacto donde se planifica |
| **Integración con Google Business** | Sincronizar horarios y datos del taller | O1 | Elimina el trabajo duplicado del creador |
| **Bot de la escena** | Consultar el directorio desde Discord o WhatsApp | D3 | Donde ya vive la conversación de los colectivos |
| **Portal de marca blanca** | Que una federación o revista monte su directorio sobre el nuestro | — | Modelo B2B con nuestra infraestructura |

---

## 10 · Mundo físico

*Ideas que salen de la pantalla. Aquí es donde una marca de cultura se juega la credibilidad.*

| Idea | Qué es | Para quién | Por qué vale |
|---|---|---|---|
| **Pegatina del directorio** ⚡ | Un vinilo para el escaparate del taller | O1 | Marca en el mundo real, coste ridículo, y a los talleres les encanta |
| **Placa de verificado** | Placa física para el taller verificado | O1 | Convierte un badge digital en un objeto con orgullo |
| **Rutas señalizadas** 🔥 | Recorridos que enlazan talleres de una región | D2 | Un producto turístico completo dentro del mapa |
| **Presencia en ferias** | Stand en swap meets y ferias de frame building | Todos | Donde está físicamente toda la oferta a la vez |
| **Encuentro anual Decycles** 🔥 | Un evento propio que reúna a la escena | Todos | El momento en que la comunidad se hace real |
| **Merchandising con criterio** | Poco, bueno, con los creativos del directorio | Todos | Ingresos y marca, hecho con la propia comunidad |
| **Talleres itinerantes** | Formación de mantenimiento en ciudades | D3 | Capta demanda y da protagonismo a los talleres locales |

---

## 11 · Curación a escala

*Para que el crecimiento no rompa lo que hace bueno al producto.*

| Idea | Qué es | Para quién | Por qué vale |
|---|---|---|---|
| **Cola de revisión con contexto** | Fichas pendientes con toda la información para decidir | C1 | El backoffice gestiona, pero no cura. Este es el cuello de botella |
| **Estados de ficha** | Borrador · en revisión · publicada · cambios pedidos · archivada | C1, O1 | Hace explícito un proceso que hoy es informal |
| **Motivos de rechazo con plantilla** | Respuestas escritas, reutilizables y respetuosas | C1 | Rechazar bien es parte de la marca |
| **Moderadores regionales** | Gente de dentro de cada escena con criterio | C1 | La única forma de que la curación escale sin diluirse |
| **Registro de moderación** | Quién hizo qué y por qué | C1 | Necesidad legal además de operativa |
| **Denunciar desde la web** | Botón público para avisar de un problema | Todos | Miles de ojos frente a uno |
| **Propuesta de creador por la comunidad** ⚡ | "Conozco a alguien que debería estar aquí" | Todos | Captación gratuita y de altísima calidad |
| **Panel de cobertura** | Dónde hay hueco geográfico y de categoría | C1 | Convierte la captación en algo dirigido |
| **Puntuación de calidad de ficha** | Qué le falta a cada perfil para estar completo | O1, C1 | Sube el nivel medio sin intervención humana |

---

## 12 · Accesibilidad y alcance

*A quién no estamos sirviendo hoy.*

| Idea | Qué es | Por qué vale |
|---|---|---|
| **Auditoría y arreglo de accesibilidad** | Contraste, foco, lectores de pantalla, navegación por teclado | El estilo brutalista tira al contraste extremo: hay que verificarlo, no suponerlo |
| **Modo de baja conexión** | Versión ligera para datos móviles malos | El uso real es en la calle, de viaje |
| **Uso sin cuenta** | Guardar favoritos y listas sin registrarse | Fricción eliminada en el momento exacto de valor |
| **Más idiomas** | Alemán, francés, japonés, italiano | Donde hay escena de frame building fuerte |
| **Contenido en el idioma local** | No solo interfaz: también las fichas | Un directorio global escrito solo en inglés no es global |
| **PWA instalable** | Icono en la pantalla de inicio, sin app store | Casi todo el valor de una app nativa, a una fracción del coste |
| **Modo offline** | Ver lo guardado sin cobertura | Bikepacking, montaña, viaje |

---

## 13 · Las cinco apuestas grandes

Si hubiera que elegir cinco cosas que **cambiarían la naturaleza del producto**,
serían estas. No están ordenadas por facilidad.

### 🔥 1 · El panel del creador
*Sección 5.* La única que no es opcional. Hoy el creador sube su ficha y no
vuelve a saber nada de Decycles. Sin devolverle una señal de valor no hay
retención de oferta, y sin retención de oferta no hay directorio vivo ni
monetización posible. **Todo lo demás en este documento asume que esto existe.**

### 🔥 2 · El diario de la bici
*Sección 3.* Tu bici, con sus componentes, quién construyó cada pieza, su
historial de mantenimiento y sus kilómetros. Convierte Decycles de un directorio
que consultas una vez a un sitio con **tus datos dentro**. Y conecta de forma
natural con los talleres: cada mantenimiento pendiente es una consulta a punto de
ocurrir. Es la idea con más potencial de recurrencia de todo el documento.

### 🔥 3 · La búsqueda por ruta
*Sección 1.* Dibujas un trayecto y te devuelve todo lo que hay en el corredor:
talleres, cafés, colectivos, eventos de esas fechas. **Nadie tiene esto.** Es
descubrimiento nativo del ciclista viajero, imposible de replicar sin datos
geolocalizados y curados — es decir, sin ser Decycles.

### 🔥 4 · Los trabajos terminados
*Sección 2.* Cada bici construida con su ficha completa: cliente, materiales,
geometría, fotos, tiempo de construcción, fotógrafo acreditado. Resuelve la
confianza (ves el trabajo real, no una galería suelta), genera SEO de cola larga
infinito, y teje la red entre constructores y creativos. Es el contenido que la
escena produce constantemente y que hoy se pierde en Instagram.

### 🔥 5 · El anuario impreso
*Sección 6.* Un libro anual de la escena independiente. Suena fuera de lugar en
un producto digital, y por eso funciona: es un objeto de deseo en una cultura que
valora lo material, un ingreso sin dependencia de plataformas, y la prueba
definitiva de que "estar en Decycles" significa algo. Ninguna app compite con
estar impreso en un libro que la gente guarda.

---

## 14 · Cómo se criba esto

Un documento sin filtro solo sirve si hay un filtro después. Cualquier idea de
aquí pasa por estas cinco preguntas antes de entrar al [roadmap](./08-roadmap.md):

1. **¿Qué job resuelve, de qué perfil concreto?** Si no encaja en ninguno de
   [`02`](./02-usuarios-y-jobs.md), o es una idea para nadie o falta un perfil
   por documentar.
2. **¿Mueve la North Star?** Conexiones cualificadas al mes. Si no la mueve ni
   directa ni indirectamente, tiene que justificar su existencia por otra vía
   (marca, curación, riesgo).
3. **¿Rompe algún principio?** Las marcadas con ⚠️ necesitan una decisión
   explícita registrada en [`11`](./11-decisiones.md), no un encogimiento de
   hombros.
4. **¿Cuál es la versión mínima que enseña lo mismo?** Casi todas las ideas de
   aquí tienen una versión del 10% del esfuerzo que resuelve el 60% del valor.
   Esa es la que entra.
5. **¿Cuánto cuesta operarla cada mes?** Moderación, soporte, contenido,
   infraestructura. Las ideas caras de operar matan proyectos pequeños mucho
   antes que las caras de construir.

**Criterio de desempate:** entre dos ideas igual de buenas, gana la que **hace
que un creador quiera volver mañana**. Es lo que hoy le falta al producto, y
todo lo demás depende de ello.

---

## 15 · Cómo se mantiene este documento

- **Las ideas se añaden, no se discuten aquí.** El debate va al PRD.
- **Nada se borra por parecer imposible.** Se anota qué haría falta.
- Cuando una idea pasa al roadmap, se marca aquí con `→ 08` y su horizonte.
- Cuando una se descarta de verdad, se mueve a la lista de "no ahora" de
  [`08`](./08-roadmap.md) **con la razón escrita**. Una idea descartada sin
  motivo vuelve a proponerse cada seis meses.
- Revisión sugerida: **trimestral**, junto con la revisión de estrategia.

---

Documentos relacionados: [`02 Usuarios`](./02-usuarios-y-jobs.md) ·
[`03 Principios`](./03-principios-de-producto.md) ·
[`07 Monetización`](./07-monetizacion.md) · [`08 Roadmap`](./08-roadmap.md)
