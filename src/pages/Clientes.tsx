import { ArrowRight } from "lucide-react";
import { InfoCard } from "@/components/InfoCard";
import { SectionHeading } from "@/components/SectionHeading";
import { Seo } from "@/components/Seo";
import {
  appFeatureItems,
  appScreens,
  appStoreLinks,
  ctaStoreLinks,
  beforeAfterItems,
  clientSteps,
  clientesImages,
  faqItems,
  heroQuotes,
  stepsFootnote,
  waitingCostItems,
} from "@/data/clientes";
import { seoConfig } from "@/data/seo";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FaqSection } from "@/components/FaqSection";
import { RichText } from "@/components/RichText";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { ImageSlider } from "@/components/ImageSlider";

function StoreLinks({ links }: { links: typeof appStoreLinks }) {
  return links
    .filter(({ href }) => href.trim().length > 0)
    .map(({ text, icon: StoreIcon, href }) => (
      <a
        key={text}
        className="btn btn-outline"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        <StoreIcon />
        {text}
      </a>
    ));
}

export function Clientes() {
  return (
    <>
      <Seo {...seoConfig.clientes} />
      <div id="page-clientes" className="page page-clientes">
        <ErrorBoundary name="Clientes: hero">
          <section
            className="hero wave-section-bottom"
            aria-labelledby="clientes-hero-title"
          >
            <div className="container hero-grid">
              <div className="hero-copy">
                <h1 id="clientes-hero-title">
                  Mi vida no debería detenerse porque espero una entrega.
                </h1>
                <ul className="pain-list pain-list--icons">
                  {heroQuotes.map(({ text, icon: QuoteIcon }) => (
                    <li key={text}>
                      <span className="pain-list-icon" aria-hidden="true">
                        <QuoteIcon />
                      </span>
                      <span>&ldquo;{text}&rdquo;</span>
                    </li>
                  ))}
                </ul>
                <p>
                  Esperar una entrega me condiciona a la conveniencia de quien
                  entrega.
                </p>
                <p>
                  <strong>Y eso no debiera ser lo normal.</strong>
                </p>
                <p className="statement">
                  <strong>Esto debe cambiar.</strong>
                </p>
              </div>
              <div className="hero-art">
                <ImageWithFallback
                  src={clientesImages.hero}
                  srcSet={clientesImages.heroSrcSet}
                  sizes="(max-width: 800px) 100vw, 50vw"
                  alt="Persona asomándose a la ventana mientras espera una entrega"
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

        <ErrorBoundary name="Clientes: split-section">
          <section
            className="hero-bottom split-section section wave-section-bottom"
            data-reveal
          >
            <div className="container">
              <div className="split-grid stretch">
                <div className="split-copy text-content">
                  <SectionHeading eyebrow="" title="Lo que implica esperar" />
                  <ul className="pain-list pain-list--icons">
                    {waitingCostItems.map(({ text, icon: ItemIcon }) => (
                      <li key={text}>
                        <span className="pain-list-icon" aria-hidden="true">
                          <ItemIcon />
                        </span>
                        <span>
                          <RichText text={text} />
                        </span>
                      </li>
                    ))}
                  </ul>
                  <h3>
                    El verdadero costo de una entrega incierta <br />
                    es el tiempo que dejo de vivir.
                  </h3>
                </div>
                <div className="photo-frame">
                  <ImageWithFallback
                    src={clientesImages.waiting}
                    width={1672}
                    height={940}
                    alt="Empresa, operador y cliente conectados durante la coordinación de una entrega"
                    loading="lazy"
                    className="photo-frame-img"
                  />
                </div>
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Clientes: section">
          <section className="adapted-section section" data-reveal>
            <div className="container">
              <div className="clientes-intro-copy split-copy">
                <SectionHeading
                  eyebrow=""
                  title="Una entrega debe adaptarse a mi vida"
                  centered
                />
                <div className="text-content">
                  <p>
                    Durante años hemos adaptado nuestra agenda a la
                    disponibilidad de las empresas que hacen entregas.
                  </p>
                  <p>Shopitrack propone exactamente lo contrario.</p>
                  <h3>Las entregas deben adaptarse a mi vida.</h3>
                  <p>
                    Comprar un producto nunca debería convertirse en una
                    limitación para dejar de vivir el resto de mi día.
                  </p>
                  <h3>La tecnología existe para simplificar la vida.</h3>
                </div>
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Clientes: steps-section">
          <section
            className="steps-section client-steps section wave-section-bottom"
            data-reveal
          >
            <div className="container">
              <SectionHeading
                eyebrow="Así funciona"
                title="Una experiencia simple de principio a fin."
                centered
              />
              <div className="change-grid experience-steps-grid">
                {clientSteps.map((step) => (
                  <InfoCard
                    key={step.label}
                    image={step.image}
                    title={step.label}
                  >
                    {step.text}
                  </InfoCard>
                ))}
              </div>
              <p className="text-copy steps-footnote">{stepsFootnote}</p>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Clientes: section">
          <section className="before-after-section section" data-reveal>
            <div className="container">
              <SectionHeading title="Lo que cambia para ti" centered />
              <ul className="before-after-list">
                {beforeAfterItems.map(
                  ({ before, after, beforeIcon: BeforeIcon, afterIcon: AfterIcon }) => (
                    <li className="before-after-row" key={before}>
                      <div className="before-after-item">
                        <span className="before-after-icon" aria-hidden="true">
                          <BeforeIcon />
                        </span>
                        <p>
                          <span className="before-after-label">Antes</span>
                          {before}
                        </p>
                      </div>
                      <span className="before-after-arrow" aria-hidden="true">
                        <ArrowRight />
                      </span>
                      <div className="before-after-item before-after-item--after">
                        <span className="before-after-icon" aria-hidden="true">
                          <AfterIcon />
                        </span>
                        <p>
                          <span className="before-after-label">Ahora</span>
                          {after}
                        </p>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Clientes: split-section">
          <section
            className="app-demo-section split-section section wave-section-bottom"
            data-reveal
          >
            <div className="container">
              <div className="split-grid stretch">
                <div className="split-copy">
                  <SectionHeading title="La aplicación" />
                  <div className="section-intro">
                    <p className="lead">
                      Desde el momento en que aceptas una fecha hasta el
                      instante en que recibes tu compra:
                    </p>
                    <ul className="app-features-list industry-list">
                      {appFeatureItems.map((item) => (
                        <li key={item}>
                          <RichText text={item} />
                        </li>
                      ))}
                    </ul>
                    <p className="lead">
                      La mejor tecnología es aquella que trabaja para mí.
                    </p>
                    <div className="store-buttons">
                      <StoreLinks links={appStoreLinks} />
                    </div>
                  </div>
                </div>
                <div className="app-demo-slider photo-frame">
                  <ImageSlider
                    slides={appScreens}
                    label="Características de la aplicación"
                    arrows
                    dots
                  />
                </div>
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Clientes: section">
          <FaqSection items={faqItems} />
        </ErrorBoundary>

        <ErrorBoundary name="Clientes: contact-section">
          <section
            className="contact-section section wave-section-bottom"
            data-reveal
          >
            <div className="container contact-grid">
              <div className="text-content">
                <h2>Recupera el control de tu día a día.</h2>
                <p>
                  La próxima vez que una tienda utilice Shopitrack, tendrás una
                  forma mucho más sencilla de coordinar el momento de recibir tu
                  compra.
                </p>
                <h3>La incertidumbre,</h3>
                <h3>YA NO ES parte de la experiencia de compra.</h3>
                <div className="contact-actions store-buttons">
                  <StoreLinks links={ctaStoreLinks} />
                </div>
              </div>
              <div className="photo-frame">
                <ImageWithFallback
                  src={clientesImages.cta}
                  width={1672}
                  height={941}
                  alt="La misma clienta antes, preocupada esperando su pedido, y después, tranquila siguiendo la entrega en su celular"
                  loading="lazy"
                  decoding="async"
                  className="photo-frame-img"
                />
              </div>
            </div>
          </section>
        </ErrorBoundary>
      </div>
    </>
  );
}
