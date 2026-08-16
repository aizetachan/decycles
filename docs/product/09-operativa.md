# 09 · Operativa: curación, moderación y crecimiento

Última revisión: 2026-08-16 · Estado: Vivo

> La curación es el producto (principio P1). Este documento la convierte de
> *criterio del fundador* en **proceso ejecutable por otra persona**. Mientras
> eso no exista, el crecimiento tiene un techo: la agenda de una sola persona.

---

## 1. Criterios de admisión

### Qué entra

Una ficha entra en Decycles si cumple **todo** esto:

1. **Es independiente.** Persona, taller o colectivo pequeño. No una cadena, no
   una filial de un grupo grande, no un dropshipper.
2. **Hace o mueve cultura ciclista de verdad.** Construye, repara, pinta,
   organiza, documenta o convoca. Revender catálogo ajeno no basta.
3. **Es identificable.** Tiene nombre, cara o marca reconocible y una forma de
   contacto que funciona.
4. **Tiene prueba de trabajo.** Web, Instagram activo, fotos reales de lo que
   hace. No renders, no fotos de stock, no catálogo de proveedor.
5. **Está viva.** Señales de actividad en los últimos 12 meses.

### Qué no entra

- Cadenas, grandes superficies, marcas corporativas.
- Revendedores puros sin aportación propia.
- Fichas sin fotos propias o con imágenes claramente de terceros.
- Negocios sin relación con el ciclismo que quieren posicionarse aquí.
- Perfiles duplicados de un mismo creador.
- Cualquiera que use la ficha como escaparate de otra cosa.

### La zona gris

Casos que requieren juicio, con la orientación por defecto:

| Caso | Por defecto |
|---|---|
| Tienda multimarca con taller propio bueno | ✅ **Sí**, si el taller es el protagonista de la ficha |
| Marca pequeña que fabrica fuera pero diseña dentro | ✅ Sí, si el diseño y el criterio son suyos |
| Cafetería con bicis | ⚠️ Solo si es un hub real de comunidad |
| Entrenador o coach | ❌ No — es servicio a la persona, no cultura material |
| Fabricante mediano (>50 empleados) | ❌ No — se ha salido de "independiente" |
| Tienda online sin ubicación física | ✅ Sí, si el producto es propio y hay oficio detrás |

**Cuando dudes:** pregúntate si un ciclista con criterio se alegraría de
descubrirlo. Si la respuesta no es un sí claro, es un no.

---

## 2. Flujo de revisión

### Cómo funciona hoy

El creador se registra, rellena su ficha en `/profile/edit` y **decide él mismo**
cuándo publicarla (`isPublished`). El admin puede editar cualquier ficha y
bloquear usuarios desde `/admin/users`.

⚠️ **Problema:** no hay revisión previa. Cualquiera que se registre puede
publicar una ficha visible. Lo que hoy sostiene la calidad es que hay poca
gente. Es el cuello de botella que aparecerá justo cuando el producto empiece a
funcionar.

### Cómo debería funcionar

```
  Registro → Ficha en BORRADOR → El creador solicita publicación
                                            │
                                            ▼
                                   COLA DE REVISIÓN (admin)
                                            │
                    ┌───────────────────────┼──────────────────────┐
                    ▼                       ▼                      ▼
                APROBADA              CAMBIOS PEDIDOS           RECHAZADA
                (pública)          (motivo + qué falta)      (motivo + apelable)
                    │
                    ▼
            Revisión de actividad cada 12 meses
```

**Estados propuestos** para el documento de creador — decisión de modelo de
datos, requiere ADR:

`draft` · `pending_review` · `published` · `changes_requested` · `rejected` ·
`archived`

**Compromiso de tiempo de respuesta:** 72 h laborables. Si no se puede cumplir,
no se promete.

---

## 3. Verificación

Distinta de la admisión. Admisión = "cumple el mínimo". Verificación = "hemos
comprobado que es quien dice ser y que hace lo que dice".

**Cómo se verifica:**
1. La identidad coincide entre ficha, web y redes.
2. Existe evidencia pública de trabajo real (portfolio, prensa, terceros).
3. Ubicación comprobable si tiene local.
4. El contacto responde.

**Qué da:** un badge visible en la ficha y en los resultados.

**Regla crítica:** la verificación **no se compra**. Si "verificado" acaba
significando "paga", se rompe el principio P8 y el badge deja de valer.
Decisión registrada en [`07`](./07-monetizacion.md) §7-2.

---

## 4. Salud del directorio

Un directorio muere de fichas zombis, no de falta de fichas.

| Señal | Umbral | Acción |
|---|---|---|
| Sin editar en 6 meses | — | Email: "¿sigue todo igual?" |
| Sin editar en 12 meses | — | Aviso de despublicación en 30 días |
| Sin editar en 13 meses | — | Pasa a `archived` (no se borra nunca) |
| Web caída | 2 comprobaciones | Aviso al creador, ocultar el enlace |
| Instagram inactivo > 12 meses | — | Señal de riesgo, no acción automática |
| Eventos siempre en el pasado | — | Recordatorio de publicar el siguiente |

**Nada se borra.** Archivar conserva el trabajo del creador y permite recuperarlo
con un clic. Borrar el trabajo de alguien por inactividad rompe P2.

**Métrica que gobierna esto:** % de fichas activas > 70%
([`06`](./06-metricas.md)). Es la contra-métrica de la North Star.

---

## 5. Moderación

### Qué se modera
Contenido subido por creadores (textos, imágenes, eventos) y comportamiento de
usuarios.

