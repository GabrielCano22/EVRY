'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAutenticacion } from '@/lib/auth-store';
import { Icon } from './ui/Icon';
import { cn } from '@/lib/utils';

const itemsNavegacion = [
  { href: '/dashboard', etiqueta: 'Inicio', icono: 'dashboard' },
  { href: '/workout', etiqueta: 'Entrena', icono: 'fitness_center' },
  { href: '/progress', etiqueta: 'Progreso', icono: 'monitoring' },
  { href: '/cycle', etiqueta: 'Ciclo', icono: 'cyclone', soloCiclo: true },
  { href: '/profile', etiqueta: 'Perfil', icono: 'settings' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { usuario } = useAutenticacion();
  const pathname = usePathname();
  const items = itemsNavegacion.filter((it) => !it.soloCiclo || usuario?.trackCycle);

  return (
    <div className="h-screen flex overflow-hidden bg-background text-on-background">
      {/* Sidebar - escritorio */}
      <nav className="hidden md:flex fixed left-0 top-0 h-screen flex-col py-xl w-64 border-r bg-surface-container-lowest border-white/10 z-40">
        <div className="px-lg mb-xl">
          <h1 className="font-lexend italic font-bold text-2xl text-white tracking-tight">EVRY</h1>
          <p className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-on-surface-variant mt-xs">
            Rendimiento Élite
          </p>
        </div>
        <ul className="flex flex-col space-y-sm flex-1 px-sm">
          {items.map((it) => {
            const activo = pathname.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={cn(
                    'flex items-center gap-md px-md py-sm rounded-lg transition-all duration-150 active:scale-[0.98]',
                    activo
                      ? 'bg-primary/10 text-primary border-l-4 border-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                  )}
                >
                  <Icon name={it.icono} fill={activo} />
                  <span className="font-lexend font-medium text-sm">{it.etiqueta}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="px-lg mt-auto">
          <Link href="/profile" className="flex items-center gap-sm hover:opacity-80 transition">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-white/10 flex items-center justify-center">
              <Icon name="person" className="text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-grotesk text-label-caps tracking-wider text-on-surface truncate">
                {usuario?.name ?? 'Atleta'}
              </span>
              <span className="text-[10px] text-on-surface-variant">
                {usuario?.trackCycle ? 'Ciclo activo' : 'Tier élite'}
              </span>
            </div>
          </Link>
        </div>
      </nav>

      {/* Topbar - móvil */}
      <header className="md:hidden flex justify-between items-center h-16 px-lg w-full fixed top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <Link href="/dashboard" className="font-lexend italic font-bold text-xl text-white">
          EVRY
        </Link>
        <Link
          href="/profile"
          className="w-8 h-8 rounded-full bg-primary/20 border border-white/20 flex items-center justify-center"
        >
          <Icon name="person" size={18} className="text-primary" />
        </Link>
      </header>

      {/* Bottom nav - móvil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/90 backdrop-blur-lg border-t border-white/10">
        <ul className="grid grid-cols-5">
          {items.map((it) => {
            const activo = pathname.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={cn(
                    'flex flex-col items-center gap-unit py-sm transition-colors',
                    activo ? 'text-primary' : 'text-on-surface-variant',
                  )}
                >
                  <Icon name={it.icono} fill={activo} size={22} />
                  <span className="text-[10px] font-grotesk tracking-wider">{it.etiqueta}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Contenido */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 overflow-y-auto px-container-padding md:px-xl pb-24 md:pb-xl">
        <div className="max-w-6xl mx-auto py-lg">{children}</div>
      </main>
    </div>
  );
}
