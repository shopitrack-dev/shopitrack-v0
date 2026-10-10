# Formulario de contacto

Flujo: `src/pages/Contacto.tsx` → Cloudflare Turnstile → `POST /api/leads` (Vercel Function) → Airtable (registro) → Resend (aviso a `contacto@shopitrack.com`).

| Archivo | Papel |
| --- | --- |
| `src/pages/Contacto.tsx` | Formulario, estados de envío, llamada a `/api/leads` |
| `src/lib/contactLead.ts` | Validación compartida por navegador y servidor (opciones, longitudes, correos personales) |
| `src/lib/contactLead.test.ts`, `tests/leads.test.ts` | Pruebas de la validación y del endpoint (`npm test`) |
| `src/components/Turnstile.tsx` | Widget de Turnstile (modo `interaction-only`: solo se ve si Cloudflare pide un reto) |
| `api/leads.ts` | Endpoint: valida, verifica Turnstile, guarda en Airtable, envía con Resend |

## Variables de entorno

| Variable | Tipo | Valor |
| --- | --- | --- |
| `VITE_TURNSTILE_SITE_KEY` | Pública (va al bundle) | Site key del widget de Turnstile |
| `TURNSTILE_SECRET_KEY` | Secreta | Secret key del widget |
| `AIRTABLE_TOKEN` | Secreta | Personal Access Token |
| `AIRTABLE_BASE_ID` | Servidor | `appVpiNOzEsYJofrF` |
| `AIRTABLE_TABLE_NAME` | Servidor | `tblQrRQ4dBqOb8Gcf` (ID de la tabla Leads; también acepta el nombre) |
| `RESEND_API_KEY` | Secreta | API key de Resend |
| `RESEND_FROM` | Servidor | Remitente en un dominio verificado, p. ej. `Shopitrack <notificaciones@shopitrack.com>` |
| `CONTACT_EMAIL` | Servidor | Destinatario. Si falta: `contacto@shopitrack.com` |
| `CONTACT_EMAIL_BACKUP` | Servidor (opcional) | Correo de respaldo. Recibe el mismo aviso en la misma solicitud a Resend (`to` con ambas direcciones). Si falta, solo se notifica a `CONTACT_EMAIL` |

- **Vercel** (Settings → Environment Variables): todas, en Production y en Preview. `VITE_TURNSTILE_SITE_KEY` se lee al hacer el build: después de cambiarla hay que volver a desplegar.
- **Local**: `.env` (está en `.gitignore`), con la plantilla de `.env.example`. Solo hace falta si usas `vercel dev`.
- Si falta cualquier variable secreta o de servidor, el endpoint responde 500 y deja en los logs de Vercel `leads: missing env <NOMBRES>`.

## Cloudflare Turnstile

1. Cloudflare → Turnstile → Add widget. Hostnames: `shopitrack.com` y `www.shopitrack.com`. Modo: Managed.
2. Copiar la site key a `VITE_TURNSTILE_SITE_KEY` y la secret key a `TURNSTILE_SECRET_KEY`.
3. Para probar Turnstile de verdad en Preview, agregar al widget el hostname exacto del deployment Preview (por ejemplo, el alias de rama `<proyecto>-git-<rama>-<equipo>.vercel.app`). Si el hostname no está autorizado, el widget no entrega token y el formulario muestra el error genérico.
4. En local, o en Preview sin agregar el hostname, usar las claves de prueba de Cloudflare: site key `1x00000000000000000000AA` con secret `1x0000000000000000000000000000000AA` (siempre aprueban), o secret `2x0000000000000000000000000000000AA` (siempre rechaza). En Production van las claves reales.

El token se valida en el servidor con `siteverify`. Cada token es de un solo uso: si un envío falla, el formulario genera uno nuevo automáticamente.

## Airtable

- Base `appVpiNOzEsYJofrF`, tabla **Leads** (`tblQrRQ4dBqOb8Gcf`).
- PAT (airtable.com/create/tokens): permisos `data.records:read` y `data.records:write`, con acceso solo a esta base. La lectura es necesaria para encontrar un lead por `ID de envío` sin sobrescribirlo y para conocer su estado de notificación.
- Campos que usa el endpoint. Los nombres deben coincidir exactamente; si se renombra un campo, hay que cambiarlo también en `api/leads.ts` (`createLead`, `notificationEmail` y las constantes `submissionIdField` / `notificationField`).

