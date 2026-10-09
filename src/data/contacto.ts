import { BarChart3, Goal, MapPin, Package, Route, Target } from "lucide-react";
import type { FaqItem, IconItem, ImageSource } from "@/data/types";

export const contactoImages = {
  hero: "/images/hero-contacto.webp",
  heroSrcSet:
    "/images/hero-contacto-800.webp 800w, /images/hero-contacto.webp 1672w",
};

export const contactSteps: {
  label: string;
  text: string;
  image: ImageSource;
}[] = [
  {
    label: "Paso 1",
    text: "Agendamos una cita.",
    image: {
      src: "/images/contacto-paso-1.webp",
      alt: "Asesora de Shopitrack agenda una cita con un cliente frente a un calendario",
    },
  },
  {
    label: "Paso 2",
    text: "Conocemos tu operación. Comprendemos tus retos.",
    image: {
      src: "/images/contacto-paso-2.webp",
      alt: "Asesora revisa con un cliente las rutas y métricas de su operación",
    },
  },
  {
    label: "Paso 3",
    text: "Analizamos cómo coordinas actualmente tus entregas.",
    image: {
      src: "/images/contacto-paso-3.webp",
      alt: "Asesora analiza en pantalla el recorrido actual de las entregas del cliente",
    },
  },
  {
    label: "Paso 4",
    text: "Agendamos una reunión para mostrarte los beneficios a lograr y cómo integrar Shopitrack a tu operación.",
    image: {
      src: "/images/contacto-paso-4.webp",
      alt: "Asesora presenta al cliente los beneficios de integrar Shopitrack",
    },
  },
  {
    label: "Paso 5",
    text: "Agendamos una sesión de pruebas en ambiente controlado con todo tu equipo.",
    image: {
      src: "/images/contacto-paso-5.webp",
      alt: "Sesión de pruebas de Shopitrack con todo el equipo del cliente",
    },
  },
  {
    label: "Paso 6",
    text: "Definimos integración a tu operación. Sin desarrollos. Sin cambios en otros sistemas o aplicaciones.",
    image: {
      src: "/images/contacto-paso-6.webp",
      alt: "Asesora muestra cómo Shopitrack se conecta con los sistemas existentes del cliente",
    },
  },
];

export const operationContextItems: IconItem[] = [
  { text: "Tipo de productos.", icon: Package },
  { text: "Número aproximado de entregas.", icon: BarChart3 },
  { text: "Modelo logístico.", icon: Route },
  { text: "Cobertura.", icon: MapPin },
  { text: "Retos principales.", icon: Target },
  { text: "Objetivos.", icon: Goal },
];

export const formCopy = {
  helperEmail: "Utiliza tu correo corporativo.",
  helperPhone: "Si nos compartes tu número te contactaremos por WhatsApp. ",
  privacyLabelBefore: "He leído y acepto el ",
  privacyLinkLabel: "Aviso de Privacidad",
  privacyLabelAfter: ".",
  newTabNotice: "(se abre en una pestaña nueva)",
  submitLabel: "Agendar conversación.",
  submitLoadingLabel: "Enviando...",
  requiredNote: "Los campos marcados con * son obligatorios.",
  errorFirstName: "Ingresa tu nombre.",
  errorLastName: "Ingresa tus apellidos.",
  errorCompany: "Ingresa el nombre de tu empresa.",
  errorEmailRequired: "Ingresa tu correo electrónico.",
  errorEmailFormat: "Ingresa un correo válido, por ejemplo nombre@empresa.com.",
  errorEmail:
    "Ingresa un correo corporativo válido. No aceptamos correos personales como Gmail u Outlook.",
  errorPhone:
    "Ingresa un teléfono válido: de 7 a 15 dígitos; puedes usar espacios, guiones o +.",
  errorPrivacy: "Acepta el Aviso de Privacidad para continuar.",
  errorSystem: "No pudimos enviar tu solicitud. Inténtalo nuevamente.",
  successTitle: "¡Gracias por contactarnos!",
  successBody:
    "Hemos recibido tu solicitud. Un especialista de Shopitrack se pondrá en contacto contigo lo antes posible.",
  successCta: "Volver al Inicio",
};

export const faqItems: FaqItem[] = [
  {
    question: "¿La demostración tiene costo?",
    answer:
      "No. La conversación y la demostración son completamente gratuitas.",
  },
  {
    question: "¿Cuánto dura?",
    answer:
      "Entre 45 y 60 minutos, dependiendo de la complejidad de la operación.",
  },
  {
    question: "¿Necesitamos instalar algo?",
    answer: "No. La demostración se realiza en nuestros equipos en vivo.",
  },
  {
    question: "¿Puede participar más de una persona?",
    answer:
      "Sí. De hecho recomendamos involucrar a quienes participan en la experiencia de entrega, operaciones, logística, eCommerce y servicio al cliente y TI.",
  },
  {
    question: "¿Shopitrack puede adaptarse a mi operación?",
    answer:
      "Sí. La plataforma está diseñada para adaptarse a diferentes industrias y modelos de entrega.",
  },
  {
    question: "¿Qué sucede después?",
    answer:
      "Si Shopitrack representa una buena oportunidad para tu empresa, construiremos juntos la propuesta de implementación.",
  },
  {
    question: "¿Puedo solicitar una segunda demostración con mi equipo?",
    answer:
      "Sí. Podemos organizar sesiones adicionales para los distintos equipos involucrados.",
  },
];
