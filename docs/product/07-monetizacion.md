# 07 · Monetización

Última revisión: 2026-08-16 · Estado: Borrador estratégico
(los precios son **hipótesis**, no compromisos)

---

## 1. La regla que ordena todo

> **No se cobra por acceso. Se cobra por amplificación y por herramientas.**

El descubrimiento gratuito nunca se degrada (principio P3). Podemos vender
visibilidad *añadida*, herramientas que ahorran trabajo y acceso a datos. No
podemos vender la posición en los resultados ni esconder el contacto tras un
muro. El día que lo hagamos, Decycles deja de ser un mapa con criterio.

**Y la precondición:** no se pide dinero a un creador antes de poder enseñarle,
con datos, qué le ha dado Decycles. Es la razón por la que la monetización es
Nivel 4 en el marco de priorización y H2 en el roadmap.

---

## 2. Estado actual

Ingresos: **cero**. Existe un `SupportModal` con un enlace a
`https://buymeacoffee.com` — genérico, sin cuenta configurada. No hay
integración de pagos, ni entidad de facturación conectada, ni modelo de
suscripción.

**Lectura:** el producto está en fase de construir valor, que es donde debe
estar. Pero el enlace de donación tal cual está no recauda nada y ocupa un sitio
en el menú. Es una decisión pendiente: configurarlo bien o quitarlo.

---

## 3. La escalera de monetización

Cinco peldaños, en orden. **No se sube al siguiente sin haber consolidado el
anterior.**

### Peldaño 1 · Apoyo voluntario · *ahora*
Donaciones de la comunidad. Buy Me a Coffee / Ko-fi bien configurado, con una
página que explique a dónde va el dinero (servidores, curación).

- **Potencial:** bajo (decenas a cientos de € al mes).
- **Por qué hacerlo igualmente:** cuesta una tarde, valida si hay afecto por el
  proyecto, y ese afecto es la señal previa a cualquier disposición a pagar.
- **Condición para pasar al siguiente:** tener el panel de estadísticas del
  creador funcionando.

---

### Peldaño 2 · Suscripción del creador · *H2, el motor principal*

Lo que se vende: **herramientas y prueba de valor**, no posición.

| | **FREE** | **PRO** — *hipótesis: 8–15 €/mes o 80–150 €/año* |
|---|---|---|
| Ficha en el directorio | ✅ completa | ✅ completa |
| Pin en el mapa | ✅ | ✅ |
| Aparecer en búsqueda y filtros | ✅ **sin degradar** | ✅ igual |
| Galería | hasta ~8 imágenes | ilimitada |
| Eventos | ✅ | ✅ + recurrentes + duplicar |
| **Estadísticas** | básicas (visitas del mes) | **completas**: origen del tráfico, clics salientes, términos de búsqueda que te encuentran, comparativa con tu categoría |
| Badge de verificado | — | ✅ |
| Enlaces salientes | limitados | todos + UTM propios |
| Página personalizada | — | slug propio, cabecera, orden de galería |
| Prioridad de soporte y revisión | — | ✅ |
| Exportar contactos / leads | — | ✅ |

**Por qué funciona:** todo lo de la columna PRO es *añadido*. Nada de la columna
FREE empeora. El creador paga por saber qué está pasando y por ahorrar trabajo,
no por que le dejen existir.

**Realismo:** el artesano independiente tiene poco presupuesto. El precio tiene
que estar por debajo del umbral de decisión (lo que cuesta una comida), y el
anual con descuento es donde estará el volumen. Con 300 creadores PRO a 10 €/mes
son 36.000 €/año: no es un unicornio, pero sostiene el proyecto y la curación.

**Precondiciones para lanzarlo:**
1. Panel de estadísticas del creador funcionando y creíble.
2. ≥ 20 creadores diciendo espontáneamente que Decycles les ha traído gente.
3. Pasarela de pago integrada (recomendación: **Stripe**, por facturación
   internacional, impuestos y portal de cliente).
4. Política de baja de un clic.

---

### Peldaño 3 · Promoción de eventos · *H2–H3*

- **Evento destacado**: posición destacada en el calendario y en el mapa durante
  X días, claramente **etiquetado como promocionado**. Hipótesis: 15–40 € por
  evento.
- **Boletín de ciudad**: una pieza patrocinada por envío. Requiere tener email.

**Regla innegociable:** todo contenido pagado se etiqueta. Un destacado sin
etiquetar es publicidad encubierta y rompe P3.

---

### Peldaño 4 · Marcas e industria · *H3*

