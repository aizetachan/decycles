# 14 · Recurrencia del usuario no creador

Última revisión: 2026-08-16 · Estado: Vivo

> Este documento trata **solo del lado de la demanda**: el ciclista que usa
> Decycles para descubrir, no el creador que publica. Perfiles D1, D2 y D3 de
> [`02-usuarios-y-jobs.md`](./02-usuarios-y-jobs.md).
>
> La retención del creador se trata en otro sitio ([`08`](./08-roadmap.md) H1).
> Aquí no aparece.

---

## 1. El problema

**El descubrimiento es un acto de un solo uso.** Alguien llega buscando un
constructor de cuadros, lo encuentra, le escribe, y no tiene ninguna razón para
volver hasta dentro de dos años.

Eso no es un fallo del producto: es la naturaleza del job. El error sería
intentar que ese usuario vuelva cada semana. **El trabajo no es forzar
frecuencia, es asegurar el retorno cuando toque, y construir hábito solo donde
la frecuencia existe de forma natural.**

Hoy no hacemos ni una cosa ni la otra.

---

## 2. Qué tiene hoy un usuario no creador

Auditoría del código, no impresiones. Esto es literalmente todo lo que un
usuario con rol `user` puede hacer y tener:

| Superficie | Estado | Detalle |
|---|---|---|
| **Favoritos** | 🟡 Existe, limitado | `users/{uid}.favorites`, un array de **ids de creadores**. Requiere cuenta |
| **Favoritos de eventos** | 🔴 **No existe** | La página de favoritos solo cruza contra creadores. Un evento no se puede guardar |
| **RSVP a eventos** | 🟡 Existe, sin salida | Se guarda en `rsvps`, se ve el contador y tu estado *dentro de ese evento* |
| **Ver mis RSVP** | 🔴 **No existe** | **No hay ninguna pantalla donde un usuario vea a qué ha dicho que va** |
| **Recordatorios** | 🔴 No existe | Ni email, ni push, ni calendario |
| **Alertas o avisos** | 🔴 No existe | Ninguna forma de que Decycles contacte con un usuario |
| **Listas o colecciones** | 🔴 No existe | Los favoritos son una lista única sin nombre ni orden |
| **Historial** | 🔴 No existe | Lo que viste ayer se pierde |
| **Uso sin cuenta** | 🔴 No existe | Guardar cualquier cosa exige registrarse antes |

### Dos hallazgos que hay que arreglar antes que nada

**① El RSVP es un agujero negro.** Un usuario dice "voy" a una rodada y el
producto lo registra… y no se lo enseña nunca más. No hay pantalla, no hay
recordatorio, no hay nada. La única acción de compromiso real que existe en todo
el producto **no tiene retorno**. Los RSVP solo se muestran al organizador
(`EventAttendees`) y en el panel de admin.

**② El menú enseña herramientas de creador a todo el mundo.** El desplegable de
perfil ofrece "View Profile" → `/profile/edit` y "Events" → `/my-events` a
**cualquier usuario autenticado, sin comprobar el rol**. Y `/my-events` no es
"mis eventos" en el sentido que un usuario espera: es el **editor de eventos del
creador**, que carga `creators/{uid}`. Un ciclista que le da a "Events" esperando
ver sus rodadas se encuentra un panel de gestión vacío que no entiende.

> ⚠️ **Corrección a documentos anteriores.** [`05`](./05-arquitectura-y-datos.md)
> y [`12`](./12-estado-actual.md) describían `/my-events` como "eventos a los que
> se ha confirmado asistencia". Es incorrecto: es el editor de eventos del
> creador. Corregido en ambos.

**Conclusión:** Decycles no tiene hoy **ninguna superficie propia para el usuario
no creador** más allá de una lista de favoritos incompleta. No es que la
recurrencia esté mal resuelta: es que no está intentada.

---

## 3. La frecuencia natural de cada perfil

El error más común en retención es aplicar la misma estrategia a todo el mundo.
Cada perfil tiene un ritmo distinto, y la estrategia correcta es distinta.

