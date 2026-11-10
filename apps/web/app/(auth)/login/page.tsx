import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LoginForm } from './LoginForm';

export default function PaginaIngreso() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-container-padding py-xl">
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
      <div className="relative z-10 w-full max-w-md animate-rise">
        <div className="mb-md flex items-center justify-between">
          <Link
            href="/"
            aria-label="Volver al menú principal"
            className="inline-flex items-center gap-xs rounded-lg px-sm py-xs text-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Icon name="arrow_back" size={18} />
            Volver al menú
          </Link>
          <span className="font-grotesk text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
            Acceso seguro
          </span>
        </div>

        <div className="mb-lg text-center">
          <h1 className="mb-xs font-lexend text-3xl font-bold italic text-white">EVRY</h1>
          <p className="font-grotesk text-label-caps uppercase tracking-[0.18em] text-on-surface-variant">
            Rendimiento Élite
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
