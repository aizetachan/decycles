# Registro de sesiones

Punto de partida para la siguiente sesión (persona o Claude): qué se hizo,
en qué estado quedó producción y por dónde seguir. Lo más reciente, arriba.

---

## Sesión 01–07 oct 2026

### Estado al cerrar
- **Producción = `main`** (commit `81d916c`), todo desplegado en
  https://decycles.cc. Landing: https://decycles.cc/welcome
- Rama abierta sin mergear: `feed+notifications` (PR #30, feed social
  admin-only). Su backend (funciones + reglas) **sí** está en producción.
- Pendientes aparcados: ver [`BACKLOG.md`](BACKLOG.md).

### Cómo desplegar (importante)
Mientras la PR #30 siga abierta, **no usar `npm run deploy`** (borraría las
Cloud Functions del feed). Desde `main`, solo web:

```
npm run build && cp dist/index.html functions/template.html && node scripts/generate-sitemap.cjs && npx firebase deploy --only hosting --project decycles-web-app-1777399378
```

Añadir `firestore:rules` a `--only` si cambian las reglas (las de `main` ya
incluyen las del feed). Después, commitear `.firebase/hosting.ZGlzdA.cache`
y `functions/template.html` como "Sync deploy artifacts". La sesión del CLI
de Firebase caduca cada pocos días → `firebase login --reauth`.

### Qué se hizo (todo en producción)
1. **Passwords** — los teclados móviles ponían mayúscula / autocorregían el
   password al pulsar el ojo. Nuevo `PasswordInput` único (sin
   autocapitalizar/autocorregir), confirmación en el registro, aviso de Bloq
   Mayús, email sin espacios. Usuarios afectados: probar con la primera letra
   en mayúscula o "Forgot password?".
2. **Mapa** — CARTO empezó a pedir API key (marca de agua). Cambio a
   **OpenFreeMap + MapLibre** (gratis, sin clave). Estilos claro/oscuro
   igualados a los de CARTO: `scripts/build-map-styles.cjs`
   (`npm run build:map-styles`). Atribución mínima. Botón
   Events/Creators (solo texto), creadores por defecto.
3. **Explore se recargaba solo** — cada visita a un perfil escribía en el
   doc del creador y vaciaba el grid de todos los visitantes. Arreglado: la
   pantalla de carga solo en la primera carga y las visitas van a
   `creatorStats/{id}` (reglas nuevas desplegadas; el dashboard suma
   visitas antiguas + nuevas).
4. **Imágenes** — Safari subía PNG enormes al recortar (no exporta WebP):
   ahora JPEG/PNG redimensionado. Recompresión de Storage ejecutada:
   294 imágenes, 883 MB → 66 MB, 0 referencias rotas. 6 HEIC convertidas.
   Borradas las fotos de 34 cuentas eliminadas de la copia de seguridad.
5. **Explore** — skeleton de carga con la bici encima (espera solo a las 12
   primeras portadas; el resto se precarga en segundo plano); avatar del
   creador en las tarjetas.
6. **Eventos** — vista **lista** por defecto (solo días con eventos),
   selector List / Calendar.
7. **Mapa (descubrimiento)** — se encuadra solo según filtros/búsqueda,
   botón "cerca de mí" (geolocalización bajo demanda), sugerencias de
   ciudades en el buscador.
8. **Perfil de creador** — "Similar creators" al final (por categorías,
   ciudad y cercanía).

### Pendiente de verificar por el equipo
- "Cerca de mí" y los movimientos del mapa en móvil y escritorio.
- Skeleton y avatares en móvil.

### Siguientes pasos sugeridos
1. Decidir qué hacer con la PR #30 (feed): desbloquea el deploy de Cloud
   Functions, necesario para miniaturas y borrado diferido de cuentas.
2. Revisar `BACKLOG.md` (copia de Storage, borrado de cuentas a 15 días,
   HEIC desde Chrome/Android, miniaturas).
