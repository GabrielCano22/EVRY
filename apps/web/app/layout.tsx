import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/manrope';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'EVRY — Rendimiento adaptativo',
  description: 'Entrenamiento adaptativo con seguimiento del ciclo hormonal. Entrena con tu cuerpo.',
};

export const viewport: Viewport = {
  themeColor: '#0a141d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-background text-on-background font-manrope antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
