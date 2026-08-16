# 10 · Plantillas de trabajo

Última revisión: 2026-08-16 · Estado: Vivo

> Las plantillas no son burocracia: son la forma de que una idea no se convierta
> en código antes de estar pensada. Si una plantilla no cabe en una página, la
> idea todavía no está clara.

---

## A · PRD (Product Requirements Document)

```markdown
# PRD · [Nombre de la feature]

Autor: · Fecha: · Estado: Borrador | En revisión | Aprobado | Enviado

## 1. El problema
Qué le pasa a quién, hoy, sin esto. Una frase.

## 2. Evidencia
Qué me hace pensar que es real: dato de GA4, métrica del panel, cita de un
creador. Si solo hay intuición, dilo — pero dilo.

## 3. Job-to-be-done
> Cuando [situación], quiero [motivación], para [resultado esperado].
Perfil afectado (ver `02-usuarios-y-jobs.md`):

## 4. Hipótesis
Si construimos [X], entonces [métrica] mejorará en [cantidad], porque [razón].

## 5. Alcance
**Dentro:**
- 

**Fuera (explícito):**
- 

## 6. Flujo
Paso a paso desde el punto de entrada hasta el resultado.
Estados a cubrir: vacío · cargando · error · sin permiso · éxito.

## 7. Criterios de aceptación
- [ ] Dado [contexto], cuando [acción], entonces [resultado observable]
- [ ] …

## 8. Métricas
- Principal: 
- Contra-métrica (qué no debe empeorar): 
- Eventos nuevos a instrumentar: 

## 9. Impacto técnico
Modelo de datos · Reglas de seguridad · Rendimiento y coste · ¿Necesita ADR?

## 10. Riesgos
| Riesgo | Probabilidad | Impacto | Mitigación |

## 11. Alternativas descartadas
Qué más se consideró y por qué no.

## 12. La versión mínima
¿Cuál es la cosa más pequeña que enseña lo mismo? ¿Por qué no hacemos solo eso?
```

---

## B · Brief de diseño

```markdown
# Diseño · [Pantalla o flujo]

## Trabajo de esta pantalla
Una frase. Si hay dos, son dos pantallas (principio P5).

## Usuario y momento
Quién llega aquí, desde dónde, con qué en la cabeza.

## Jerarquía
1. Lo primero que tiene que ver:
2. Lo segundo:
3. La acción principal:
4. Acciones secundarias:

## Contenido
| Elemento | EN | ES |
|---|---|---|

## Estados
- Vacío (y qué acción ofrece):
- Cargando:
- Error (qué pasó + qué puede hacer):
- Sin permiso:
- Éxito:

## Sistema de diseño
Componentes reutilizados:
Componentes nuevos (y por qué hacen falta):
Tokens usados:

## Responsive
- 360px:
- 768px:
- 1440px:

## Accesibilidad
Contraste · Orden de foco · Etiquetas · Objetivos táctiles ≥44px

## Checklist
- [ ] Modo claro y oscuro
- [ ] EN y ES
- [ ] Cinco estados
- [ ] Tres anchos
- [ ] Sin colores fuera de los tokens
- [ ] Patrón nuevo añadido a `04-design-system.md`
```

---

## C · Experimento

```markdown
# Experimento · [Nombre]

## Hipótesis
Creemos que [cambio] hará que [métrica] pase de [A] a [B],
porque [razón basada en evidencia].

## Cómo lo medimos
- Métrica principal:
- Contra-métrica:
- Segmentos a mirar por separado:
- Duración mínima:
- Volumen mínimo para concluir algo:

## Qué haremos con el resultado
- Si funciona →
- Si no funciona →
- Si no es concluyente →

## Resultado (rellenar al terminar)
Fecha · Datos · Conclusión · Decisión tomada
```

**Nota honesta sobre A/B testing:** con el volumen actual de Decycles, casi
ningún test alcanzará significación estadística. Es mejor usar cambios
secuenciales medidos con antes/después y aceptar la incertidumbre que fingir
rigor con muestras de 200 personas.

---

## D · ADR (Architecture Decision Record)