### D1 · El Buscador de Oficio
**Frecuencia natural: muy baja.** Una o dos veces al año como mucho. Un cuadro a
medida es una decisión de años.

**Estrategia correcta: no es recurrencia, es *recuerdo*.** El objetivo no es que
vuelva cada mes; es que **cuando llegue el momento, Decycles sea el sitio al que
va**. Eso se consigue con marca, con contenido que se guarda, y con un pequeño
depósito de valor personal (su lista) que le espera.

**Lo que sí puede subir su frecuencia:** convertir la fase de decisión (que dura
meses) en visitas repetidas. Alguien que está eligiendo constructor vuelve diez
veces si tiene dónde comparar y guardar candidatos.

### D2 · El Ciclista en Movimiento
**Frecuencia natural: por episodio.** Cero durante meses, intensa durante un
viaje.

**Estrategia correcta: estar presente en el momento del episodio.** Lo que
importa no es que abra la app en enero; es que en abril, aterrizando en Tokio con
la bici, se acuerde de Decycles. Eso se logra con **utilidad extrema en el
momento** (mapa, cerca de mí, abierto ahora) y con un disparador ligado al viaje,
no al calendario.

### D3 · El Que Busca Plan
**Frecuencia natural: alta.** Semanal o quincenal. Los planes tienen fecha, y las
fechas se repiten.

**Estrategia correcta: aquí sí se construye hábito.** Es el único perfil donde
tiene sentido hablar de recurrencia en el sentido clásico. Y es, con diferencia,
**donde hay que concentrar el esfuerzo**.

> **Decisión de foco.** Si hay que elegir uno, es **D3**. Es el único con
> frecuencia natural, el que activa los eventos (que es lo que hace volver a los
> demás), y el más barato de servir. D1 y D2 se atienden con calidad y memoria,
> no con notificaciones.

---

## 4. El marco: por qué vuelve alguien

Tres motores. Un producto que retiene tiene al menos dos.

### Motor 1 · Valor almacenado
*"Si no vuelvo, pierdo algo mío."*

Listas, historial, tu bici, tus planes. Cuanto más ha invertido el usuario, más
cuesta abandonarlo. **Es el motor más honesto**: no depende de interrumpir a
nadie, y crece solo con el uso.

Hoy Decycles tiene el mínimo posible: una lista de favoritos sin nombre.

### Motor 2 · Disparador externo
*"Algo me avisa en el momento correcto."*

Email, push, calendario. **Es el motor más eficaz y el más fácil de arruinar.**
Un aviso útil trae a alguien de vuelta; dos avisos irrelevantes le hacen darse de
baja para siempre.

Hoy Decycles no tiene **ninguna** forma de contactar con un usuario.

### Motor 3 · Ritmo del contenido
*"Sé que si vuelvo habrá algo nuevo."*

Eventos que se renuevan, fichas nuevas, contenido editorial. Requiere que el
usuario **crea** que hay novedad, y hoy nada se lo dice: la home se ve igual en
enero que en marzo aunque haya cambiado.

---

## 5. La escalera de compromiso

Los cuatro peldaños que sube un usuario. **Cada peldaño necesita su propia
palanca**, y hoy solo existe el salto brusco del primero al tercero.

```
  ANÓNIMO ──────► IDENTIFICADO ──────► CON DATOS ──────► CON HÁBITO
  Llega, mira,    Tiene cuenta.        Ha invertido:      Vuelve solo,
  se va.          Podemos hablarle.    listas, RSVP,      con o sin
                                       su bici.           aviso.

  Hoy: la mayoría │ Hoy: cuesta caro   │ Hoy: casi nada  │ Hoy: nadie
                  │ (cuenta obligatoria│ que invertir    │
                  │  antes de nada)    │                 │
```

**El error actual está en el primer salto.** Pedimos cuenta *antes* de haber dado
nada. La secuencia correcta es la contraria: dejar guardar sin cuenta, y pedir el
registro cuando el usuario ya tiene algo que perder.

---

## 6. Bucles diseñados, uno por perfil

### D3 · El bucle del plan *(el principal)*

