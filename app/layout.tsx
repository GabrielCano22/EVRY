import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'EVRY — Rendimiento adaptativo',
  description: 'Entrenamiento adaptativo con seguimiento del ciclo hormonal. Entrena con tu cuerpo.',
};

export const viewport: Viewport = {
  themeColor: '#0a141d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${manrope.variable} bg-background text-on-background font-manrope antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
