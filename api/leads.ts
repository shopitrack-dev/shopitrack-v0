// POST /api/leads: Turnstile check -> Airtable lead (one per "ID de envío") ->
// Resend notification. Vercel Function (Node runtime). Docs: docs/CONTACT-FORM.md
import { validateLead, type LeadInput } from "../src/lib/contactLead.js";

const requiredEnv = [
  "TURNSTILE_SECRET_KEY",
  "AIRTABLE_TOKEN",
  "AIRTABLE_BASE_ID",
  "AIRTABLE_TABLE_NAME",
  "RESEND_API_KEY",
  "RESEND_FROM",
] as const;

type Env = Record<(typeof requiredEnv)[number], string> & {
  CONTACT_EMAIL: string;
  CONTACT_EMAIL_BACKUP: string;
};

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

type NotificationStatus = "Pendiente" | "Enviada" | "Error";

const maxBodyBytes = 16_000;
const subject = "Nuevo contacto desde Shopitrack";
const origin = "Website";
const submissionIdField = "ID de envío";
const notificationField = "Estado de notificación";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(
  status: number,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toLead(body: Record<string, unknown>): LeadInput {
  return {
    firstName: text(body.firstName),
    lastName: text(body.lastName),
    company: text(body.company),
    role: text(body.role),
    email: text(body.email),
    phone: text(body.phone),
    industry: text(body.industry),
    volume: text(body.volume),
    message: text(body.message),
    privacyAccepted: body.privacyAccepted === true,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cell(record: AirtableRecord, field: string): string {
  const value = record.fields[field];
  return typeof value === "string" ? value : "";
}

async function verifyTurnstile(
  secret: string,
  token: string,
  remoteip: string | undefined,
): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip }),
    },
  );
  if (!response.ok) throw new Error(`Turnstile HTTP ${response.status}`);
  const result = (await response.json()) as {
    success?: boolean;
    "error-codes"?: string[];
  };
  if (!result.success) {
    console.warn("leads: turnstile rejected", result["error-codes"]);
  }
  return result.success === true;
}