```
  Busca plan para el finde  ──►  Encuentra rodada  ──►  Confirma (RSVP)
            ▲                                                  │
            │                                                  ▼
    Vuelve a buscar el                              Recibe recordatorio
    siguiente plan                                    48 h antes
            ▲                                                  │
            │                                                  ▼
     "Otras rodadas de este       ◄──────────────      Va, y le gusta
      colectivo" + fotos del día
```

**Lo que falta para cerrarlo:** ver mis RSVP · recordatorio · un aviso de "nuevo
plan cerca de ti" · fotos después del evento.
**Todo son piezas pequeñas.** El bucle no está roto: está sin conectar.

### D2 · El bucle del viaje

```
  Planifica un viaje  ──►  Guarda paradas en una lista de viaje
                                        │
                                        ▼
                          Llega y usa la lista sobre el mapa
                                        │
                                        ▼
             Vuelve a casa  ──►  La lista queda ahí, con lo que descubrió
                                        │
                                        ▼
                    Siguiente viaje: empieza por Decycles
```

**Lo que falta:** listas con nombre · "cerca de mí" · modo offline · un aviso
opcional al detectar un viaje ("vas a Milán, esto hay allí").

### D1 · El bucle de la decisión

```
  Empieza a considerar un cuadro  ──►  Guarda 5 candidatos
                                              │
                                              ▼
                          Vuelve durante semanas a comparar
                                              │
                                              ▼
                       Contacta con dos  ──►  Encarga a uno
                                              │
                                              ▼
                        Meses después: enseña el resultado
```

**Lo que falta:** comparador · notas privadas sobre cada candidato · y, al final,
la posibilidad de **registrar la bici terminada** — que es lo que convierte a
este usuario en alguien con datos dentro del producto para siempre.

---

## 7. Las palancas, ordenadas

Todo lo que se puede hacer, con esfuerzo estimado e impacto sobre la recurrencia
del usuario no creador.

### Nivel 0 · Arreglar lo que está roto

| # | Palanca | Por qué | Esfuerzo |
|---|---|---|---|
| 0.1 | **Pantalla "mis planes"** con los RSVP del usuario | La acción de compromiso más fuerte del producto hoy no tiene retorno | S |
| 0.2 | **Guardar eventos en favoritos** | Se puede guardar un taller pero no una rodada. No tiene sentido | S |
| 0.3 | **Ocultar herramientas de creador** a quien no lo es | Hoy el menú ofrece el editor de perfil y de eventos a todo el mundo | S |
| 0.4 | **Renombrar y separar** `/my-events` (creador) de "mis planes" (usuario) | Dos jobs distintos comparten nombre y ruta | S |

> **Estas cuatro son la base.** Sin ellas, cualquier inversión en recurrencia
> se cae por un agujero que ya existe.

### Nivel 1 · Valor almacenado

| # | Palanca | Por qué | Esfuerzo |
|---|---|---|---|
| 1.1 | **Guardar sin cuenta** (local, con opción de migrar al registrarse) | Elimina la fricción en el momento exacto de valor. Registro *después* de dar algo | M |
| 1.2 | **Listas con nombre** en vez de un favoritos único | "Mi viaje a Japón" es un plan; "favoritos" es un cajón | M |
| 1.3 | **Notas privadas** sobre un creador guardado | Convierte la lista en una herramienta de decisión (D1) | S |
| 1.4 | **Historial de vistos** | "Lo que miraste la semana pasada". Recupera contexto al volver | S |
| 1.5 | **Listas públicas y compartibles** | Valor almacenado + distribución + SEO, todo a la vez | M |
| 1.6 | **Diario de la bici** | El mayor depósito de valor posible. Ver [`13`](./13-espacio-de-oportunidad.md) | L |

### Nivel 2 · Disparadores

