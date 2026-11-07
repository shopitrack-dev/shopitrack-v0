// POST /api/leads: Turnstile -> Airtable -> two independent Resend templates.
// Vercel Function (Node runtime).

import { validateLead, type LeadInput } from "../src/lib/contactLead.js";

const requiredEnv = [
  "TURNSTILE_SECRET_KEY",
  "AIRTABLE_TOKEN",
  "AIRTABLE_BASE_ID",
  "AIRTABLE_TABLE_NAME",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "RESEND_TEMPLATE_CLIENT",
  "RESEND_TEMPLATE_INTERNAL",
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

type NotificationStatus =
  | "Pendiente"
  | "Enviada"
  | "Error cliente"
  | "Error interno"
  | "Error ambos";

type MailResult = "accepted";
type MailKind = "client" | "internal";

const maxBodyBytes = 16_000;
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
    const error = (await response.json().catch(() => null)) as {
      error?: string | { type?: string };
    } | null;
    const type =
      typeof error?.error === "string" ? error.error : error?.error?.type;
    throw new Error(
      `Airtable ${method} HTTP ${response.status} ${type ?? ""}`.trim(),
    );
  }

  return response.json();
}

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
    console.warn(
      `leads: ${records.length} records share submission ${submissionId}`,
    );
  }

  return [...records].sort((a, b) =>
    a.createdTime.localeCompare(b.createdTime),
  )[0];
}

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

function templateVariables(record: AirtableRecord) {
  const firstName = cell(record, "Nombre");
  return {
    client: {
      NOMBRE: firstName || "cliente",
    },
    internal: {
      NOMBRE: firstName || "No proporcionado",
      APELLIDO: cell(record, "Apellido") || "No proporcionado",
      EMAIL_CLIENTE: cell(record, "Email") || "No proporcionado",
      EMPRESA: cell(record, "Empresa") || "No proporcionado",
      INDUSTRIA: cell(record, "Industria") || "No proporcionada",
      MENSAJE: cell(record, "Mensaje") || "Sin mensaje",
      TELEFONO: cell(record, "Teléfono") || "No proporcionado",
    },
  };
}

function recipients(env: Env): string[] {
  return [
    ...new Set(
      [env.CONTACT_EMAIL, env.CONTACT_EMAIL_BACKUP]
        .map((address) => address.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function assertValidHeaders(headers: Record<string, string>): void {
  for (const [name, value] of Object.entries(headers)) {
    const index = value.search(/[\u0100-\uffff]/);
    if (index >= 0) {
      const code = value
        .charCodeAt(index)
        .toString(16)
        .toUpperCase()
        .padStart(4, "0");
      const source =
        name === "Authorization"
          ? ` (RESEND_API_KEY position ${index - 7})`
          : "";
      throw new Error(
        `Resend header ${name} has U+${code} at index ${index}${source}`,
      );
    }
  }
}

async function sendTemplate(
  env: Env,
  record: AirtableRecord,
  submissionId: string,
  kind: MailKind,
): Promise<MailResult> {
  const variables = templateVariables(record);
  const isClient = kind === "client";
  const to = isClient ? [cell(record, "Email")] : recipients(env);
  const templateId = isClient
    ? env.RESEND_TEMPLATE_CLIENT
    : env.RESEND_TEMPLATE_INTERNAL;
  const key = `lead-${kind}/${submissionId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
    "Idempotency-Key": key,
  };
  assertValidHeaders(headers);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to,
      ...(isClient ? {} : { reply_to: cell(record, "Email") || undefined }),
      template: {
        id: templateId,
        variables: isClient ? variables.client : variables.internal,
      },
    }),
  });

  if (response.ok) return "accepted";

  const error = (await response.json().catch(() => null)) as {
    name?: string;
  } | null;

  // A 409 can mean another request with this key is still in flight or
  // that the same key was reused with a different payload. Neither is proof
  // that this request was accepted, so leave this email pending for retry.
  throw new Error(
    `Resend ${kind} HTTP ${response.status} ${error?.name ?? ""}`.trim(),
  );
}

function statusFromResults(
  clientSent: boolean,
  internalSent: boolean,
): NotificationStatus {
  if (clientSent && internalSent) return "Enviada";
  if (!clientSent && !internalSent) return "Error ambos";
  return clientSent ? "Error interno" : "Error cliente";
}

function pendingKinds(status: string): MailKind[] {
  switch (status) {
    case "Enviada":
      return [];
    case "Error cliente":
      return ["client"];
    case "Error interno":
      return ["internal"];
    case "Error ambos":
    case "Pendiente":
    default:
      return ["client", "internal"];
  }
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

    let record: AirtableRecord;
    try {
      record =
        (await findLead(env, submissionId)) ??
        (await createLead(env, lead, submissionId));
    } catch (error) {
      console.error("leads: airtable failed", errorMessage(error));
      return json(502, { ok: false });
    }

    const currentStatus = cell(record, notificationField);
    if (currentStatus === "Enviada") return json(200, { ok: true });

    // The single Airtable status encodes which of the two emails remains pending.
    let clientSent =
      currentStatus === "Error interno" || currentStatus === "Enviada";
    let internalSent =
      currentStatus === "Error cliente" || currentStatus === "Enviada";
    const kinds = pendingKinds(currentStatus);

    for (const kind of kinds) {
      try {
        await sendTemplate(env, record, submissionId, kind);
        if (kind === "client") clientSent = true;
        else internalSent = true;
      } catch (error) {
        console.error(
          `leads: ${kind} notification failed for record ${record.id}`,
          errorMessage(error),
        );
      }
    }

    const nextStatus = statusFromResults(clientSent, internalSent);
    if (nextStatus !== currentStatus) {
      try {
        await setNotificationStatus(env, record.id, nextStatus);
      } catch (error) {
        console.error(
          `leads: could not mark record ${record.id} as ${nextStatus}`,
          errorMessage(error),
        );
      }
    }

    // The lead is already persisted. The visitor receives success even if email
    // delivery is pending; the Airtable status and server logs expose that state.
    return json(200, { ok: true });
  },
};
