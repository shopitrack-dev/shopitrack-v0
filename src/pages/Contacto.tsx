import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";
import { InfoCard } from "@/components/InfoCard";
import { SectionHeading } from "@/components/SectionHeading";
import { Seo } from "@/components/Seo";
import {
  contactSteps,
  contactoImages,
  faqItems,
  formCopy,
  operationContextItems,
} from "@/data/contacto";
import {
  industryOptions,
  leadMaxLength,
  validateLead,
  volumeOptions,
  type LeadError,
  type LeadInput,
} from "@/lib/contactLead";
import { seoConfig } from "@/data/seo";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FaqSection } from "@/components/FaqSection";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Turnstile } from "@/components/Turnstile";

type ContactFormData = LeadInput;

const emptyForm: ContactFormData = {
  firstName: "",
  lastName: "",
  company: "",
  role: "",
  email: "",
  phone: "",
  industry: "",
  volume: "",
  message: "",
  privacyAccepted: false,
};

const turnstileSiteKey: string =
  import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || "";

type FormErrors = Partial<Record<keyof ContactFormData, string>>;

const errorMessages: Partial<
  Record<keyof ContactFormData, Partial<Record<LeadError, string>>>
> = {
  firstName: { required: formCopy.errorFirstName },
  lastName: { required: formCopy.errorLastName },
  company: { required: formCopy.errorCompany },
  email: {
    required: formCopy.errorEmailRequired,
    format: formCopy.errorEmailFormat,
    personal: formCopy.errorEmail,
  },
  phone: { format: formCopy.errorPhone },
  privacyAccepted: { required: formCopy.errorPrivacy },
};

function validate(data: ContactFormData): FormErrors {
  const errors: FormErrors = {};
  const entries = Object.entries(validateLead(data)) as [
    keyof ContactFormData,
    LeadError,
  ][];
  for (const [field, code] of entries) {
    errors[field] = errorMessages[field]?.[code] ?? formCopy.errorSystem;
  }
  return errors;
}

async function submitContactRequest(
  data: ContactFormData,
  turnstileToken: string,
  submissionId: string,
): Promise<void> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, turnstileToken, submissionId }),
  });
  if (!response.ok) throw new Error(`Lead request failed: ${response.status}`);
}