| # | Palanca | Por qué | Esfuerzo |
|---|---|---|---|
| 2.1 | **Recordatorio de evento** (48 h antes) | Convierte un RSVP en asistencia real. El aviso más justificado que existe | M |
| 2.2 | **Añadir a mi calendario** (`.ics`) | Delega el recordatorio al calendario del usuario. Barato y sin permisos | S |
| 2.3 | **Alerta por ciudad y categoría** | "Nuevas rodadas de gravel en Barcelona". Opt-in explícito | M |
| 2.4 | **Resumen quincenal** de lo nuevo en tus intereses | Ritmo previsible, contenido relevante | M |
| 2.5 | **Suscripción al calendario** (iCal por ciudad) | Los eventos aparecen en su calendario sin que volvamos a molestar | M |
| 2.6 | **Push por PWA** | Solo para lo que el usuario ha pedido explícitamente | M |
| 2.7 | **Aviso de novedad en lo guardado** | "El taller que guardaste ha publicado un evento" | M |

### Nivel 3 · Ritmo y descubrimiento

| # | Palanca | Por qué | Esfuerzo |
|---|---|---|---|
| 3.1 | **"Nuevo desde tu última visita"** | Hace visible que hay novedad. Sin esto la home parece estática | S |
| 3.2 | **Home consciente de la ciudad** | Lo cercano primero, lo global después | M |
| 3.3 | **Esta semana cerca de ti** | Un bloque con fecha es una razón con caducidad | M |
| 3.4 | **Descubrimiento serendípico** | Un modo "enséñame algo bueno" para volver sin buscar nada | S |
| 3.5 | **Contenido editorial con cadencia** | Le da al usuario un motivo de visita que no depende de que necesite algo | L |

---

## 8. El alta, rediseñada para la recurrencia

Hoy el registro pide nombre, apellidos, email y contraseña. **No pide nada que
permita volver a contactar con sentido.**

Dos preguntas más, opcionales y en un segundo paso, cambian todo:

1. **¿Dónde ruedas normalmente?** → ciudad o zona.
2. **¿Qué te interesa?** → dos o tres categorías.

Con esas dos respuestas se puede enviar el primer aviso relevante. Sin ellas, no
se puede enviar ninguno.

**Reglas del alta:**
- Se pide **después** de que el usuario haya guardado algo, no antes.
- Las dos preguntas son **saltables**, y se pueden contestar más tarde desde su
  perfil.
- El registro con Google ya existe: es el camino corto y debe ser el destacado.
- Nada de "completa tu perfil al 100%": no somos una red social.

---

## 9. Reglas de los avisos

Cualquier canal de contacto es un préstamo de atención. Estas reglas lo protegen.

1. **Todo es opt-in explícito.** Nada de casillas premarcadas. Nunca.
2. **Cada aviso tiene un porqué visible.** "Te avisamos porque confirmaste
   asistencia a esta rodada."
3. **Techo duro:** máximo un correo a la semana por usuario, sumando todos los
   tipos. Si dos coinciden, se agrupan.
4. **Los recordatorios de evento están fuera del techo** — son transaccionales y
   el usuario los ha pedido con su RSVP.
5. **Baja en un clic**, sin login, sin encuesta, sin "¿seguro?".
6. **Granularidad:** poder desactivar un tipo de aviso sin desactivarlos todos.
7. **Un aviso vacío no se envía.** Si esta semana no hay nada nuevo en tu ciudad,
   no mandamos un correo diciendo que no hay nada.
8. **Nada de reactivación agresiva.** Ni "te echamos de menos", ni "vuelve, mira
   lo que te pierdes".

**Prueba de fuego antes de enviar cualquier cosa:** ¿un mecánico que trabaja diez
horas al día se alegraría de recibir esto? Si la respuesta no es un sí claro, no
se manda.

---

## 10. Cómo se mide

### Definición de usuario activo

Un usuario no creador está **activo** si en los últimos 90 días ha hecho al menos
una de estas: abrir una ficha, guardar algo, confirmar un evento, buscar, o
abrir un aviso.

⚠️ 90 días, no 30. Con esta frecuencia natural, medir en 30 días daría un número
deprimente y engañoso.

### Métrica principal de este documento

> **Usuarios que vuelven a los 90 días.**
> De los usuarios nuevos de un mes, qué porcentaje realiza alguna acción en los
> 90 días siguientes.

Hoy no se mide. **No se conoce el número.** Es la primera cosa que hay que
instrumentar.

