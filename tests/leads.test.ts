// api/leads.ts against in-memory fakes of Turnstile, Airtable and Resend.
// No real service is called. The Resend fake follows its documented
// idempotency rules (same key: no resend; key in flight or new payload: 409).
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import handler from "../api/leads.ts";

interface FakeRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

interface FakeOptions {
  turnstileOk: boolean;
  airtableDown: boolean;
  statusUpdateFails: boolean;
  resendStatus: number;
  delayMs: number;
}

const submissionId = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

const lead = {
  firstName: "Ana",
  lastName: "Pérez",
  company: "<b>Demo</b> & Co",
  role: "",
  email: "ana@empresa-demo.com",
  phone: "55 1234 5678",
  industry: "e-Commerce",
  volume: "",
  message: "Hola\n<script>alert(1)</script>",
  privacyAccepted: true,
  turnstileToken: "token",
  submissionId,
};

const recipients = ["contacto@shopitrack.com", "respaldo@example.com"];

const personalData = [lead.firstName, lead.lastName, lead.email, lead.phone, "Hola"];

function fakeServices(overrides: Partial<FakeOptions> = {}) {
  const options: FakeOptions = {
    turnstileOk: true,
    airtableDown: false,
    statusUpdateFails: false,
    resendStatus: 200,
    delayMs: 0,
    ...overrides,
  };
  const records: FakeRecord[] = [];
  const createdFields: Record<string, unknown>[] = [];
  const emailsSent: { key: string; body: Record<string, string | string[]> }[] = [];
  const resendRequests: Record<string, string | string[]>[] = [];
  const resendKeys = new Map<string, { payload: string; done: boolean }>();
  const calls: string[] = [];
  let clock = 0;

  const wait = () => new Promise((resolve) => setTimeout(resolve, options.delayMs));
  const reply = (status: number, body: unknown) => Response.json(body, { status });

  async function fetchFake(
    input: string | URL | Request,
    init: RequestInit = {},
  ): Promise<Response> {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined;

    if (url.hostname === "challenges.cloudflare.com") {
      calls.push("turnstile");
      return reply(200, { success: options.turnstileOk });
    }

    if (url.hostname === "api.airtable.com") {
      calls.push(`airtable ${method}`);
      if (options.airtableDown) {
        return reply(503, { error: { type: "SERVICE_UNAVAILABLE" } });
      }
      if (method === "GET") {
        const formula = url.searchParams.get("filterByFormula") ?? "";
        const id = /'([^']+)'/.exec(formula)?.[1];
        const matches = records.filter((r) => r.fields["ID de envío"] === id);
        await wait();
        return reply(200, { records: structuredClone(matches) });
      }
      if (method === "POST") {
        await wait();
        // JSON round trip drops undefined cells, as Airtable leaves them blank.
        const fields = JSON.parse(JSON.stringify(body.records[0].fields));
        createdFields.push(structuredClone(fields));
        const record: FakeRecord = {
          id: `rec${records.length + 1}`,
          createdTime: new Date(Date.UTC(2026, 9, 9, 18, 0, clock++)).toISOString(),
          fields,
        };
        records.push(record);
        return reply(200, { records: [structuredClone(record)] });
      }
      if (options.statusUpdateFails) {
        return reply(500, { error: { type: "SERVER_ERROR" } });
      }
      const record = records.find((r) => url.pathname.endsWith(`/${r.id}`));
      if (!record) return reply(404, { error: "NOT_FOUND" });
      Object.assign(record.fields, body.fields);
      return reply(200, structuredClone(record));
    }

    calls.push("resend");
    resendRequests.push(body);
    const key = new Headers(init.headers).get("Idempotency-Key") ?? "";
    const payload = String(init.body);
    const known = resendKeys.get(key);
    if (known && !known.done) {
      return reply(409, { name: "concurrent_idempotent_requests" });
    }
    if (known && known.payload !== payload) {
      return reply(409, { name: "invalid_idempotent_request" });
    }
    if (known) return reply(200, { id: "email_original" });
    resendKeys.set(key, { payload, done: false });
    await wait();
    if (options.resendStatus !== 200) {
      resendKeys.delete(key);
      return reply(options.resendStatus, { name: "application_error" });
    }
    resendKeys.set(key, { payload, done: true });
    emailsSent.push({ key, body });
    return reply(200, { id: `email_${emailsSent.length}` });
  }

  globalThis.fetch = fetchFake as typeof fetch;
  return { options, records, createdFields, emailsSent, resendRequests, calls };
}

function storedRecord(status: string): FakeRecord {
  return {
    id: "recSeed",
    createdTime: "2026-10-09T17:00:00.000Z",
    fields: {
      Nombre: "Ana",
      Apellido: "Pérez",
      Empresa: "Empresa Original",
      Email: "ana@empresa-demo.com",
      "Privacidad aceptada": true,
      "Fecha de recepción": "2026-10-09T17:00:00.000Z",
      Estado: "Nuevo",
      Origen: "Website",
      "ID de envío": submissionId,
      "Estado de notificación": status,
    },
  };
}