// The control is rendered before its <label> so CSS sibling selectors can float
// the label when the field has focus, a value or browser autofill. Controls
// need placeholder=" " for :placeholder-shown to detect an empty field.
function FormField({
  id,
  label,
  required,
  error,
  hint,
  full,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`form-field${full ? " form-field--full" : ""}`}>
      <div className="form-control">
        {children}
        <label htmlFor={id}>
          {label}
          {required && (
            <span className="required-mark" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
      </div>
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="field-error" id={id}>
      <AlertCircle size={14} aria-hidden="true" />
      {children}
    </p>
  );
}

export function Contacto() {
  const formBaseId = useId();
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);
  const successTitleRef = useRef<HTMLHeadingElement>(null);
  const focusFirstError = useRef(false);
  // State updates land after the event, so a second click in the same frame
  // would still see "idle"; the ref blocks it synchronously.
  const submittingRef = useRef(false);
  // One ID per submission: retries of the same data reuse it so the server can
  // recognise them; editing the form starts a new submission.
  const submissionIdRef = useRef("");

  const fieldId = (name: keyof ContactFormData) => `${formBaseId}-${name}`;
  const describedBy = (name: keyof ContactFormData, hasHint?: boolean) =>
    [
      hasHint && fieldId(name) + "-hint",
      errors[name] && fieldId(name) + "-error",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  // Focus runs after render so the field is announced with its error message.
  useEffect(() => {
    if (!focusFirstError.current) return;
    focusFirstError.current = false;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [errors]);

  useEffect(() => {
    if (status !== "success") return;
    window.scrollTo({ top: 0 });
    successTitleRef.current?.focus();
  }, [status]);

  function updateField<K extends keyof ContactFormData>(
    name: K,
    value: ContactFormData[K],
  ) {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    submissionIdRef.current = "";
  }

  function handleTextChange(name: keyof ContactFormData) {
    return (
      e: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => updateField(name, e.target.value as ContactFormData[typeof name]);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return;
    // Honeypot filled: fake success so the bot gets no signal to adapt.
    if (new FormData(e.currentTarget).get("website")) {
      setStatus("success");
      return;
    }
    const validationErrors = validate(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      focusFirstError.current = true;
      return;
    }

    if (!turnstileToken) {
      setStatus("error");
      return;
    }

    submittingRef.current = true;
    submissionIdRef.current ||= crypto.randomUUID();
    setStatus("submitting");
    try {
      await submitContactRequest(
        formData,
        turnstileToken,
        submissionIdRef.current,
      );
      setStatus("success");
    } catch {
      setStatus("error");
      // The server already spent this token; remount the widget for a new one.
      setTurnstileToken("");
      setTurnstileKey((key) => key + 1);
    } finally {
      submittingRef.current = false;
    }
  }

  if (status === "success") {
    return (
      <>
        <Seo {...seoConfig.contacto} />
        <div id="page-contacto" className="page page-contacto">
          <section
            className="hero section"
            aria-labelledby="contacto-success-title"
          ></section>
          <section className="section-form-success">
            <div className="container form-success">
              <h1
                id="contacto-success-title"
                ref={successTitleRef}
                tabIndex={-1}
              >
                {formCopy.successTitle}
              </h1>
              <p>{formCopy.successBody}</p>
              <Link className="btn btn-primary" to="/">
                {formCopy.successCta} <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo {...seoConfig.contacto} />
      <div id="page-contacto" className="page page-contacto">
        <ErrorBoundary name="Contacto: hero">
          <section
            className="hero wave-section-bottom"
            aria-labelledby="contacto-hero-title"
          >
            <div className="container hero-grid">
              <div className="hero-copy">
                <span className="sr-only eyebrow">Contacto</span>
                <h1 id="contacto-hero-title">
                  Hablemos sobre cómo hacer que cada entrega fortalezca tu
                  marca.
                </h1>
                <p>
                  Cada empresa enfrenta desafíos distintos. Por eso preferimos
                  comprender primero tu operación antes de hablar de soluciones.
                </p>
                <a className="btn btn-primary" href="#formulario-contacto">
                  Agenda una conversación con nuestro equipo{" "}
                  <ArrowRight size={16} />
                </a>
              </div>
              <div className="hero-art">
                <ImageWithFallback
                  src={contactoImages.hero}
                  srcSet={contactoImages.heroSrcSet}
                  sizes="(max-width: 800px) 100vw, 50vw"
                  alt="Especialista de soporte de Shopitrack atendiendo una llamada"
                  width={1400}
                  height={782}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="photo-frame-img visible md:invisible"
                />
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Contacto: split-section">
          <section
            className="hero-bottom split-section section wave-section-bottom"
            data-reveal
          >
            <div className="container">
              <SectionHeading
                eyebrow="Hablemos de tu operación"
                title="Queremos conocer tu operación"
                centered
              />
              <p className="text-copy">
                Antes de vender una solución debemos comprender el problema.{" "}
                <br />
                Por ello, durante la conversación nos interesará conocer
                aspectos como:
              </p>
              <div className="my-6 change-grid contact-context-grid">
                {operationContextItems.map(({ text, icon: ItemIcon }) => (
                  <InfoCard key={text} icon={<ItemIcon />} title={text} />
                ))}
              </div>
              <p
                className="text-copy"
                style={{
                  marginTop: "16px",
                  marginBottom: "0",
                  fontSize: "1.2rem",
                  fontWeight: "500",
                  color: "white",
                }}
              >
                Buscamos comprender el contexto.
              </p>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Contacto: changes">
          <section className="changes section" data-reveal>
            <div className="container">
              <SectionHeading
                eyebrow="Qué ocurrirá cuando nos contactes"
                title="¿Qué ocurrirá cuando nos contactes?"
                centered
              />
              <div className="change-grid experience-steps-grid">
                {contactSteps.map((step) => (
                  <InfoCard
                    key={step.label}
                    image={step.image}
                    title={step.label}
                  >
                    {step.text}
                  </InfoCard>
                ))}
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Contacto: section">
          <section
            className="section contact-form-section"
            id="formulario-contacto"
            data-reveal
          >
            <div className="container">
              <SectionHeading
                eyebrow="Formulario"
                title="Solicita una demostración"
                centered
              />
              <p className="text-copy contact-form-intro">
                Cuéntanos un poco sobre tu operación. Uno de nuestros
                especialistas se pondrá en contacto contigo.
              </p>

              <form
                className="contact-form"
                ref={formRef}
                onSubmit={handleSubmit}
                noValidate
                aria-busy={status === "submitting"}
              >
                <p className="form-required-note">{formCopy.requiredNote}</p>
                <div className="contact-form-grid">
                  <FormField
                    id={fieldId("firstName")}
                    label="Nombre"
                    required
                    error={errors.firstName}
                  >
                    <input
                      id={fieldId("firstName")}
                      name="firstName"
                      maxLength={leadMaxLength.firstName}
                      type="text"
                      autoComplete="given-name"
                      required
                      value={formData.firstName}
                      onChange={handleTextChange("firstName")}
                      placeholder=" "
                      aria-invalid={!!errors.firstName}
                      aria-describedby={describedBy("firstName")}
                    />
                  </FormField>

                  <FormField
                    id={fieldId("lastName")}
                    label="Apellidos"
                    required
                    error={errors.lastName}
                  >
                    <input
                      id={fieldId("lastName")}
                      name="lastName"
                      maxLength={leadMaxLength.lastName}
                      type="text"
                      autoComplete="family-name"
                      required
                      value={formData.lastName}
                      onChange={handleTextChange("lastName")}
                      placeholder=" "
                      aria-invalid={!!errors.lastName}
                      aria-describedby={describedBy("lastName")}
                    />
                  </FormField>

                  <FormField
                    id={fieldId("company")}
                    label="Empresa"
                    required
                    error={errors.company}
                  >
                    <input
                      id={fieldId("company")}
                      name="company"
                      maxLength={leadMaxLength.company}
                      type="text"
                      autoComplete="organization"
                      required
                      value={formData.company}
                      onChange={handleTextChange("company")}
                      placeholder=" "
                      aria-invalid={!!errors.company}
                      aria-describedby={describedBy("company")}
                    />
                  </FormField>

                  <FormField
                    id={fieldId("role")}
                    label="Cargo"
                    error={errors.role}
                  >
                    <input
                      id={fieldId("role")}
                      name="role"
                      maxLength={leadMaxLength.role}
                      type="text"
                      autoComplete="organization-title"
                      value={formData.role}
                      onChange={handleTextChange("role")}
                      placeholder=" "
                      aria-invalid={!!errors.role}
                      aria-describedby={describedBy("role")}
                    />
                  </FormField>

                  <FormField
                    id={fieldId("email")}
                    label="Correo electrónico"
                    required
                    error={errors.email}
                    hint={formCopy.helperEmail}
                  >
                    <input
                      id={fieldId("email")}
                      name="email"
                      maxLength={leadMaxLength.email}
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleTextChange("email")}
                      placeholder=" "
                      aria-invalid={!!errors.email}
                      aria-describedby={describedBy("email", true)}
                    />
                  </FormField>

                  <FormField
                    id={fieldId("phone")}
                    label="Teléfono"
                    error={errors.phone}
                    hint={formCopy.helperPhone}
                  >
                    <input
                      id={fieldId("phone")}
                      name="phone"
                      maxLength={leadMaxLength.phone}
                      type="tel"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={handleTextChange("phone")}
                      placeholder=" "
                      aria-invalid={!!errors.phone}
                      aria-describedby={describedBy("phone")}
                    />
                  </FormField>

                  <FormField
                    id={fieldId("industry")}
                    label="Sector"
                    error={errors.industry}
                  >
                    <select
                      id={fieldId("industry")}
                      name="industry"
                      value={formData.industry}
                      onChange={handleTextChange("industry")}
                      className={formData.industry ? undefined : "is-empty"}
                      aria-invalid={!!errors.industry}
                      aria-describedby={describedBy("industry")}
                    >
                      <option value="">Selecciona una opción</option>
                      {industryOptions.map((option) => (
                        <option value={option} key={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    id={fieldId("volume")}
                    label="Número aproximado de entregas mensuales"
                    error={errors.volume}
                  >
                    <select
                      id={fieldId("volume")}
                      name="volume"
                      value={formData.volume}
                      onChange={handleTextChange("volume")}
                      className={formData.volume ? undefined : "is-empty"}
                      aria-invalid={!!errors.volume}
                      aria-describedby={describedBy("volume")}
                    >
                      <option value="">Selecciona una opción</option>
                      {volumeOptions.map((option) => (
                        <option value={option} key={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    id={fieldId("message")}
                    label="Mensaje"
                    error={errors.message}
                    full
                  >
                    <textarea
                      id={fieldId("message")}
                      name="message"
                      maxLength={leadMaxLength.message}
                      rows={4}
                      value={formData.message}
                      onChange={handleTextChange("message")}
                      placeholder=" "
                      aria-invalid={!!errors.message}
                      aria-describedby={describedBy("message")}
                    />
                  </FormField>
                </div>

                <div className="form-honeypot" aria-hidden="true">
                  <label htmlFor={`${formBaseId}-website`}>Sitio web</label>
                  <input
                    id={`${formBaseId}-website`}
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="form-privacy">
                  <input
                    id={fieldId("privacyAccepted")}
                    name="privacyAccepted"
                    type="checkbox"
                    required
                    checked={formData.privacyAccepted}
                    onChange={(e) =>
                      updateField("privacyAccepted", e.target.checked)
                    }
                    aria-invalid={!!errors.privacyAccepted}
                    aria-describedby={describedBy("privacyAccepted")}
                  />
                  <label htmlFor={fieldId("privacyAccepted")}>
                    {formCopy.privacyLabelBefore}
                    <Link
                      to="/aviso-de-privacidad"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {formCopy.privacyLinkLabel}
                      <ExternalLink size={12} aria-hidden="true" />
                      <span className="sr-only"> {formCopy.newTabNotice}</span>
                    </Link>
                    {formCopy.privacyLabelAfter}
                    <span className="required-mark" aria-hidden="true">
                      {"\u00a0*"}
                    </span>
                  </label>
                </div>
                {errors.privacyAccepted && (
                  <FieldError id={`${fieldId("privacyAccepted")}-error`}>
                    {errors.privacyAccepted}
                  </FieldError>
                )}

                <Turnstile
                  key={turnstileKey}
                  siteKey={turnstileSiteKey}
                  action="contact"
                  onToken={setTurnstileToken}
                />

                <p className="sr-only" role="status">
                  {status === "submitting" ? formCopy.submitLoadingLabel : ""}
                </p>

                {status === "error" && (
                  <p className="form-system-error" role="alert">
                    <AlertCircle size={18} aria-hidden="true" />
                    {formCopy.errorSystem}
                  </p>
                )}

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" && (
                    <LoaderCircle
                      className="btn-spinner"
                      size={18}
                      aria-hidden="true"
                    />
                  )}
                  {status === "submitting"
                    ? formCopy.submitLoadingLabel
                    : formCopy.submitLabel}
                </button>
              </form>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Contacto: section">
          <FaqSection items={faqItems} />
        </ErrorBoundary>

        <ErrorBoundary name="Contacto: section">
          <section className="section closing-section" data-reveal>
            <div className="container closing-copy">
              <p>
                Queremos que tu empresa se sume a la exigencia actual de las
                entregas.
              </p>
              <p className="strong">
                Porque las mejores relaciones comerciales
                <br />
                comienzan cuando las promesas se cumplen.
              </p>
              <p className="strong" style={{ fontSize: "1.25rem" }}>
                Y cada entrega es la oportunidad para demostrarlo.
              </p>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Contacto: contact-section">
          <section
            className="contact-section section wave-section-bottom"
            data-reveal
          >
            <div className="container">
              <SectionHeading
                eyebrow="CTA final"
                title="Comencemos la conversación."
                centered
              />
              <p className="contact-cta-copy">
                Descubre cómo una mejor comunicación puede transformar la forma
                en que tus clientes viven la última etapa de una compra.
              </p>
              <div className="contact-actions">
                <a className="btn btn-coral" href="#formulario-contacto">
                  Agenda una demostración personalizada <ArrowRight size={15} />
                </a>
                <a
                  className="hidden btn btn-outline"
                  href="#formulario-contacto"
                >
                  Habla con un especialista
                </a>
              </div>
            </div>
          </section>
        </ErrorBoundary>
      </div>
    </>
  );
}