### Métricas de apoyo

| Métrica | Qué dice | Objetivo inicial |
|---|---|---|
| Retorno a 90 días (por cohorte de alta) | Si el producto retiene | > 25% |
| % de usuarios con ≥1 elemento guardado | Valor almacenado creado | > 40% |
| % de usuarios con ≥1 RSVP | Compromiso real | > 15% |
| Asistencia sobre RSVP | Si los recordatorios funcionan | > 60% |
| Sesiones por usuario activo y mes | Intensidad | > 2 |
| Suscripción a avisos | Permiso de contacto conseguido | > 30% |
| **Bajas de avisos** | ⚠️ Contra-métrica: si sube, estamos molestando | < 2% mensual |
| Días hasta la segunda visita | Velocidad de formación de hábito | — |

### Huecos de instrumentación

Ninguna de estas se puede calcular hoy. Falta: fecha de alta y de última
actividad en el documento de usuario, cohortes en GA4, y eventos de guardado y
de aviso. Es trabajo de esfuerzo pequeño y desbloquea todo lo demás.

---

## 11. Qué no vamos a hacer

| Idea | Por qué no |
|---|---|
| **Feed social** con publicaciones y likes | Nos convierte en otra red social. Rompe la anti-visión ([`01`](./01-vision-y-estrategia.md) §3) |
| **Rachas y puntos** por entrar cada día | Frecuencia artificial sobre un job que no la tiene. Abarata la marca |
| **Notificaciones de "te echamos de menos"** | Interrumpir sin tener nada que decir es el principio del fin |
| **Muro de registro** para ver contenido | Rompe P3 y mata el SEO |
| **Rankings públicos de usuarios** | Competición donde debería haber comunidad |
| **Email de terceros** o venta de la lista | Innegociable |
| **Recordatorios sin haberlos pedido** | Un RSVP autoriza el recordatorio de *ese* evento, nada más |
| **Contenido infinito** para aumentar el tiempo en pantalla | No vendemos atención. Nuestro éxito es que el usuario **se vaya** a ver a un creador |

---

## 12. Plan por fases

### Fase 1 · Cerrar el agujero *(semanas, esfuerzo S)*
Nivel 0 completo: mis planes, guardar eventos, ocultar herramientas de creador,
separar rutas. Más los eventos de analítica y las fechas de actividad en el
documento de usuario.

**Cómo sabemos que funcionó:** existe por primera vez una medición de retorno a
90 días.

### Fase 2 · Dar algo que perder *(1–2 meses)*
Guardar sin cuenta · listas con nombre · "nuevo desde tu última visita" ·
las dos preguntas del alta.

**Objetivo:** > 40% de usuarios con al menos un elemento guardado.

### Fase 3 · Ganarse el derecho a avisar *(2–3 meses)*
Recordatorios de evento · exportar a calendario · alertas por ciudad y categoría,
con todas las reglas de §9.

**Objetivo:** > 30% suscritos, bajas por debajo del 2%, asistencia sobre RSVP
por encima del 60%.

### Fase 4 · Construir hábito donde existe *(3–6 meses)*
Todo alrededor de D3: esta semana cerca de ti, home consciente de la ciudad,
fotos después del evento, series de eventos, listas públicas.

**Objetivo:** retorno a 90 días por encima del 25%, con D3 claramente por encima
de la media.

### Fase 5 · Valor almacenado profundo *(6+ meses)*
El diario de la bici. Es el único que convierte a un usuario de paso en alguien
con datos propios dentro del producto.

---

## 13. La idea en una frase

> No hay que hacer que la gente vuelva más. Hay que **darles algo que sea suyo**
> y **avisarles solo cuando de verdad importa**. Con esta comunidad, lo primero
> se agradece y lo segundo se perdona; al revés, no.

---

Documentos relacionados: [`02 Usuarios`](./02-usuarios-y-jobs.md) ·
[`06 Métricas`](./06-metricas.md) · [`08 Roadmap`](./08-roadmap.md) ·
[`13 Espacio de oportunidad`](./13-espacio-de-oportunidad.md)
