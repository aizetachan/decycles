# DECYCLES · Sistema documental de producto

Este directorio es el **cerebro de producto de DECYCLES**. Contiene todo lo que
hace falta para dirigir, diseñar y escalar el producto sin depender de la
memoria de nadie (ni humana ni de un modelo).

Está escrito para dos lectores a la vez:

1. **Personas** — fundador, colaboradores, futuros contratados o freelancers.
2. **Claude** — configurado como *Product Designer Full-Stack con visión de CEO*
   dentro del proyecto Decycles.

---

## Cómo se usa

### Para configurar Claude

Copia el contenido de **[`00-CLAUDE-PRODUCT-LEAD.md`](./00-CLAUDE-PRODUCT-LEAD.md)**
en las *Project Instructions* del proyecto Decycles en Claude. Ese documento es
el **prompt base / constitución del rol**: define quién es, cómo decide, qué
puede hacer solo y qué tiene que consultar.

Los demás documentos son su **base de conocimiento**. Súbelos al proyecto (o
déjalos en el repo, que ya es visible desde Claude Code) para que pueda
consultarlos.

### Para trabajar tú

Cada documento responde a un tipo de pregunta. Si estás en duda sobre algo,
busca primero aquí antes de improvisar. Si la respuesta no está, **añádela**:
un documento que no se actualiza es peor que no tenerlo.

---

## Índice

| # | Documento | Responde a |
|---|---|---|
| 00 | [CLAUDE-PRODUCT-LEAD](./00-CLAUDE-PRODUCT-LEAD.md) | ¿Cómo trabaja Claude como product lead de Decycles? |
| 01 | [Visión y estrategia](./01-vision-y-estrategia.md) | ¿Qué somos, para quién, por qué ganamos? |
| 02 | [Usuarios y jobs-to-be-done](./02-usuarios-y-jobs.md) | ¿A quién servimos y qué contratan de nosotros? |
| 03 | [Principios de producto](./03-principios-de-producto.md) | ¿Cómo decidimos cuando hay conflicto? |
| 04 | [Design system](./04-design-system.md) | ¿Cómo se ve, suena y se comporta Decycles? |
| 05 | [Arquitectura y modelo de datos](./05-arquitectura-y-datos.md) | ¿Cómo está construido y dónde duele al escalar? |
| 06 | [Métricas y North Star](./06-metricas.md) | ¿Qué medimos y qué significa ir bien? |
| 07 | [Monetización](./07-monetizacion.md) | ¿Cómo se convierte en negocio? |
| 08 | [Roadmap](./08-roadmap.md) | ¿Qué hacemos ahora, después y nunca? |
| 09 | [Operativa: curación, moderación, growth](./09-operativa.md) | ¿Cómo se opera el día a día? |
| 10 | [Plantillas de trabajo](./10-plantillas.md) | ¿Con qué formato escribimos PRDs, specs, experimentos? |
| 11 | [Registro de decisiones (ADR)](./11-decisiones.md) | ¿Por qué el producto es como es? |
| 12 | [Estado actual y cómo retomar](./12-estado-actual.md) | ¿Qué me encuentro hoy y por dónde sigo? |
| 13 | [Espacio de oportunidad](./13-espacio-de-oportunidad.md) | ¿Qué más podría aportar valor, sin filtrar por dificultad? |
| 14 | [Recurrencia del usuario no creador](./14-recurrencia-usuarios.md) | ¿Por qué vuelve un ciclista, y cómo lo conseguimos? |

> **¿Vuelves al proyecto después de un tiempo fuera?** Empieza por el
> [12](./12-estado-actual.md). Es el documento de relevo: dice qué hay en
> producción, qué está bloqueado, qué no sabemos y cuál es el siguiente paso
> según el tiempo que tengas.

---

## Reglas de mantenimiento

- **Una fuente de verdad por tema.** Si un dato vive en dos documentos, uno de
  los dos está mal. Enlaza, no dupliques.
- **Fechas y estado.** Todo documento lleva `Última revisión` y `Estado`
  (`Vivo` / `Borrador` / `Congelado`).
- **Las decisiones se registran, no se recuerdan.** Cualquier cambio
  estructural (modelo de datos, taxonomía, precios, permisos) va al
  [ADR](./11-decisiones.md) antes de tocar código.
- **Los números se citan con fuente.** Si un dato viene de GA4, del panel admin
  o de una estimación, dilo. Distinguir dato de hipótesis es la mitad del
  trabajo.

---

Última revisión: 2026-08-16 · Estado: Vivo
