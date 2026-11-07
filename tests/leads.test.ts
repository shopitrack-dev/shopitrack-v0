// Tests for api/leads.ts using in-memory fakes. No real service is called.
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
  clientStatus: number;
  internalStatus: number;
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
const internalRecipients = ["contacto@shopitrack.com", "respaldo@example.com"];
const personalData = [
  lead.firstName,
  lead.lastName,
  lead.email,
  lead.phone,
  "Hola",
];

function fakeServices(overrides: Partial<FakeOptions> = {}) {
  const options: FakeOptions = {
    turnstileOk: true,
    airtableDown: false,
    statusUpdateFails: false,
    clientStatus: 200,
    internalStatus: 200,
    delayMs: 0,
    ...overrides,
  };
  const records: FakeRecord[] = [];
  const createdFields: Record<string, unknown>[] = [];
  const resendRequests: {
    key: string;
    body: Record<string, any>;
  }[] = [];
  const emailsSent: typeof resendRequests = [];
  const resendKeys = new Map<string, { payload: string; done: boolean }>();
  const calls: string[] = [];
  let clock = 0;

  const wait = () =>
    new Promise((resolve) => setTimeout(resolve, options.delayMs));
  const reply = (status: number, body: unknown) =>
    Response.json(body, { status });

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
        const matches = records.filter(
          (record) => record.fields["ID de envío"] === id,
        );
        await wait();
        return reply(200, { records: structuredClone(matches) });
      }
      if (method === "POST") {
        await wait();
        const fields = JSON.parse(JSON.stringify(body.records[0].fields));
        createdFields.push(structuredClone(fields));
        const record: FakeRecord = {
          id: `rec${records.length + 1}`,
          createdTime: new Date(
            Date.UTC(2026, 9, 9, 18, 0, clock++),
          ).toISOString(),
          fields,
        };
        records.push(record);
        return reply(200, { records: [structuredClone(record)] });
      }
      if (options.statusUpdateFails) {
        return reply(500, { error: { type: "SERVER_ERROR" } });
      }
      const record = records.find((item) =>
        url.pathname.endsWith(`/${item.id}`),
      );
      if (!record) return reply(404, { error: "NOT_FOUND" });
      Object.assign(record.fields, body.fields);
      return reply(200, structuredClone(record));
    }

    calls.push("resend");
    const key = new Headers(init.headers).get("Idempotency-Key") ?? "";
    const payload = String(init.body);
    const kind = key.startsWith("lead-client/") ? "client" : "internal";
    resendRequests.push({ key, body });

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
    const status =
      kind === "client" ? options.clientStatus : options.internalStatus;
    if (status !== 200) {
      resendKeys.delete(key);
      return reply(status, { name: "application_error" });
    }
    resendKeys.set(key, { payload, done: true });
    emailsSent.push({ key, body });
    return reply(200, { id: `email_${emailsSent.length}` });
  }

  globalThis.fetch = fetchFake as typeof fetch;
  return {
    options,
    records,
    createdFields,
    resendRequests,
    emailsSent,
    calls,
  };
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

function post(
  body: unknown,
  init: { method?: string; contentType?: string; raw?: string } = {},
) {
  const method = init.method ?? "POST";
  return handler.fetch(
    new Request("https://shopitrack.test/api/leads", {
      method,
      headers: {
        "content-type": init.contentType ?? "application/json",
      },
      body: method === "GET" ? undefined : (init.raw ?? JSON.stringify(body)),
    }),
  );
}

const realFetch = globalThis.fetch;
const realConsole = {
  error: console.error,
  warn: console.warn,
  info: console.info,
};
let logs: string[] = [];

beforeEach(() => {
  logs = [];
  for (const level of ["error", "warn", "info"] as const) {
    console[level] = (...args: unknown[]) => {
      logs.push(
        args
          .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
          .join(" "),
      );
    };
  }
  Object.assign(process.env, {
    TURNSTILE_SECRET_KEY: "test-secret",
    AIRTABLE_TOKEN: "test-token",
    AIRTABLE_BASE_ID: "appTEST",
    AIRTABLE_TABLE_NAME: "tblTEST",
    RESEND_API_KEY: "test-resend-key",
    RESEND_FROM: "Shopitrack <notificaciones@example.com>",
    RESEND_TEMPLATE_CLIENT: "correo-de-confirmacin",
    RESEND_TEMPLATE_INTERNAL: "nuevo-prospecto",
    CONTACT_EMAIL: "contacto@shopitrack.com",
    CONTACT_EMAIL_BACKUP: "respaldo@example.com",
  });
});

afterEach(() => {
  Object.assign(console, realConsole);
  globalThis.fetch = realFetch;
  for (const value of personalData) {
    assert.ok(
      !logs.some((line) => line.includes(value)),
      `logs contain "${value}"`,
    );
  }
  assert.ok(
    !logs.some(
      (line) => line.includes("test-token") || line.includes("test-resend-key"),
    ),
  );
});