### Motivos de intervención
- Imágenes de terceros sin derechos.
- Contenido ofensivo, discriminatorio o violento.
- Suplantación de identidad.
- Spam o enlaces engañosos.
- Eventos falsos o peligrosos.

### Herramientas actuales
- `users/{uid}.blocked` → `BlockedScreen` bloquea toda la aplicación al
  instante (la suscripción en `AuthContext` lo aplica en vivo). El usuario solo
  puede cerrar sesión.
- Edición y borrado de cualquier ficha desde `/admin/creators`.
- Borrado completo de cuenta (`adminDeleteUser`) con limpieza en cascada de
  Storage.

### Lo que falta
- **Denunciar** una ficha o un evento desde la interfaz pública.
- **Registro de acciones de moderación**: quién hizo qué y por qué. Hoy no queda
  rastro. Es un problema legal además de operativo.
- **Escala de sanciones**: aviso → despublicación → bloqueo. Hoy solo existe el
  extremo.
- **Vía de apelación** documentada.

### Principio de moderación
> Se avisa antes de actuar, se explica siempre el motivo, y siempre hay forma de
> apelar. Salvo en casos de daño evidente (suplantación, contenido ilegal),
> donde se actúa primero y se explica después.

---

## 6. Captación de oferta

### Estrategia: ciudades ancla

No se crece por goteo global. Se elige una ciudad, se llega a masa crítica
(≈15–20 fichas activas y ≥2 eventos al mes), y esa densidad se vuelve
autosostenida: los creadores locales se ven entre ellos.

**Cómo elegir una ciudad ancla:**
1. Escena independiente ya existente (constructores, colectivos con historia).
2. Alguien de dentro dispuesto a hacer de nodo local.
3. Tráfico ya existente en GA4 hacia esa zona.
4. Idioma cubierto por EN o ES, al principio.

### Canales de captación, por rendimiento esperado

| Canal | Coste | Rendimiento | Nota |
|---|---|---|---|
| **Contacto directo 1-a-1** | Alto | 🔴 Alto | El único que funciona al principio. No escala, y no pasa nada |
| **Referidos entre creadores** | Bajo | 🔴 Alto | Un constructor le dice a otro. Hay que pedirlo explícitamente |
| **Presencia en eventos** | Medio | 🟠 Medio | Swap meets, ferias de frame building, rodadas grandes |
| **Colectivos como puerta** | Bajo | 🟠 Medio | Un colectivo trae a sus talleres y sus creativos |
| **Revistas y fotógrafos** | Bajo | 🟠 Medio | Perfil O3: aportan marca y traen a quienes retratan |
| **SEO inverso** | Bajo | 🟡 Bajo | Quien busca "cómo aparecer en directorios de ciclismo" |
| **Publicidad de pago** | Alto | 🟡 Bajo | No merece la pena a esta escala |

### El guion de captación (una frase)

> "Estamos haciendo un mapa mundial de la gente que construye cultura ciclista
> de verdad. Tú estás dentro. Tardas 10 minutos en montar tu ficha, es gratis, y
> te vamos a decir cuánta gente llega a ti desde ahí."

Corto, concreto, con la promesa de valor (la última frase) que **hay que poder
cumplir** — de ahí que el panel de estadísticas sea la prioridad de H1.

---

## 7. Soporte

**Canales:** el `ContactModal` de la web. No hay email de soporte dedicado ni
sistema de tickets.

**Compromiso propuesto:** respuesta en 48 h laborables. Si no se puede cumplir,
no se anuncia.

**Consultas frecuentes previsibles** — candidatas a una FAQ que hoy no existe:
- No puedo publicar mi ficha / no sé por qué está en borrador.
- Mi ubicación en el mapa está mal (geocodificación).
- Cómo cambio el email de mi cuenta.
- Cómo borro mi cuenta y mis datos (**obligatorio por RGPD**).
- Por qué no aparezco en la búsqueda.

---

## 8. Legal y cumplimiento

Estado actual y huecos. ⚠️ **No es asesoramiento legal**: es una lista de lo que
hay que revisar con quien corresponda.

| Área | Estado | Pendiente |
|---|---|---|
| Cookies | 🟢 Banner GDPR implementado | Revisar que el consentimiento bloquee GA4 antes de aceptar |
| Política de privacidad | 🔴 No localizada en el repo | Redactar y publicar |
| Términos de servicio | 🔴 No localizados | Redactar: derechos sobre el contenido subido, normas de uso |
| Derecho de supresión | 🟠 Existe `adminDeleteUser` con cascada | Falta que el usuario lo pida **por sí mismo** |
| Exportación de datos | 🔴 No existe | Derecho de portabilidad |
| Datos personales expuestos | 🔴 `users` es de lectura pública ([`05`](./05-arquitectura-y-datos.md) §4-A) | **Prioridad 1 del roadmap** |
| Derechos de imagen | 🟠 Sin política | Los creadores suben fotos: hace falta declaración de titularidad al subir |
| Menores | 🔴 Sin verificación de edad | Revisar si aplica |

---

## 9. Rituales

| Cadencia | Qué | Duración |
|---|---|---|
| Diario | Cola de revisión y denuncias | 15 min |
| Semanal | North Star + `search_no_results` + altas | 15 min |
| Quincenal | Contacto directo a 5 creadores objetivo | 1 h |
| Mensual | Revisión de métricas + salud del directorio + una entrevista a creador | 2 h |
| Trimestral | Estrategia, roadmap del siguiente horizonte, revisión de precios | Media jornada |

---

Documentos relacionados: [`02 Usuarios`](./02-usuarios-y-jobs.md) ·
[`06 Métricas`](./06-metricas.md) · [`08 Roadmap`](./08-roadmap.md)