Marcas de nicho (tubos, componentes, pintura, herramienta) que quieren llegar
exactamente a este público.

- Patrocinio de categoría o de sección editorial.
- Contenido patrocinado, siempre etiquetado, siempre editorialmente propio.
- Directorio de proveedores para constructores (B2B).

**Ticket alto, pocos clientes, riesgo de marca alto.** Solo con tráfico
demostrable y una política editorial escrita antes de la primera venta.

---

### Peldaño 5 · Datos e infraestructura · *H3+*

Cuando Decycles sea el índice canónico de la escena:

- **API / embeds**: que otras webs muestren "eventos de esta semana en tu ciudad"
  con datos nuestros. Gratis con atribución, de pago sin ella o con volumen.
- **Informes de industria**: densidad de escena por país, tendencias de
  materiales y disciplinas. Datos agregados, nunca personales.

**Condición absoluta:** solo datos agregados. Nunca vender datos de creadores ni
de usuarios. Eso rompería P2 y sería el final de la confianza.

---

## 4. Lo que no vamos a hacer

| Idea | Por qué no |
|---|---|
| Cobrar por aparecer en el directorio | Rompe P3, mata el SEO y vacía el mapa |
| Ordenar la búsqueda por quién paga | Convierte el criterio en subasta |
| Esconder el contacto tras registro | Fricción en el momento exacto de valor |
| Anuncios display de terceros | Destruye la marca visual y la confianza |
| Comisión sobre el trabajo del creador | Requiere intermediar la transacción; ni podemos ni queremos |
| Vender datos de usuarios | Innegociable |
| Freemium con límite de fichas visibles | Rompe el producto para todos |

---

## 5. Economía unitaria (marco, con números por rellenar)

**Costes actuales** (⚠️ *pendiente de medir — trabajo de H1*):
- Firebase: Firestore (lecturas, dominadas por la suscripción a la colección
  completa), Storage (imágenes), Hosting (ancho de banda), Functions.
- Dominio y herramientas.
- **Curación humana** — hoy invisible porque es tiempo del fundador, pero es el
  coste variable real y el que limita el crecimiento.

**Las tres cifras que hay que conocer antes de fijar cualquier precio:**
1. **Coste de infra por 1.000 visitantes.** Determina si el modelo aguanta
   escala.
2. **Coste de curación por ficha nueva.** Determina cuántas fichas se pueden
   aceptar al mes.
3. **Conexiones generadas por creador y mes.** Determina el valor entregado, que
   es el techo del precio.

**Regla de precio:** el precio de PRO debe ser una fracción pequeña del valor de
**un solo** encargo conseguido a través de Decycles. Para un constructor de
cuadros, un encargo son miles de euros. Ahí hay margen de sobra — pero solo si
el creador *ve* la conexión.

---

## 6. Secuencia recomendada

```
H1  Construir la prueba de valor
    · Panel de estadísticas del creador
    · Instrumentar bien los clics salientes
    · Configurar o retirar el enlace de donación
    · Medir el coste real de infraestructura

H2  Validar la disposición a pagar
    · 20 entrevistas con creadores activos
    · Landing de PRO con lista de espera (mide intención, no opinión)
    · Stripe + facturación
    · Lanzar PRO a un grupo pequeño con precio de fundador
    · Primeros eventos destacados

H3  Escalar y diversificar
    · PRO abierto a todos
    · Patrocinios de marca con política editorial escrita
    · API / embeds
```

---

## 7. Decisiones abiertas

1. **¿Precio único global o por poder adquisitivo?** Un constructor en Portugal
   y otro en Suiza no tienen la misma capacidad. Precio por región es más justo
   y más complejo.
2. **¿Verificado va con PRO o es independiente?** Si va con PRO, "verificado"
   pasa a significar "paga", lo que rompe P8. **Recomendación: independiente** —
   la verificación se gana, el PRO se compra.
3. **¿Anual con descuento agresivo?** Mejora la caja y reduce el abandono, pero
   compromete un año de servicio antes de saber si el producto retiene.
4. **¿Entidad legal y país de facturación?** Precondición operativa de Stripe.
5. **¿Qué pasa con las fichas PRO si el creador deja de pagar?** Recomendación:
   la ficha se queda, se pierden las funciones PRO. Nunca se borra el trabajo de
   nadie por impago.

---

Documentos relacionados: [`01 Visión`](./01-vision-y-estrategia.md) ·
[`03 Principios`](./03-principios-de-producto.md) ·
[`06 Métricas`](./06-metricas.md) · [`08 Roadmap`](./08-roadmap.md)
