import assert from "node:assert/strict";
import test from "node:test";
import { leadMaxLength, validateLead, type LeadInput } from "./contactLead.ts";

const valid: LeadInput = {
  firstName: "Ana",
  lastName: "Pérez",
  company: "Empresa Demo",
  role: "",
  email: "ana@empresa-demo.com",
  phone: "",
  industry: "e-Commerce",
  volume: "100–500",
  message: "",
  privacyAccepted: true,
};

test("accepts a complete lead", () => {
  assert.deepEqual(validateLead(valid), {});
});

test("rejects missing required fields and privacy", () => {
  const errors = validateLead({
    ...valid,
    firstName: " ",
    lastName: "",
    company: "",
    email: "",
    privacyAccepted: false,
  });
  assert.deepEqual(errors, {
    firstName: "required",
    lastName: "required",
    company: "required",
    email: "required",
    privacyAccepted: "required",
  });
});

test("rejects malformed and personal emails", () => {
  assert.equal(validateLead({ ...valid, email: "ana@" }).email, "format");
  assert.equal(validateLead({ ...valid, email: "a<b>@empresa.com" }).email, "format");
  assert.equal(validateLead({ ...valid, email: "ana@empresa.com,x" }).email, "format");
  assert.equal(validateLead({ ...valid, email: "ana.o'neil+mx@sub.empresa.com.mx" }).email, undefined);
  assert.equal(validateLead({ ...valid, email: "ana@Gmail.com" }).email, "personal");
});

test("validates optional phone only when present", () => {
  assert.equal(validateLead({ ...valid, phone: "55 1234 5678" }).phone, undefined);
  assert.equal(validateLead({ ...valid, phone: "123" }).phone, "format");
});

test("rejects values outside the select options and over the length limit", () => {
  assert.equal(validateLead({ ...valid, industry: "Hackers" }).industry, "invalidOption");
  assert.equal(validateLead({ ...valid, volume: "1" }).volume, "invalidOption");
  const long = "a".repeat(leadMaxLength.message + 1);
  assert.equal(validateLead({ ...valid, message: long }).message, "tooLong");
});