function post(body: unknown, init: { method?: string; contentType?: string; raw?: string } = {}) {
  const method = init.method ?? "POST";
  return handler.fetch(
    new Request("https://shopitrack.test/api/leads", {
      method,
      headers: { "content-type": init.contentType ?? "application/json" },
      body: method === "GET" ? undefined : (init.raw ?? JSON.stringify(body)),
    }),
  );
}

const realFetch = globalThis.fetch;
const realConsole = { error: console.error, warn: console.warn, info: console.info };
let logs: string[] = [];

beforeEach(() => {
  logs = [];
  for (const level of ["error", "warn", "info"] as const) {
    console[level] = (...args: unknown[]) => {
      logs.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "));
    };
  }
  Object.assign(process.env, {
    TURNSTILE_SECRET_KEY: "test-secret",
    AIRTABLE_TOKEN: "test-token",
    AIRTABLE_BASE_ID: "appTEST",
    AIRTABLE_TABLE_NAME: "tblTEST",
    RESEND_API_KEY: "test-resend-key",
    RESEND_FROM: "Shopitrack <notificaciones@example.com>",
    CONTACT_EMAIL_BACKUP: "respaldo@example.com",
  });
  delete process.env.CONTACT_EMAIL;
});

afterEach(() => {
  Object.assign(console, realConsole);
  globalThis.fetch = realFetch;
  for (const value of personalData) {
    assert.ok(!logs.some((line) => line.includes(value)), `logs contain "${value}"`);
  }
  assert.ok(!logs.some((line) => line.includes("test-token") || line.includes("test-resend-key")));
});

test("1. first submission creates one lead as Pendiente, notifies and marks Enviada", async () => {
  const fake = fakeServices();
  const response = await post(lead);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(fake.calls, ["turnstile", "airtable GET", "airtable POST", "resend", "airtable PATCH"]);

  assert.equal(fake.records.length, 1);
  const created = fake.createdFields[0];
  assert.equal(created["Estado de notificación"], "Pendiente");
  assert.equal(created["ID de envío"], submissionId);
  assert.equal(created.Estado, "Nuevo");
  assert.equal(created.Origen, "Website");
  assert.equal(created["Privacidad aceptada"], true);
  assert.deepEqual(Object.keys(created).sort(), [
    "Apellido", "Email", "Empresa", "Estado", "Estado de notificación", "Fecha de recepción",
    "ID de envío", "Industria", "Mensaje", "Nombre", "Origen", "Privacidad aceptada", "Teléfono",
  ]);
  assert.equal(fake.records[0].fields["Estado de notificación"], "Enviada");

  assert.equal(fake.emailsSent.length, 1);
  const email = fake.emailsSent[0];
  assert.equal(email.key, `lead-notification/${submissionId}`);
  assert.deepEqual(email.body.to, recipients);
  assert.equal(email.body.reply_to, lead.email);
  assert.equal(email.body.subject, "Nuevo contacto desde Shopitrack");
  assert.ok(!String(email.body.html).includes("<script>"));
  assert.ok(String(email.body.html).includes("&lt;b&gt;Demo&lt;/b&gt; &amp; Co"));
});

test("2. a retry with the same UUID keeps the original lead and sends nothing new", async () => {
  const fake = fakeServices();
  await post(lead);
  const response = await post({ ...lead, company: "Otra Empresa", firstName: "Otro" });
  assert.equal(response.status, 200);
  assert.equal(fake.records.length, 1);
  assert.equal(fake.records[0].fields.Empresa, lead.company);
  assert.equal(fake.records[0].fields.Nombre, "Ana");
  assert.equal(fake.emailsSent.length, 1);
});

test("3. a lead already marked Enviada is not notified again", async () => {
  const fake = fakeServices();
  fake.records.push(storedRecord("Enviada"));
  const response = await post(lead);
  assert.equal(response.status, 200);
  assert.deepEqual(fake.calls, ["turnstile", "airtable GET"]);
  assert.equal(fake.records.length, 1);
});

test("4. a lead marked Error retries the notification without a new lead", async () => {
  const fake = fakeServices();
  fake.records.push(storedRecord("Error"));
  const response = await post({ ...lead, company: "Datos del reintento" });
  assert.equal(response.status, 200);
  assert.deepEqual(fake.calls, ["turnstile", "airtable GET", "resend", "airtable PATCH"]);
  assert.equal(fake.records.length, 1);
  assert.equal(fake.records[0].fields["Estado de notificación"], "Enviada");
  assert.equal(fake.emailsSent.length, 1);
  assert.ok(String(fake.emailsSent[0].body.text).includes("Empresa: Empresa Original"));
});

test("5. a Resend failure keeps the lead and marks it Error", async () => {
  const fake = fakeServices({ resendStatus: 500 });
  const response = await post(lead);
  assert.equal(response.status, 200);
  assert.equal(fake.records.length, 1);
  assert.equal(fake.records[0].fields["Estado de notificación"], "Error");
  assert.equal(fake.emailsSent.length, 0);
  assert.deepEqual(fake.resendRequests.map((request) => request.to), [recipients]);
  assert.ok(logs.some((line) => line.includes("notification failed for record rec1")));
});

