import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const navegacion = [
  { etiqueta: 'Entrenamiento', href: '#entrenamiento' },
  { etiqueta: 'Ciclo', href: '#ciclo' },
  { etiqueta: 'Ciencia', href: '#ciencia' },
  { etiqueta: 'Comunidad', href: '#comunidad' },
];

const beneficios = [
  {
    icono: 'fitness_center',
    acento: 'text-primary',
    fondo: 'bg-primary/10',
    borde: 'border-primary/25',
    titulo: 'Rutinas que sí puedes sostener',
    descripcion: 'Elige ejercicios, equipo y objetivos por serie. Tu plan se adapta a tu forma de entrenar.',
  },
  {
    icono: 'cyclone',
    acento: 'text-tertiary',
    fondo: 'bg-tertiary/10',
    borde: 'border-tertiary/25',
    titulo: 'Entrenamiento sensible al ciclo',
    descripcion: 'Registra tus sensaciones de forma opcional y consulta cada cambio en un calendario claro.',
  },
  {
    icono: 'insights',
    acento: 'text-secondary',
    fondo: 'bg-secondary/10',
    borde: 'border-secondary/25',
    titulo: 'Progreso que se entiende',
    descripcion: 'Volumen, sesiones, marcas y tendencias en un solo lugar, sin depender de hojas de cálculo.',
  },
];