| Campo | Tipo | Valor |
| --- | --- | --- |
| Nombre | Texto corto | Formulario |
| Apellido | Texto corto | Formulario |
| Empresa | Texto corto | Formulario |
| Puesto / Rol | Texto corto | Formulario (opcional) |
| Email | Email | Formulario |
| Teléfono | Teléfono | Formulario (opcional) |
| Industria | Selección única | Formulario (opcional) |
| Volumen mensual | Selección única | Formulario (opcional) |
| Mensaje | Texto largo | Formulario (opcional) |
| Privacidad aceptada | Checkbox | `true`, validado en el servidor |
| Fecha de recepción | Fecha y hora | Hora del servidor (UTC) |
| Estado | Selección única | `Nuevo` |
| Origen | Selección única | `Website` |
| ID de envío | Texto corto | UUID generado por el formulario |
| Estado de notificación | Selección única | `Pendiente` al crear; `Enviada` o `Error` según Resend |

Las opciones de selección única deben existir con exactamente el mismo texto que envía el formulario (definido en `src/lib/contactLead.ts`), incluidas mayúsculas, acentos y la raya `–` de los rangos:

- **Industria:** `Departamentales / Autoservicio`, `Muebles y Decoración`, `Electrodomésticos y Línea Blanca`, `Hogar (Reparaciones, Instalaciones, Mudanzas)`, `Servicios de Tecnología (Internet, Telefonía)`, `e-Commerce`, `Operador Logístico`, `Otro`.
- **Volumen mensual:** `Menos de 100`, `100–500`, `501–2,000`, `2,001–10,000`, `Más de 10,000`.
- **Estado:** `Nuevo`. **Origen:** `Website`. **Estado de notificación:** `Pendiente`, `Enviada`, `Error`.

El endpoint envía `typecast: true`, por lo que Airtable puede intentar crear una opción que falte. Si no puede crearla, rechaza el registro (502) y el lead no se guarda: hay que crearlas de antemano. El campo principal de la tabla no se escribe; si es una fórmula (por ejemplo, Nombre + Empresa), se llena solo.

## Resend

1. Resend → Domains → agregar `shopitrack.com` y crear en el DNS los registros que indique (SPF y DKIM; DMARC recomendado). Esperar a que el dominio aparezca como Verified.
2. `RESEND_FROM` debe usar ese dominio.
3. Resend → API Keys: crear una key con permiso Sending access, limitada al dominio, y guardarla en `RESEND_API_KEY`.

El aviso llega a `CONTACT_EMAIL` y, si está configurado, a `CONTACT_EMAIL_BACKUP`, en una sola solicitud. Ambas direcciones aparecen en el campo "Para" del correo, así que cada destinatario ve la otra; el sitio no las muestra. Llega con asunto "Nuevo contacto desde Shopitrack" y `reply_to` con el email del prospecto. Se envía con el encabezado `Idempotency-Key: lead-notification/<ID de envío>` y su contenido se arma solo con los datos guardados en Airtable, así que un reintento repite exactamente la misma solicitud y Resend no vuelve a enviarla durante 24 horas. Que Resend acepte la solicitud no garantiza la entrega; el estado de cada envío se ve en Resend → Emails.

## Reintentos e idempotencia

1. El formulario genera un UUID (`crypto.randomUUID()`) en el primer envío válido y lo reutiliza en los reintentos. Si la persona edita algún campo, se considera un envío nuevo y se genera otro UUID.
2. El servidor valida el UUID y, tras Turnstile, busca en Airtable un registro con ese `ID de envío`:
   - **No existe:** crea el lead con `Estado de notificación = Pendiente`.
   - **Existe:** no lo modifica; los datos del reintento se ignoran.
3. Si el estado es `Enviada`, responde éxito sin enviar nada. Si es `Pendiente` o `Error`, envía el aviso:
   - Resend lo acepta: marca `Enviada`.
   - Resend responde 409 (clave ya usada o en curso): no se envía otro correo y el estado no cambia.
   - Resend falla: intenta marcar `Error` y lo registra en los logs.
4. Si el correo se aceptó pero no se pudo marcar `Enviada`, el registro queda `Pendiente`. Un reintento con el mismo UUID vuelve a llamar a Resend con la misma clave y el mismo contenido: Resend responde sin enviar de nuevo y entonces se marca `Enviada`.