async function airtableRequest(
  env: Env,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<unknown> {
  const base = encodeURIComponent(env.AIRTABLE_BASE_ID);
  const table = encodeURIComponent(env.AIRTABLE_TABLE_NAME);
  const response = await fetch(
    `https://api.airtable.com/v0/${base}/${table}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  if (!response.ok) {
    // Only the error type is logged: Airtable messages can echo cell values.
    const error = (await response.json().catch(() => null)) as {
      error?: string | { type?: string };
    } | null;
    const type =
      typeof error?.error === "string" ? error.error : error?.error?.type;
    throw new Error(`Airtable ${method} HTTP ${response.status} ${type ?? ""}`.trim());
  }
  return response.json();
}

// Airtable has no unique constraint, so two requests racing past this lookup can
// both create a record. The oldest one wins; the warning flags the duplicate.
async function findLead(
  env: Env,
  submissionId: string,
): Promise<AirtableRecord | undefined> {
  const query = new URLSearchParams({
    filterByFormula: `{${submissionIdField}}='${submissionId}'`,
    maxRecords: "5",
  });
  const { records } = (await airtableRequest(env, "GET", `?${query}`)) as {
    records: AirtableRecord[];
  };
  if (records.length > 1) {
    console.warn(`leads: ${records.length} records share submission ${submissionId}`);
  }
  return [...records].sort((a, b) => a.createdTime.localeCompare(b.createdTime))[0];
}

// Exact field names of the Airtable "Leads" table. Empty optional values are
// omitted so Airtable leaves the cell blank. typecast lets Airtable match the
// single-select options by text.
async function createLead(
  env: Env,
  lead: LeadInput,
  submissionId: string,
): Promise<AirtableRecord> {
  const fields = {
    Nombre: lead.firstName,
    Apellido: lead.lastName,
    Empresa: lead.company,
    "Puesto / Rol": lead.role || undefined,
    Email: lead.email,
    Teléfono: lead.phone || undefined,
    Industria: lead.industry || undefined,
    "Volumen mensual": lead.volume || undefined,
    Mensaje: lead.message || undefined,
    "Privacidad aceptada": lead.privacyAccepted,
    "Fecha de recepción": new Date().toISOString(),
    Estado: "Nuevo",
    Origen: origin,
    [submissionIdField]: submissionId,
    [notificationField]: "Pendiente" satisfies NotificationStatus,
  };
  const { records } = (await airtableRequest(env, "POST", "", {
    typecast: true,
    records: [{ fields }],
  })) as { records: AirtableRecord[] };
  return records[0];
}

async function setNotificationStatus(
  env: Env,
  recordId: string,
  status: NotificationStatus,
): Promise<void> {
  await airtableRequest(env, "PATCH", `/${encodeURIComponent(recordId)}`, {
    typecast: true,
    fields: { [notificationField]: status },
  });
}

// Built only from the stored record, so every retry sends the same payload with
// the same idempotency key and Resend never sends it twice within 24 h.
function notificationEmail(record: AirtableRecord) {
  const received = new Date(
    cell(record, "Fecha de recepción") || record.createdTime,
  ).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "long",
    timeStyle: "short",
  });
  const rows: [string, string][] = [
    ["Nombre", `${cell(record, "Nombre")} ${cell(record, "Apellido")}`.trim()],
    ["Empresa", cell(record, "Empresa")],
    ["Puesto / Rol", cell(record, "Puesto / Rol")],
    ["Email", cell(record, "Email")],
    ["Teléfono", cell(record, "Teléfono")],
    ["Industria", cell(record, "Industria")],
    ["Volumen mensual", cell(record, "Volumen mensual")],
    ["Mensaje", cell(record, "Mensaje")],
    ["Fecha de recepción", `${received} (hora del centro de México)`],
    ["Origen", cell(record, "Origen") || origin],
  ];
  const textBody = rows
    .map(([label, value]) => `${label}: ${value || "-"}`)
    .join("\n");
  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" valign="top" style="padding:8px 16px 8px 0;color:#555;font-weight:600;white-space:nowrap">${label}</th>` +
        `<td style="padding:8px 0;color:#111;white-space:pre-wrap">${escapeHtml(value || "-")}</td></tr>`,
    )
    .join("");
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">` +
    `<h2 style="font-size:18px;margin:0 0 16px">${subject}</h2>` +
    `<table cellpadding="0" cellspacing="0" border="0">${htmlRows}</table></div>`;
  return { replyTo: cell(record, "Email"), text: textBody, html };
}

// "accepted": Resend took the request (not proof of inbox delivery).
// "duplicate": Resend already handled this key (409) and sent nothing new.
async function sendNotification(
  env: Env,
  record: AirtableRecord,
  submissionId: string,
): Promise<"accepted" | "duplicate"> {
  const email = notificationEmail(record);
  // One request for both inboxes: same message, same idempotency key.
  const to = [
    ...new Set(
      [env.CONTACT_EMAIL, env.CONTACT_EMAIL_BACKUP]
        .filter(Boolean)
        .map((address) => address.toLowerCase()),
    ),
  ];
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `lead-notification/${submissionId}`,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to,
      reply_to: email.replyTo || undefined,
      subject,
      text: email.text,
      html: email.html,
    }),
  });
  if (response.ok) return "accepted";
  const error = (await response.json().catch(() => null)) as {
    name?: string;
  } | null;
  if (response.status === 409) {
    console.warn(
      `leads: notification for record ${record.id} not resent (${error?.name ?? "409"})`,
    );
    return "duplicate";
  }
  throw new Error(`Resend HTTP ${response.status} ${error?.name ?? ""}`.trim());
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json(405, { ok: false }, { Allow: "POST" });
    }
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return json(415, { ok: false });
    }
    if (Number(request.headers.get("content-length")) > maxBodyBytes) {
      return json(413, { ok: false });
    }
    const raw = await request.text();
    if (raw.length > maxBodyBytes) return json(413, { ok: false });

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(400, { ok: false });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json(400, { ok: false });
    }
    const input = body as Record<string, unknown>;
    const lead = toLead(input);
    const submissionId = text(input.submissionId).toLowerCase();
    const errors: Record<string, string> = { ...validateLead(lead) };
    if (!uuidPattern.test(submissionId)) errors.submissionId = "format";
    if (Object.keys(errors).length > 0) {
      return json(400, { ok: false, errors });
    }

    const missing = requiredEnv.filter((name) => !process.env[name]?.trim());
    if (missing.length > 0) {
      console.error("leads: missing env", missing.join(", "));
      return json(500, { ok: false });
    }
    const env = {
      ...Object.fromEntries(
        requiredEnv.map((name) => [name, process.env[name]!.trim()]),
      ),
      CONTACT_EMAIL:
        process.env.CONTACT_EMAIL?.trim() || "contacto@shopitrack.com",
      CONTACT_EMAIL_BACKUP: process.env.CONTACT_EMAIL_BACKUP?.trim() ?? "",
    } as Env;

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    try {
      const human = await verifyTurnstile(
        env.TURNSTILE_SECRET_KEY,
        text(input.turnstileToken),
        ip,
      );
      if (!human) return json(403, { ok: false });
    } catch (error) {
      console.error("leads: turnstile unavailable", errorMessage(error));
      return json(502, { ok: false });
    }

    // A retry with a known submission keeps the stored lead untouched.
    let record: AirtableRecord;
    try {
      record =
        (await findLead(env, submissionId)) ??
        (await createLead(env, lead, submissionId));
    } catch (error) {
      console.error("leads: airtable failed", errorMessage(error));
      return json(502, { ok: false });
    }

    // From here the lead is stored, so the visitor always gets a success: a
    // notification problem is tracked in "Estado de notificación" and the logs.
    if (cell(record, notificationField) === "Enviada") {
      return json(200, { ok: true });
    }

    let result: "accepted" | "duplicate";
    try {
      result = await sendNotification(env, record, submissionId);
    } catch (error) {
      console.error(
        `leads: notification failed for record ${record.id}`,
        errorMessage(error),
      );
      await setNotificationStatus(env, record.id, "Error").catch((statusError) =>
        console.error(
          `leads: could not mark record ${record.id} as Error`,
          errorMessage(statusError),
        ),
      );
      return json(200, { ok: true });
    }

    if (result === "accepted") {
      // If this fails the record stays Pendiente; a retry resends with the same
      // key, Resend answers without sending again, and the status is fixed then.
      await setNotificationStatus(env, record.id, "Enviada").catch((statusError) =>
        console.error(
          `leads: notification accepted but record ${record.id} not marked Enviada`,
          errorMessage(statusError),
        ),
      );
    }
    return json(200, { ok: true });
  },
};