test("6. accepted email + failed status update is recovered by a retry without a second email", async () => {
  const fake = fakeServices({ statusUpdateFails: true });
  assert.equal((await post(lead)).status, 200);
  assert.equal(fake.emailsSent.length, 1);
  assert.equal(fake.records[0].fields["Estado de notificación"], "Pendiente");
  assert.ok(logs.some((line) => line.includes("not marked Enviada")));

  fake.options.statusUpdateFails = false;
  assert.equal((await post(lead)).status, 200);
  assert.equal(fake.records.length, 1);
  assert.equal(fake.emailsSent.length, 1);
  assert.equal(fake.records[0].fields["Estado de notificación"], "Enviada");
});

test("7. an invalid Turnstile token writes nothing and sends nothing", async () => {
  const fake = fakeServices({ turnstileOk: false });
  const response = await post(lead);
  assert.equal(response.status, 403);
  assert.deepEqual(fake.calls, ["turnstile"]);
});

test("8. an invalid UUID or invalid fields never reach Airtable or Resend", async () => {
  const fake = fakeServices();
  const errorsOf = async (response: Response) =>
    ((await response.json()) as { errors: Record<string, string> }).errors;
  for (const badId of ["", "123", "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b' OR '1'='1"]) {
    const response = await post({ ...lead, submissionId: badId });
    assert.equal(response.status, 400);
    assert.equal((await errorsOf(response)).submissionId, "format");
  }
  const response = await post({ ...lead, firstName: "", email: "ana@gmail.com", privacyAccepted: "true" });
  assert.equal(response.status, 400);
  assert.deepEqual(await errorsOf(response), {
    firstName: "required",
    email: "personal",
    privacyAccepted: "required",
  });
  assert.deepEqual(fake.calls, []);
});

test("9. two simultaneous requests with the same UUID: one email, but Airtable can store two records", async () => {
  const fake = fakeServices({ delayMs: 20 });
  const responses = await Promise.all([post(lead), post(lead)]);
  assert.deepEqual(responses.map((r) => r.status), [200, 200]);
  // Known limitation: Airtable has no unique constraint, both lookups saw no
  // record and both created one. Resend's idempotency key still sends one email.
  assert.equal(fake.records.length, 2);
  assert.equal(fake.emailsSent.length, 1);
  assert.ok(logs.some((line) => line.includes("not resent (concurrent_idempotent_requests)")));

  fake.options.delayMs = 0;
  assert.equal((await post(lead)).status, 200);
  assert.equal(fake.records.length, 2);
  assert.equal(fake.emailsSent.length, 1);
  assert.ok(logs.some((line) => line.includes(`2 records share submission ${submissionId}`)));
});

test("Airtable failure returns 502 and sends no email", async () => {
  const fake = fakeServices({ airtableDown: true });
  const response = await post(lead);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { ok: false });
  assert.deepEqual(fake.calls, ["turnstile", "airtable GET"]);
});

test("browser-supplied privileged values are ignored", async () => {
  const fake = fakeServices();
  await post({ ...lead, Estado: "Ganado", "Estado de notificación": "Enviada", CONTACT_EMAIL: "x@evil.test", to: "x@evil.test" });
  assert.equal(fake.createdFields[0].Estado, "Nuevo");
  assert.equal(fake.createdFields[0]["Estado de notificación"], "Pendiente");
  assert.deepEqual(fake.emailsSent[0].body.to, recipients);
});

test("both recipients get one request; backup is optional and deduplicated", async () => {
  let fake = fakeServices();
  await post(lead);
  assert.equal(fake.resendRequests.length, 1);
  assert.deepEqual(fake.emailsSent[0].body.to, recipients);

  delete process.env.CONTACT_EMAIL_BACKUP;
  fake = fakeServices();
  await post(lead);
  assert.deepEqual(fake.emailsSent[0].body.to, ["contacto@shopitrack.com"]);

  process.env.CONTACT_EMAIL_BACKUP = " Contacto@Shopitrack.com ";
  fake = fakeServices();
  await post(lead);
  assert.deepEqual(fake.emailsSent[0].body.to, ["contacto@shopitrack.com"]);
});

test("request guards: method, content type, size, JSON and configuration", async () => {
  const fake = fakeServices();
  const get = await post(undefined, { method: "GET" });
  assert.equal(get.status, 405);
  assert.equal(get.headers.get("allow"), "POST");
  assert.equal((await post(lead, { contentType: "text/plain" })).status, 415);
  assert.equal((await post({ ...lead, message: "a".repeat(20_000) })).status, 413);
  assert.equal((await post(undefined, { raw: "{bad" })).status, 400);
  delete process.env.RESEND_FROM;
  assert.equal((await post(lead)).status, 500);
  assert.deepEqual(fake.calls, []);
});
