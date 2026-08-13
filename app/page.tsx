import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function Inicio() {
  return (
    <main className="min-h-screen bg-background text-on-background flex flex-col">
      <header className="absolute top-0 inset-x-0 z-30 px-lg md:px-xl py-md flex items-center justify-between">
        <Link href="/" className="font-lexend italic font-bold text-xl tracking-tight text-white">
          EVRY
        </Link>
        <nav className="hidden md:flex items-center gap-xl">
          {[
            { etiqueta: 'Entrenamiento', activo: true },
            { etiqueta: 'Ciclo' },
            { etiqueta: 'Ciencia' },
            { etiqueta: 'Comunidad' },
          ].map((item) => (
            <a
              key={item.etiqueta}
              href="#"
              className={`relative font-grotesk text-label-caps tracking-[0.18em] uppercase transition-colors ${
                item.activo ? 'text-primary' : 'text-on-surface-variant hover:text-white'
              }`}
            >
              {item.etiqueta}
              {item.activo && (
                <span className="absolute -bottom-2 inset-x-0 h-0.5 bg-primary rounded-full"></span>
              )}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-md">
          <Link
            href="/login"
            className="hidden md:block font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant hover:text-white transition-colors"
          >
            Ingresar
          </Link>
          <Link href="/register">
            <Button size="sm">Crear cuenta</Button>
          </Link>
        </div>
      </header>

      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(0,122,255,0.28),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(191,90,242,0.22),transparent_30%),linear-gradient(140deg,#0a141d_0%,#101f2c_48%,#0a141d_100%)]" />
          <div className="absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-24 top-24 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60"></div>
        </div>

        <div className="relative z-10 text-center px-container-padding max-w-3xl mx-auto">
          <h1 className="font-lexend font-extrabold text-5xl md:text-display-xl text-white tracking-tight mb-md leading-[0.95]">
            EVOLUCIONA TU{' '}
            <span className="italic font-extrabold text-primary">FUERZA</span>
          </h1>

          <p className="font-lexend text-body-lg text-on-surface-variant max-w-xl mx-auto mb-xl">
            El primer tracker de alto rendimiento que integra entrenamiento de fuerza élite con
            inteligencia hormonal. Domina tu ciclo, supera tus récords.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-md">
            <Link href="/register">
              <Button size="lg" className="min-w-[180px]">
                Empezar
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="min-w-[180px] bg-white/5 backdrop-blur-md"
              >
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 py-xl px-container-padding">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-lexend italic text-body-lg text-on-surface-variant mb-sm">
            "Tu cuerpo no es una máquina, es un ecosistema."
          </p>
          <p className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-white/80">
            Entrena con ciencia, no solo con esfuerzo.
          </p>
        </div>
      </section>

      <section className="px-container-padding md:px-xl py-2xl max-w-6xl mx-auto w-full">
        <div className="text-center mb-xl">
          <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-primary">
            Características
          </span>
          <h2 className="font-lexend font-extrabold text-headline-lg md:text-display-lg text-white mt-sm">
            Diseñado para <span className="italic text-secondary">cualquier</span> cuerpo
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-md">
          {[
            {
              icono: 'cyclone',
              acento: 'text-tertiary',
              fondo: 'bg-tertiary/10',
              borde: 'border-tertiary/30',
              titulo: 'Sensible al ciclo',
              descripcion:
                'Periodización inteligente que se adapta a tu fase hormonal. Folicular para récords, lútea para descarga.',
            },
            {
              icono: 'auto_awesome',
              acento: 'text-primary',
              fondo: 'bg-primary/10',
              borde: 'border-primary/30',
              titulo: 'Adaptativo',
              descripcion:
                'Recomienda peso y repeticiones según tu última sesión, RPE y estado del día.',
            },
            {
              icono: 'speed',
              acento: 'text-secondary',
              fondo: 'bg-secondary/10',
              borde: 'border-secondary/30',
              titulo: 'Registro en un toque',
              descripcion:
                'Registra una serie en menos de 3 segundos. Pensado mobile-first, sin teclado.',
            },
          ].map((f) => (
            <div
              key={f.titulo}
              className="bg-surface-container-low rounded-xl p-lg border border-white/5 relative overflow-hidden"
            >
              <div className={`absolute -right-8 -top-8 w-40 h-40 rounded-full blur-3xl ${f.fondo}`}></div>
              <div className="relative z-10">
                <div
                  className={`inline-flex w-12 h-12 rounded-lg items-center justify-center ${f.fondo} ${f.borde} border mb-md`}
                >
                  <Icon name={f.icono} className={f.acento} size={24} />
                </div>
                <h3 className="font-lexend font-bold text-headline-md text-white mb-sm">
                  {f.titulo}
                </h3>
                <p className="font-lexend text-body-md text-on-surface-variant">{f.descripcion}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-container-padding md:px-xl pb-2xl max-w-6xl mx-auto w-full">
        <div className="bg-gradient-to-br from-primary/20 via-secondary/15 to-tertiary/10 rounded-xl border border-white/10 p-xl md:p-2xl text-center relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-primary/20 blur-3xl"></div>
          <div className="absolute -left-16 -bottom-16 w-72 h-72 rounded-full bg-secondary/20 blur-3xl"></div>
          <div className="relative">
            <h2 className="font-lexend font-extrabold text-headline-lg md:text-display-lg text-white mb-md">
              ¿Lista para <span className="italic text-primary">subir de nivel</span>?
            </h2>
            <p className="font-lexend text-body-lg text-on-surface-variant max-w-xl mx-auto mb-lg">
              Crea tu cuenta gratis. Sin tarjeta. Sin trabas.
            </p>
            <Link href="/register">
              <Button size="lg" className="min-w-[200px]">
                <Icon name="rocket_launch" />
                Empezar gratis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-lg px-container-padding">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-sm">
          <Link href="/" className="font-lexend italic font-bold text-lg text-white">
            EVRY
          </Link>
          <p className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant text-[10px]">
            © {new Date().getFullYear()} EVRY · Rendimiento Élite
          </p>
        </div>
      </footer>
    </main>
  );
}