export default function Inicio() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-on-background">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-background/85 px-container-padding py-md backdrop-blur-xl md:px-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-md">
          <Link href="/" aria-label="EVRY, inicio" className="shrink-0 font-lexend text-xl font-bold italic tracking-tight text-white">
            EVRY
          </Link>
          <nav aria-label="Secciones de EVRY" className="order-3 hidden min-w-0 flex-1 items-center justify-center gap-md overflow-x-auto md:order-2 md:flex md:gap-xl">
            {navegacion.map((item, indice) => (
              <a
                key={item.href}
                href={item.href}
                className={`relative whitespace-nowrap rounded-md px-xs py-xs font-grotesk text-label-caps uppercase tracking-[0.14em] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${indice === 0 ? 'text-primary' : 'text-on-surface-variant'}`}
              >
                {item.etiqueta}
              </a>
            ))}
          </nav>
          <div className="order-2 flex items-center gap-sm md:order-3 md:gap-md">
            <Link href="/login" className="hidden rounded-md px-sm py-xs font-grotesk text-label-caps uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:block">
              Ingresar
            </Link>
            <Link href="/register">
              <Button size="sm">Crear cuenta</Button>
            </Link>
          </div>
        </div>
        <nav aria-label="Secciones móviles" className="mx-auto mt-sm flex max-w-6xl gap-xs overflow-x-auto md:hidden">
          {navegacion.map((item) => (
            <a key={item.href} href={item.href} className="whitespace-nowrap rounded-full border border-white/10 px-sm py-xs text-xs text-on-surface-variant transition-colors hover:border-primary/50 hover:text-white">
              {item.etiqueta}
            </a>
          ))}
        </nav>
      </header>

      <section id="entrenamiento" className="relative scroll-mt-24 border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,122,255,0.18),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(191,90,242,0.14),transparent_28%),linear-gradient(140deg,#0a141d_0%,#101e2b_48%,#0a141d_100%)]" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-xl px-container-padding py-2xl md:grid-cols-[1.05fr_.95fr] md:px-xl md:py-2xl">
          <div className="animate-rise">
            <span className="mb-md inline-flex items-center gap-xs rounded-full border border-primary/25 bg-primary/10 px-sm py-xs font-grotesk text-[10px] uppercase tracking-[0.18em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Entrena a tu manera
            </span>
            <h1 className="max-w-3xl font-lexend text-5xl font-extrabold leading-[0.95] tracking-tight text-white md:text-display-xl">
              Evoluciona tu <span className="italic text-primary">fuerza</span> con intención.
            </h1>
            <p className="mt-md max-w-xl font-lexend text-body-lg text-on-surface-variant">
              EVRY reúne tus rutinas, sensaciones y progreso para que cada sesión tenga un propósito. Para todos los cuerpos y todos los ritmos.
            </p>
            <div className="mt-xl flex flex-col items-start gap-sm sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="min-w-[190px]">Crear mi rutina</Button>
              </Link>
              <a href="#ciencia" className="inline-flex min-h-[52px] items-center gap-xs rounded-xl border border-white/10 px-md font-grotesk text-label-caps uppercase tracking-wider text-on-surface-variant transition-colors hover:border-white/25 hover:text-white">
                Cómo funciona <Icon name="arrow_downward" size={18} />
              </a>
            </div>
            <div className="mt-lg flex flex-wrap gap-md text-xs text-on-surface-variant">
              <span className="inline-flex items-center gap-xs"><Icon name="check_circle" className="text-ok" size={16} /> Sin tarjeta</span>
              <span className="inline-flex items-center gap-xs"><Icon name="check_circle" className="text-ok" size={16} /> Datos bajo tu control</span>
              <span className="inline-flex items-center gap-xs"><Icon name="check_circle" className="text-ok" size={16} /> Hecho en español</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md animate-float-soft" aria-label="Vista previa del panel de progreso">
            <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />
            <div className="relative rounded-2xl border border-white/10 bg-surface-container-low/95 p-md shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-md">
                <div>
                  <p className="font-grotesk text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Resumen de hoy</p>
                  <p className="mt-xs font-headline-md text-white">Tu siguiente serie</p>
                </div>
                <span className="rounded-full bg-ok/10 px-sm py-xs text-[10px] text-ok">Listo</span>
              </div>
              <div className="mt-md rounded-xl bg-background/70 p-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-sm"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon name="fitness_center" /></span><span><strong className="block text-sm text-white">Sentadilla</strong><small className="text-xs text-on-surface-variant">Piernas · barra</small></span></div>
                  <Icon name="more_horiz" className="text-on-surface-variant" />
                </div>
                <div className="mt-md grid grid-cols-3 gap-xs text-center">
                  {[['Serie', '3/4'], ['Peso', '72 kg'], ['Reps', '8']].map(([label, value]) => <div key={label} className="rounded-lg bg-surface-container p-sm"><span className="block text-[10px] uppercase tracking-wider text-on-surface-variant">{label}</span><strong className="mt-xs block text-sm text-white">{value}</strong></div>)}
                </div>
              </div>
              <div className="mt-md rounded-xl border border-secondary/20 bg-secondary/5 p-md">
                <div className="flex items-center gap-sm"><Icon name="trending_up" className="text-secondary" /><span className="text-sm text-white">Vas un 8% por encima de tu última sesión</span></div>
                <div className="mt-sm h-1.5 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full w-[72%] rounded-full bg-secondary" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ciclo" className="scroll-mt-24 border-b border-white/5 px-container-padding py-2xl md:px-xl">
        <div className="mx-auto grid max-w-6xl gap-xl md:grid-cols-[.85fr_1.15fr] md:items-center">
          <div>
            <span className="font-grotesk text-label-caps uppercase tracking-[0.18em] text-tertiary">Ciclo opcional</span>
            <h2 className="mt-sm font-lexend text-headline-lg font-extrabold text-white md:text-display-lg">Escucha tu cuerpo. Ajusta el plan.</h2>
            <p className="mt-md max-w-xl text-body-lg text-on-surface-variant">Si quieres registrar tu ciclo, EVRY convierte flujo, síntomas, energía y ánimo en contexto para tus sesiones. Si no lo necesitas, la experiencia de fuerza funciona igual de bien.</p>
            <Link href="/register" className="mt-lg inline-flex items-center gap-xs font-grotesk text-label-caps uppercase tracking-wider text-tertiary hover:text-white">Conocer el registro opcional <Icon name="arrow_forward" size={18} /></Link>
          </div>
          <div className="grid gap-sm sm:grid-cols-3">
            {[['water_drop', 'Registro diario', 'Flujo y síntomas en menos de un minuto'], ['calendar_month', 'Calendario claro', 'Cambios visibles al instante'], ['tune', 'Decisión propia', 'Tú eliges qué compartir y qué no']].map(([icono, titulo, descripcion]) => <div key={titulo} className="rounded-xl border border-tertiary/15 bg-surface-container-low p-md transition-transform duration-200 hover:-translate-y-1"><Icon name={icono} className="text-tertiary" size={24} /><h3 className="mt-md font-headline-md text-white">{titulo}</h3><p className="mt-xs text-sm leading-relaxed text-on-surface-variant">{descripcion}</p></div>)}
          </div>
        </div>
      </section>

      <section id="ciencia" className="scroll-mt-24 border-b border-white/5 px-container-padding py-2xl md:px-xl">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="font-grotesk text-label-caps uppercase tracking-[0.18em] text-primary">Ciencia aplicada</span>
            <h2 className="mt-sm font-lexend text-headline-lg font-extrabold text-white md:text-display-lg">Menos ruido. Mejores decisiones.</h2>
            <p className="mt-md text-body-lg text-on-surface-variant">Tus métricas se calculan con lo que realmente haces: series completadas, carga, repeticiones y constancia.</p>
          </div>
          <div className="mt-xl grid gap-md md:grid-cols-3">
            {beneficios.map((beneficio, indice) => <article key={beneficio.titulo} className="animate-rise rounded-xl border border-white/5 bg-surface-container-low p-lg transition-transform duration-200 hover:-translate-y-1 hover:border-white/15" style={{ animationDelay: `${indice * 90}ms` }}><div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg border ${beneficio.fondo} ${beneficio.borde}`}><Icon name={beneficio.icono} className={beneficio.acento} size={24} /></div><h3 className="mt-md font-headline-md text-white">{beneficio.titulo}</h3><p className="mt-sm leading-relaxed text-on-surface-variant">{beneficio.descripcion}</p></article>)}
          </div>
        </div>
      </section>

      <section id="comunidad" className="scroll-mt-24 px-container-padding py-2xl md:px-xl">
        <div className="mx-auto grid max-w-6xl items-center gap-lg rounded-2xl border border-white/10 bg-surface-container-low p-lg md:grid-cols-[1fr_auto] md:p-xl">
          <div>
            <span className="font-grotesk text-label-caps uppercase tracking-[0.18em] text-secondary">Una comunidad sin ruido</span>
            <h2 className="mt-sm font-lexend text-headline-lg font-extrabold text-white">Tu progreso no necesita compararse.</h2>
            <p className="mt-sm max-w-2xl text-body-md text-on-surface-variant">EVRY está diseñado para que entrenes con autonomía: objetivos propios, lenguaje inclusivo y datos que te ayudan a entenderte mejor.</p>
          </div>
          <Link href="/register"><Button size="lg" className="min-w-[210px]">Crea tu primera rutina</Button></Link>
        </div>
      </section>

      <footer className="border-t border-white/5 px-container-padding py-lg md:px-xl">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-sm md:flex-row">
          <Link href="/" className="font-lexend text-lg font-bold italic text-white">EVRY</Link>
          <p className="font-grotesk text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">© {new Date().getFullYear()} EVRY · Rendimiento Élite</p>
        </div>
      </footer>
    </main>
  );
}
