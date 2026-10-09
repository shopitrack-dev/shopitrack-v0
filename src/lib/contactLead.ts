// Shared by the contact form (src/pages/Contacto.tsx) and the serverless
// endpoint (api/leads.ts). Keep it dependency-free: Node imports it directly.

export const industryOptions = [
  "Departamentales / Autoservicio",
  "Muebles y Decoración",
  "Electrodomésticos y Línea Blanca",
  "Hogar (Reparaciones, Instalaciones, Mudanzas)",
  "Servicios de Tecnología (Internet, Telefonía)",
  "e-Commerce",
  "Operador Logístico",
  "Otro",
] as const;

export const volumeOptions = [
  "Menos de 100",
  "100–500",
  "501–2,000",
  "2,001–10,000",
  "Más de 10,000",
] as const;

export const blockedEmailDomains = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "proton.me",
  "protonmail.com",
  "icloud.com",
  "mail.com",
  "mailfence.com",
  "zoho.com",
];

export interface LeadInput {
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  industry: string;
  volume: string;
  message: string;
  privacyAccepted: boolean;
}

type TextField = Exclude<keyof LeadInput, "privacyAccepted">;

export const leadMaxLength: Record<TextField, number> = {
  firstName: 80,
  lastName: 80,
  company: 120,
  role: 80,
  email: 254,
  phone: 30,
  industry: 80,
  volume: 40,
  message: 2000,
};

export type LeadError =
  | "required"
  | "format"
  | "personal"
  | "tooLong"
  | "invalidOption";

export type LeadErrors = Partial<Record<keyof LeadInput, LeadError>>;

const requiredFields: TextField[] = ["firstName", "lastName", "company", "email"];

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "").length;
  return /^\+?[\d\s().-]+$/.test(phone) && digits >= 7 && digits <= 15;
}

function isPersonalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !domain || blockedEmailDomains.includes(domain);
}

export function validateLead(data: LeadInput): LeadErrors {
  const errors: LeadErrors = {};
  for (const field of Object.keys(leadMaxLength) as TextField[]) {
    const value = data[field].trim();
    if (!value && requiredFields.includes(field)) errors[field] = "required";
    else if (value.length > leadMaxLength[field]) errors[field] = "tooLong";
  }

  const email = data.email.trim();
  if (email && !errors.email) {
    // Plain address charset only: the email becomes Resend's reply_to.
    if (!/^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(email)) {
      errors.email = "format";
    }
    else if (isPersonalEmail(email)) errors.email = "personal";
  }

  const phone = data.phone.trim();
  if (phone && !errors.phone && !isValidPhone(phone)) errors.phone = "format";

  const industry = data.industry.trim();
  if (industry && !(industryOptions as readonly string[]).includes(industry)) {
    errors.industry = "invalidOption";
  }
  const volume = data.volume.trim();
  if (volume && !(volumeOptions as readonly string[]).includes(volume)) {
    errors.volume = "invalidOption";
  }

  if (data.privacyAccepted !== true) errors.privacyAccepted = "required";
  return errors;
}