```markdown
# ADR-XXX · [Título de la decisión]

Fecha: · Estado: Propuesta | Aceptada | Rechazada | Sustituida por ADR-YYY
Decide: 

## Contexto
Qué situación obliga a decidir. Datos y restricciones reales.

## Decisión
Lo que hacemos. En presente, afirmativo, sin condicionales.

## Alternativas consideradas
| Opción | A favor | En contra | Por qué no |

## Consecuencias
**Positivas:**
**Negativas (asumidas conscientemente):**
**Qué tendremos que revisar más adelante:**

## Migración
Si toca datos: script, orden de ejecución, idempotencia, plan de rollback.
```

Registro completo en [`11-decisiones.md`](./11-decisiones.md).

---

## E · Entrevista a creador

**Objetivo:** entender su realidad, no venderle nada. 20–30 minutos.

```markdown
# Entrevista · [Nombre] · [Fecha]

Perfil (ver `02-usuarios-y-jobs.md`): O1 / O2 / O3
Ciudad · Antigüedad en Decycles · Estado de la ficha

## Contexto (5 min)
1. Cuéntame qué haces y desde cuándo.
2. ¿Cómo te llega el trabajo hoy? Ordénalo de más a menos.
3. ¿Cuánto tiempo dedicas a que te encuentren? ¿Qué te parece ese tiempo?

## El problema (10 min)
4. La última vez que un cliente nuevo te encontró, ¿cómo fue exactamente?
5. ¿Qué has probado que no funcionó?
6. Si pudieras eliminar una tarea de "hacerte visible", ¿cuál sería?

## Decycles (10 min)
7. ¿Cómo llegaste? ¿Qué esperabas?
8. Enséñame cómo montaste tu ficha. [OBSERVAR, no guiar]
9. ¿Has vuelto desde entonces? ¿Por qué sí o por qué no?
10. ¿Sabes si te ha llegado alguien desde Decycles?
11. Si Decycles desapareciera mañana, ¿qué perderías?

## Valor (5 min)
12. ¿Qué te haría volver cada mes?
13. ¿Qué tendría que darte para que valiera la pena pagar algo?
    [NO preguntar "¿pagarías?" — nadie contesta la verdad a eso]

## Reglas
- Preguntar por comportamiento pasado, no por intenciones futuras.
- Callarse. El silencio incómodo es donde aparece la información.
- No defender el producto cuando lo critiquen. Anotar y agradecer.
- Grabar (con permiso) y transcribir las citas literales.

## Conclusiones
Citas literales · Patrón observado · Qué cambia esto en el roadmap
```

---

## F · Post-mortem

```markdown
# Post-mortem · [Incidente]

Fecha · Duración · Impacto (usuarios y datos afectados)

## Cronología
| Hora | Qué pasó |

## Causa raíz
Los porqués hasta llegar al sistema, no a la persona.

## Qué funcionó en la detección y la respuesta

## Qué no funcionó

## Acciones
| Acción | Responsable | Fecha límite | Estado |

## Regla
Sin culpa. Un incidente es un fallo del sistema que lo permitió, no de quien
lo tocó. Si el post-mortem busca culpables, el siguiente no se escribe.
```

---

## G · Nota de lanzamiento

```markdown
# Lanzamiento · [Feature]

## Qué es (una frase para un creador, sin jerga)

## A quién afecta

## Qué cambia en su día a día

## Qué medimos y cuándo lo revisamos

## Comunicación
- [ ] Copy EN y ES
- [ ] Aviso in-app si cambia un flujo conocido
- [ ] Email / redes si merece la pena
- [ ] Documentación actualizada
- [ ] Plan de reversión si sale mal
```

---

## H · Definition of Done (recordatorio)

Copiada de [`00-CLAUDE-PRODUCT-LEAD.md`](./00-CLAUDE-PRODUCT-LEAD.md) §5 para
tenerla a mano al cerrar un PR:

- [ ] Criterios de aceptación cumplidos
- [ ] Cinco estados cubiertos
- [ ] 360 / 768 / 1440
- [ ] Modo claro y oscuro
- [ ] Copy EN y ES
- [ ] `npm run lint` limpio
- [ ] Analítica instrumentada
- [ ] Reglas de seguridad revisadas
- [ ] Peso e imágenes evaluados
- [ ] Documentación actualizada
- [ ] ADR si la decisión es estructural

---

Documentos relacionados: [`00 Rol`](./00-CLAUDE-PRODUCT-LEAD.md) ·
[`11 Decisiones`](./11-decisiones.md)
