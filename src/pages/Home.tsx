import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CircleUserRound,
  UsersRound,
} from "lucide-react";
import { IndustriesShowcase } from "@/components/IndustriesShowcase";
import { InfoCard } from "@/components/InfoCard";
import { LottiePlayer } from "@/components/LottiePlayer";
import { StepsList } from "@/components/StepsList";
import { SectionHeading } from "@/components/SectionHeading";
import { Seo } from "@/components/Seo";
import { images, industryGroups } from "@/data/home";
import { coordinationSteps } from "@/data/empresas";
import { seoConfig } from "@/data/seo";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ImageWithFallback } from "@/components/ImageWithFallback";

export function Home() {
  return (
    <>
      <Seo {...seoConfig.home} />
      <div id="page-home" className="page page-home">
        <ErrorBoundary name="Home: hero">
          <section
            className="hero wave-section-bottom"
            aria-labelledby="hero-title"
          >
            <div className="container hero-grid">
              <div className="hero-copy">
                <h1 id="hero-title">
                  La entrega no falla cuando el repartidor llega tarde. <br />
                  <b className="highlight">Falla mucho antes.</b>
                </h1>
                <p style={{ marginBottom: 4 }}>
                  Cada día miles de entregas dependen <br />
                  de una suposición: <br />
                  Que habrá alguien para recibir.
                </p>
                <p>
                  <b>
                    Cuando esa suposición falla... <br />
                    Todo lo demás también.
                  </b>
                </p>

                <a className="hidden btn btn-primary" href="#como-funciona">
                  Descubre por qué <ArrowRight size={16} />
                </a>
              </div>
              <div className="hero-art">
                <ImageWithFallback
                  src="/images/hero-img.webp"
                  srcSet="/images/hero-img-800.webp 800w, /images/hero-img.webp 1400w"
                  sizes="(max-width: 800px) 100vw, 50vw"
                  alt="Repartidor entregando un paquete"
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

        <ErrorBoundary name="Home: split-section">
          <section
            className="split-section section wave-section wave-section-bottom"
            id="como-funciona"
            data-reveal
          >
            <div className="container">
              <div className="como-funciona-top split-grid stretch">
                <div className="photo-frame photo-frame">
                  <ImageWithFallback
                    src={images.courier}
                    width={1024}
                    height={506}
                    alt="Repartidor caminando con una caja junto a un vehículo"
                    loading="lazy"
                    className="photo-frame-img visible md:invisible"
                  />
                </div>
                <div className="split-copy md:flex md:items-center md:content-center flex-wrap">
                  <h2>
                    La mayoría de las entregas fallidas no se deben a la
                    logística. <br />
                    Se deben a la falta de comunicación.
                  </h2>
                  <p style={{ marginBottom: 4 }}>
                    Vehículos recorriendo kilómetros innecesarios. Clientes
                    esperando todo el día. Empresas reprogramando entregas.
                    Operadores perdiendo tiempo. Call centers saturados.
                    Clientes molestos.
                  </p>
                  <p>Y esto ocurre porque nadie confirmó algo muy sencillo:</p>
                  <p className="highlight">
                    ¿La fecha realmente funciona para ambas partes?
                  </p>
                </div>
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Home: stories">
          <section className="stories section wave-section-bottom" data-reveal>
            <div className="container">
              <SectionHeading title="Dos historias. Un mismo problema." />
              <div className="story-grid">
                <article className="story-card blur-right">
                  <ImageWithFallback
                    src={images.company}
                    width={1200}
                    height={655}
                    alt="Empresa recibiendo una entrega"
                    loading="lazy"
                  />
                  <div className="story-text">
                    <div className="round-icon">
                      <Building2 />
                    </div>
                    <div className="story-copy">
                      <strong>Empresa</strong>
                      <h3>
                        Programó, preparó, <br /> asignó, despachó.
                      </h3>
                      <h3>
                        Cargó la unidad y salió a ruta <br />
                        <span className="inner-highlight ">
                          Pero encontró una puerta cerrada.
                        </span>
                      </h3>
                    </div>
                  </div>
                </article>
                <article className="story-card blur-left story-reverse">
                  <ImageWithFallback
                    src={images.customerAngry}
                    width={1050}
                    height={592}
                    alt="Cliente esperando una entrega en casa"
                    loading="lazy"
                  />
                  <div className="story-text">
                    <div className="round-icon">
                      <CircleUserRound />
                    </div>
                    <div className="story-copy">
                      <strong>Cliente</strong>
                      <h3>
                        Compró. <br />
                        Canceló actividades.
                      </h3>
                      <h3> Nunca supo exactamente cuándo llegaría.</h3>
                    </div>
                  </div>
                </article>
              </div>
              <div className="hidden story-divider">
                <span />
                <b>Dos historias. Una misma causa. La incertidumbre.</b>
                <span />
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Home: cost-section">
          <section className="cost-section wave-section-bottom" data-reveal>
            <div className="container cost-grid split-grid">
              <div className="split-copy cost-text">
                <SectionHeading title="El costo invisible" />
                <p style={{ marginBottom: 6 }}>
                  Una entrega fallida cuesta combustible, horas hombre, desgaste
                  de unidad, y costo de re-proceso. Pero lo más costoso es
                  aquello que no aparece en el P&L.
                </p>
                <p
                  style={{
                    marginBottom: 6,
                    lineHeight: 1.5,
                    marginBlock: 5,
                    fontWeight: 600,
                  }}
                >
                  Una mala entrega puede borrar una excelente experiencia de
                  compra.
                </p>
                <p className="highlight">
                  Porque el cliente no recordará como empezó su compra, sino
                  como terminó.
                </p>
              </div>
              <div className="cost-art photo-frame-blur photo-frame photo-frame--wide">
                <ImageWithFallback
                  src={images.operator}
                  width={1200}
                  height={655}
                  alt="Operadora revisando información de entregas"
                  loading="lazy"
                  className="photo-frame-img visible md:invisible"
                />
                <div className="hidden over-img dashboard-card-image">
                  <LottiePlayer
                    src="/lottie/costo-invisible.json"
                    className="dashboard-card-lottie"
                    ariaLabel="Costos de una entrega fallida en aumento mientras la confianza del cliente cae"
                  />
                </div>
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Home: new-way-section">
          <section
            className="new-way-section mt-0 wave-section-bottom"
            data-reveal
          >
            <div className="container lastmile-grid split-grid split-grid--reverse">
              <div className="split-copy lastmile-text">
                <h2>La nueva forma de entender la última milla.</h2>
                <p style={{ marginBottom: 6 }}>
                  La carrera por la velocidad de entrega llegó a su límite pero
                  empresa y cliente siguen atrapados por la incertidumbre.
                </p>
                <p style={{ marginBottom: 6 }} className="strong">
                  En Shopitrack dimos el siguiente paso: La sincronía.
                </p>
                <p className="highlight">
                  Logramos que empresa y cliente estén listos al mismo tiempo.
                </p>
              </div>
              <div className="lastmile-art photo-frame-blur photo-frame photo-frame--wide">
                <ImageWithFallback
                  src={images.delivery}
                  width={1024}
                  height={559}
                  alt="Cliente y repartidor coordinando la entrega de un paquete"
                  loading="lazy"
                  className="photo-frame-img visible md:invisible"
                />
                <div className="hidden over-img calendar-card">
                  <ImageWithFallback
                    src={images.calendarCard}
                    width={600}
                    height={529}
                    alt="Calendario con la fecha de entrega confirmada"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Home: steps-section">
          <section
            className="steps-section section wave-section-bottom"
            data-reveal
          >
            <div className="container">
              <SectionHeading
                title="Seis pasos. Una mejor experiencia de entrega."
                centered
              />
              <StepsList steps={coordinationSteps} />
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Home: changes">
          <section className="changes section wave-section-bottom" data-reveal>
            <div className="container">
              <SectionHeading title="Lo que cambia" centered />
              <div className="change-grid">
                <InfoCard icon={<Building2 />} title="Para la empresa" label="">
                  <ul className="card-list">
                    <li>Menos entregas fallidas</li>
                    <li>Menos costos operativos</li>
                    <li>Más lealtad de los clientes</li>
                    <li>Más recompra.</li>
                  </ul>
                </InfoCard>
                <InfoCard
                  icon={<CircleUserRound />}
                  title="Para el operador"
                  label=""
                >
                  <ul className="card-list">
                    <li>Menos recorridos inncesarios</li>
                    <li>Menos tiempo ocioso</li>
                    <li>Más entregas en el mismo tiempo</li>
                  </ul>
                </InfoCard>
                <InfoCard
                  icon={<UsersRound />}
                  title="Para el cliente"
                  label=""
                >
                  <ul className="card-list">
                    <li>Mayor certeza</li>
                    <li>Más tranquilidad</li>
                    <li>Más libertad</li>
                    <li>Mejor experiencia de compra</li>
                  </ul>
                </InfoCard>
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Home: trust-section">
          <section className="trust-section section" data-reveal>
            <div className="container trust-grid">
              <div className="photo-frame">
                <ImageWithFallback
                  src={images.trust1}
                  width={1024}
                  height={559}
                  alt="Representante de una empresa y repartidor estrechando la mano en un almacén"
                  loading="lazy"
                  className="photo-frame-img"
                />
              </div>
              <div className="trust-text text-center">
                <h2>Confianza</h2>
                <p style={{ marginBottom: 6 }}>
                  Las empresas entregan productos.
                  <br />
                  Pero realmente cumplen promesas.
                </p>
                <p className="strong">
                  Shopitrack hace que las promesas se cumplan.
                </p>
              </div>
              <div className="photo-frame">
                <ImageWithFallback
                  src={images.trust2}
                  width={1024}
                  height={559}
                  alt="Repartidor entregando un paquete a un cliente en su domicilio"
                  loading="lazy"
                  className="photo-frame-img"
                />
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Home: industries">
          <section
            className="industries section wave-section-bottom"
            id="industrias"
            data-reveal
          >
            <div className="container industry-grid">
              <div>
                <h2>
                  Una plataforma para cualquier empresa que acuda a domicilio.
                </h2>
                <div className="industry-groups">
                  {industryGroups.map((group) => (
                    <div key={group.title}>
                      <h3 className="sr-only">{group.title}</h3>
                      <ul className={`industry-list ${group.className}`}>
                        {group.items.map((industry) => (
                          <li key={industry}>{industry}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <p>
                  Cada sector comparte exactamente el mismo reto. Coordinar
                  personas.
                </p>
                <Link className="btn btn-primary" to="/sectores">
                  Explorar sectores <ArrowRight size={16} />
                </Link>
              </div>
              <IndustriesShowcase />
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary name="Home: contact-section">
          <section
            className="contact-section section wave-section-bottom"
            id="contacto"
            data-reveal
          >
            <div className="container text-center">
              <div className="text-container">
                <h2>
                  Transforma cada entrega en una mejor experiencia para todos.
                </h2>
                <p>
                  Conoce cómo transformar la entrega en una experiencia
                  <br />
                  que fortalezca la confianza de tus clientes.
                </p>
                <div className="contact-actions">
                  <Link className="btn btn-coral" to="/contacto">
                    Agenda una demostración <ArrowRight size={15} />
                  </Link>
                  <a className="hidden btn btn-outline" href="#como-funciona">
                    Explora cómo funciona Shopitrack
                  </a>
                </div>
              </div>
            </div>
          </section>
        </ErrorBoundary>
      </div>
    </>
  );
}