**Límite de concurrencia (no garantizado):** Airtable no tiene restricciones de unicidad ni transacciones, y su documentación no describe el comportamiento con solicitudes simultáneas. Si dos solicitudes con el mismo UUID pasan la búsqueda al mismo tiempo, ambas crean un registro. El correo sigue siendo uno solo, porque Resend rechaza con 409 la segunda solicitud con la misma clave. El formulario impide envíos paralelos y solo reintenta cuando la solicitud anterior terminó, así que esto requiere una conexión cortada mientras el servidor sigue procesando y un reenvío en esa misma ventana. Los duplicados se detectan agrupando la tabla por `ID de envío`, y los logs muestran `N records share submission <UUID>`. Una garantía estricta requiere un candado atómico fuera de Airtable (por ejemplo, Redis), que no está implementado.

**Clave de Resend tras un fallo:** la documentación de Resend no aclara si una solicitud fallida (5xx) reserva la clave durante 24 horas. Si fuera así, los reintentos de un registro en `Error` recibirían la misma respuesta de error y habría que reenviar el aviso manualmente.

## Respuestas y errores

| Caso | HTTP | Qué pasa |
| --- | --- | --- |
| Lead guardado y aviso aceptado | 200 | Éxito; `Estado de notificación = Enviada` |
| Reintento de un envío ya notificado | 200 | Éxito; no se escribe ni se envía nada |
| Lead guardado, Resend falla | 200 | El usuario ve éxito; `Estado de notificación = Error` y log `leads: notification failed for record recXXX` |
| Aviso aceptado, falla la actualización del estado | 200 | Queda `Pendiente`; log `notification accepted but record recXXX not marked Enviada` |
| Datos inválidos o UUID con formato incorrecto | 400 | No se llama a ningún servicio |
| Turnstile rechazado o sin token | 403 | No se guarda nada |
| Método distinto de POST / no JSON / cuerpo > 16 KB | 405 / 415 / 413 | — |
| Falta configuración | 500 | Log `leads: missing env …` |
| Airtable o Turnstile no disponibles | 502 | No se envía correo; el usuario puede reintentar con sus datos intactos |

Los mensajes al usuario son los textos genéricos de `formCopy`; los logs no incluyen datos personales.

**`Resend header Authorization has U+XXXX at index N (RESEND_API_KEY position P)`:** el valor de `RESEND_API_KEY` en Vercel contiene un carácter que no puede ir en un encabezado HTTP (por ejemplo, una raya `—` que un editor puso en lugar de un guion, o una nota pegada junto a la clave). Las claves de Resend solo tienen letras, números y `_`. Hay que volver a pegar la clave como texto plano y redesplegar. Sin esta validación, el error aparecía como `Cannot convert argument to a ByteString…` y la solicitud nunca llegaba a Resend.

**Reenviar un aviso fallido:** filtrar en Airtable `Estado de notificación` = `Error`, o `Pendiente` con más de unos minutos de antigüedad, y reenviar el aviso manualmente. No hace falta volver a crear el lead. Al terminar, cambiar el estado a `Enviada`.

**Abuso:** la protección es Turnstile. Para limitar la frecuencia de solicitudes, agregar una regla de rate limiting en Vercel → Firewall para `/api/leads`. Un contador en memoria no sirve en funciones serverless.

## Cómo probar

- `npm test`: validación compartida (`src/lib/contactLead.test.ts`) y endpoint con Turnstile, Airtable y Resend simulados en memoria (`tests/leads.test.ts`: primer envío, reintentos, estados `Enviada` / `Error`, fallos de Resend y de Airtable, Turnstile, UUID inválido y concurrencia). Requiere Node 22.15 o superior. También `npm run typecheck`, `npm run lint` y `npm run build`.
- `npm run dev` no ejecuta `/api`: el envío termina en el mensaje de error, lo cual sirve para revisar ese estado.
- Flujo completo en local: `npm i -g vercel`, `vercel link` y `vercel dev`, con `.env` completo.
- **Después de desplegar** (Preview o Production):
  1. Enviar el formulario con datos de prueba y un correo corporativo real.
  2. Confirmar el registro en Airtable: Estado `Nuevo`, Origen `Website`, fecha, checkbox, un UUID en `ID de envío` y `Estado de notificación = Enviada`.
  3. Confirmar el correo en `contacto@shopitrack.com` y que "Responder" va al prospecto.
  4. Revisar Vercel → Logs: no debe haber `leads:` con error.
  5. Borrar el registro de prueba.
