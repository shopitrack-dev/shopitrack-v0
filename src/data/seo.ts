export interface SeoEntry {
  path: string;
  title: string;
  description: string;
}

export const seoConfig: Record<
  | "home"
  | "empresas"
  | "clientes"
  | "sectores"
  | "contacto"
  | "privacidad"
  | "cookies"
  | "terminos"
  | "notFound",
  SeoEntry
> = {
  home: {
    path: "/",
    title: "Shopitrack | Reduce las entregas fallidas",
    description:
      "Shopitrack coordina empresas y clientes con ventanas de entrega, ETA y seguimiento en tiempo real para reducir las entregas fallidas.",
  },
  empresas: {
    path: "/empresas",
    title: "Empresas | Seguimiento de entregas | Shopitrack",
    description:
      "El software de Shopitrack ayuda a las empresas a reducir entregas fallidas, mejorar la comunicación durante la entrega y dar seguimiento en tiempo real.",
  },
  clientes: {
    path: "/clientes",
    title: "Clientes | Seguimiento de entregas | Shopitrack",
    description:
      "Confirma tu ventana de entrega, conoce tu ETA y mantente en contacto con Shopitrack para recibir tus pedidos de última milla.",
  },
  sectores: {
    path: "/sectores",
    title: "Sectores | Entregas de última milla | Shopitrack",
    description:
      "Descubre cómo Shopitrack mejora la experiencia de entrega en la última milla para retail, muebles, farmacias, tecnología y otros sectores.",
  },
  contacto: {
    path: "/contacto",
    title: "Contacto | Habla con Shopitrack",
    description:
      "Habla con el equipo de Shopitrack y descubre cómo nuestro software para entregas reduce las entregas fallidas y mejora el seguimiento de entregas de tu empresa.",
  },
  privacidad: {
    path: "/aviso-de-privacidad",
    title: "Aviso de privacidad | Shopitrack",
    description:
      "Conoce cómo Shopitrack trata y protege la información personal que recibe a través de su sitio y sus servicios de coordinación de entregas.",
  },
  cookies: {
    path: "/cookies",
    title: "Política de cookies | Shopitrack",
    description:
      "Conoce qué cookies y tecnologías de rastreo utiliza el sitio de Shopitrack, para qué sirven y cómo puedes gestionarlas desde tu navegador.",
  },
  terminos: {
    path: "/terminos-y-condiciones",
    title: "Términos y condiciones | Shopitrack",
    description:
      "Consulta los términos y condiciones de uso del sitio web de Shopitrack, la plataforma que coordina empresas y clientes para reducir entregas fallidas.",
  },
  notFound: {
    path: "",
    title: "Página no encontrada | Shopitrack",
    description:
      "La página que buscas no existe o fue movida. Vuelve al inicio de Shopitrack para conocer nuestra plataforma de seguimiento de entregas.",
  },
};