test("1. creates one lead and sends both published templates", async () => {
  const fake = fakeServices();
  const response = await post(lead);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(fake.records.length, 1);
  assert.equal(fake.createdFields[0]["Estado de notificación"], "Pendiente");
  assert.equal(fake.createdFields[0]["ID de envío"], submissionId);
  assert.equal(fake.records[0].fields["Estado de notificación"], "Enviada");

  assert.equal(fake.emailsSent.length, 2);
  const client = fake.emailsSent.find((mail) =>
    mail.key.startsWith("lead-client/"),
  )!;
  const internal = fake.emailsSent.find((mail) =>
    mail.key.startsWith("lead-internal/"),
  )!;

  assert.equal(client.key, `lead-client/${submissionId}`);
  assert.equal(internal.key, `lead-internal/${submissionId}`);
  assert.deepEqual(client.body.to, [lead.email]);
  assert.equal(client.body.template.id, "correo-de-confirmacin");
  assert.deepEqual(client.body.template.variables, { NOMBRE: "Ana" });

  assert.deepEqual(internal.body.to, internalRecipients);
  assert.equal(internal.body.reply_to, lead.email);
  assert.equal(internal.body.template.id, "nuevo-prospecto");
  assert.deepEqual(internal.body.template.variables, {
    NOMBRE: "Ana",
    APELLIDO: "Pérez",
    EMAIL_CLIENTE: lead.email,
    EMPRESA: lead.company,
    INDUSTRIA: "e-Commerce",
    MENSAJE: lead.message,
    TELEFONO: lead.phone,
  });
  assert.ok(!("html" in client.body));
  assert.ok(!("text" in client.body));
});

test("2. same UUID does not create a second lead or resend completed emails", async () => {
  const fake = fakeServices();
  await post(lead);
  const response = await post({
    ...lead,
    company: "Otra Empresa",
    firstName: "Otro",
  });

  assert.equal(response.status, 200);
  assert.equal(fake.records.length, 1);
  assert.equal(fake.records[0].fields.Empresa, lead.company);
  assert.equal(fake.emailsSent.length, 2);
  assert.equal(fake.resendRequests.length, 2);
});

test("3. a lead marked Enviada is not notified again", async () => {
  const fake = fakeServices();
  fake.records.push(storedRecord("Enviada"));

  const response = await post(lead);
  assert.equal(response.status, 200);
  assert.deepEqual(fake.calls, ["turnstile", "airtable GET"]);
  assert.equal(fake.records.length, 1);
});

test("4. if the client email fails, only the client email is retried", async () => {
  const fake = fakeServices({ clientStatus: 500 });
  await post(lead);

  assert.equal(
    fake.records[0].fields["Estado de notificación"],
    "Error cliente",
  );
  assert.equal(fake.emailsSent.length, 1);
  assert.ok(fake.emailsSent[0].key.startsWith("lead-internal/"));

  fake.options.clientStatus = 200;
  fake.resendRequests.length = 0;
  await post(lead);

  assert.equal(fake.emailsSent.length, 2);
  assert.equal(fake.resendRequests.length, 1);
  assert.ok(fake.resendRequests[0].key.startsWith("lead-client/"));
  assert.equal(fake.records[0].fields["Estado de notificación"], "Enviada");
});

test("5. if the internal email fails, only the internal email is retried", async () => {
  const fake = fakeServices({ internalStatus: 500 });
  await post(lead);

  assert.equal(
    fake.records[0].fields["Estado de notificación"],
    "Error interno",
  );
  assert.equal(fake.emailsSent.length, 1);
  assert.ok(fake.emailsSent[0].key.startsWith("lead-client/"));

  fake.options.internalStatus = 200;
  fake.resendRequests.length = 0;
  await post(lead);

  assert.equal(fake.emailsSent.length, 2);
  assert.equal(fake.resendRequests.length, 1);
  assert.ok(fake.resendRequests[0].key.startsWith("lead-internal/"));
  assert.equal(fake.records[0].fields["Estado de notificación"], "Enviada");
});

test("6. if both emails fail, the status is Error ambos and both are retried", async () => {
  const fake = fakeServices({ clientStatus: 500, internalStatus: 500 });
  await post(lead);

  assert.equal(fake.records[0].fields["Estado de notificación"], "Error ambos");
  assert.equal(fake.emailsSent.length, 0);

  fake.options.clientStatus = 200;
  fake.options.internalStatus = 200;
  fake.resendRequests.length = 0;
  await post(lead);

  assert.equal(fake.emailsSent.length, 2);
  assert.equal(fake.resendRequests.length, 2);
  assert.equal(fake.records[0].fields["Estado de notificación"], "Enviada");
});

test("7. accepted email plus failed Airtable status update is recovered by idempotency", async () => {
  const fake = fakeServices({ statusUpdateFails: true });
  await post(lead);

  assert.equal(fake.emailsSent.length, 2);
  assert.equal(fake.records[0].fields["Estado de notificación"], "Pendiente");

  fake.options.statusUpdateFails = false;
  fake.resendRequests.length = 0;
  await post(lead);

  assert.equal(fake.emailsSent.length, 2);
  assert.equal(fake.resendRequests.length, 2);
  assert.equal(fake.records[0].fields["Estado de notificación"], "Enviada");
});

