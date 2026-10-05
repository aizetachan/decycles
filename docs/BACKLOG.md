# Backlog — decisiones pendientes

Temas identificados y **aparcados a propósito**. Cada uno explica el contexto,
lo que ya sabemos y qué hay que decidir antes de implementarlo.

---

## 1. Copia de seguridad `_backup_pre_webp_20260627/` en Storage

**Estado:** pendiente de decisión — no prioritario.

Carpeta en el bucket (`decycles-web-app-1777399378.firebasestorage.app`) creada
el 27-jun-2026, antes de la primera conversión a WebP. **No es el proyecto**
(eso está en el repo): son **imágenes subidas por creadores/usuarios**, en su
formato y resolución originales.

Contenido (medido el 04-oct-2026):

| Grupo | Archivos | Tamaño | Notas |
|---|---|---|---|
| Originales de imágenes que hoy se muestran | 430 | ~1,2 GB | Única copia a resolución completa. La web sirve versiones WebP ≤1600px. |
| Imágenes que el usuario ya cambió o borró | 394 | ~0,86 GB | Sin valor: el usuario las quitó. |
| Cuentas borradas | ~~241~~ | ~~169 MB~~ | **Borradas el 04-oct-2026** (privacidad/RGPD). |

Las imágenes actuales de los creadores **no dependen de esta carpeta**: viven
en `creators/` y `users/` y no se tocan.

**Qué decidir:** ¿vamos a necesitar alguna vez las fotos a más de 1600px
(impresión, marketing, zoom)?
- **No** → borrar la carpeta entera.
- **Quizá** (recomendado) → descargar solo los 430 originales vigentes a un
  disco externo y borrar la carpeta de Storage.

Una copia futura "solo de lo que tenemos" no requiere guardar nada ahora: se
puede generar desde Storage en cualquier momento (a 1600px).

Notas: el borrado masivo en Storage lo lanza una persona, no el agente
(bloqueado por permisos). Coste actual de guardarla: céntimos/mes — el motivo
es orden, no dinero.

---

## 2. Borrado de cuenta con 15 días de margen

**Estado:** aparcado. Hoy el borrado es **inmediato** (cascada: Firestore +
Storage + Auth, ver `adminDeleteUser` en `functions/index.js`).

Comportamiento deseado:
1. Al pedir el borrado, la cuenta pasa a "pendiente de borrado" con fecha; su
   perfil y contenido dejan de verse al instante.
2. Se **notifica por email** que todo el contenido relacionado se conservará
   15 días y después se borrará automáticamente para liberar espacio (decidir
   si se puede recuperar la cuenta en ese plazo).
3. Una Cloud Function programada (diaria) elimina definitivamente las cuentas
   que superen los 15 días: Firestore, Storage y Auth.

**Antes de implementarlo:**
- Elegir servicio de email (hoy la web no envía correos propios): p. ej.
  extensión "Trigger Email" de Firebase o Resend.
- Desbloquear el deploy de Cloud Functions (ver punto 4).

---

## 3. Subidas HEIC desde Chrome / Android

Safari convierte HEIC en el cliente; Chrome/Firefox no pueden decodificarlo y
la imagen se sube tal cual (y luego no se ve en esos navegadores). El
04-oct-2026 se convirtieron a WebP las 6 HEIC que había. Opciones: avisar /
rechazar HEIC en el selector cuando el navegador no lo decodifique, o
convertirlo en servidor.

---

## 4. Deploy de Cloud Functions bloqueado por la PR #30 (feed)

Producción ejecuta funciones del feed que solo existen en la rama
`feed+notifications`. Desplegar funciones desde `main` (`npm run deploy`) las
borraría. Hasta mergear o descartar la PR #30, desde `main` solo se despliega
`hosting` (y `firestore:rules`, que ya incluyen las del feed).