test("8. invalid Turnstile token writes nothing and sends nothing", async () => {
  const fake = fakeServices({ turnstileOk: false });
  const response = await post(lead);
  assert.equal(response.status, 403);
  assert.deepEqual(fake.calls, ["turnstile"]);
});

test("9. invalid UUID or fields never reach Airtable or Resend", async () => {
  const fake = fakeServices();
  for (const badId of [
    "",
    "123",
    "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b' OR '1'='1",
  ]) {
    const response = await post({ ...lead, submissionId: badId });
    assert.equal(response.status, 400);
  }

  const response = await post({
    ...lead,
    firstName: "",
    email: "ana@gmail.com",
    privacyAccepted: "true",
  });
  assert.equal(response.status, 400);
  assert.deepEqual(fake.calls, []);
});

test("10. two simultaneous requests use independent idempotency keys", async () => {
  const fake = fakeServices({ delayMs: 10 });
  const responses = await Promise.all([post(lead), post(lead)]);

  assert.deepEqual(
    responses.map((response) => response.status),
    [200, 200],
  );
  // Airtable has no unique constraint; concurrent requests can create duplicates.
  assert.equal(fake.records.length, 2);
  assert.equal(
    fake.emailsSent.filter((mail) => mail.key.startsWith("lead-client/"))
      .length,
    1,
  );
  assert.equal(
    fake.emailsSent.filter((mail) => mail.key.startsWith("lead-internal/"))
      .length,
    1,
  );
});

test("11. Unicode content is sent and malformed API keys are not leaked", async () => {
  let fake = fakeServices();
  await post({ ...lead, company: "Ñandú — Logística" });
  const internal = fake.emailsSent.find((mail) =>
    mail.key.startsWith("lead-internal/"),
  )!;
  assert.equal(internal.body.template.variables.EMPRESA, "Ñandú — Logística");

  process.env.RESEND_API_KEY = "re_abcdef—hidden-part";
  fake = fakeServices();
  await post(lead);
  assert.equal(fake.emailsSent.length, 0);
  assert.ok(
    logs.some((line) =>
      line.includes(
        "Resend header Authorization has U+2014 at index 16 (RESEND_API_KEY position 9)",
      ),
    ),
  );
  assert.ok(
    !logs.some(
      (line) => line.includes("hidden-part") || line.includes("re_abcdef"),
    ),
  );
});

test("12. Airtable failure returns 502 and sends no email", async () => {
  const fake = fakeServices({ airtableDown: true });
  const response = await post(lead);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { ok: false });
  assert.deepEqual(fake.calls, ["turnstile", "airtable GET"]);
});

test("13. browser-supplied privileged values are ignored", async () => {
  const fake = fakeServices();
  await post({
    ...lead,
    Estado: "Ganado",
    "Estado de notificación": "Enviada",
    CONTACT_EMAIL: "x@evil.test",
    to: "x@evil.test",
  });
  assert.equal(fake.createdFields[0].Estado, "Nuevo");
  assert.equal(fake.createdFields[0]["Estado de notificación"], "Pendiente");
  assert.deepEqual(
    fake.emailsSent.find((mail) => mail.key.startsWith("lead-internal/"))!.body
      .to,
    internalRecipients,
  );
});

test("14. internal backup recipient is optional and deduplicated", async () => {
  let fake = fakeServices();
  await post(lead);
  let internal = fake.emailsSent.find((mail) =>
    mail.key.startsWith("lead-internal/"),
  )!;
  assert.deepEqual(internal.body.to, internalRecipients);

  delete process.env.CONTACT_EMAIL_BACKUP;
  fake = fakeServices();
  await post(lead);
  internal = fake.emailsSent.find((mail) =>
    mail.key.startsWith("lead-internal/"),
  )!;
  assert.deepEqual(internal.body.to, ["contacto@shopitrack.com"]);

  process.env.CONTACT_EMAIL_BACKUP = " Contacto@Shopitrack.com ";
  fake = fakeServices();
  await post(lead);
  internal = fake.emailsSent.find((mail) =>
    mail.key.startsWith("lead-internal/"),
  )!;
  assert.deepEqual(internal.body.to, ["contacto@shopitrack.com"]);
});

test("15. request guards and missing configuration are enforced", async () => {
  const fake = fakeServices();
  const get = await post(undefined, { method: "GET" });
  assert.equal(get.status, 405);
  assert.equal(get.headers.get("allow"), "POST");
  assert.equal((await post(lead, { contentType: "text/plain" })).status, 415);
  assert.equal(
    (await post({ ...lead, message: "a".repeat(20_000) })).status,
    413,
  );
  assert.equal((await post(undefined, { raw: "{bad" })).status, 400);

  delete process.env.RESEND_TEMPLATE_INTERNAL;
  assert.equal((await post(lead)).status, 500);
  assert.deepEqual(fake.calls, []);
});
