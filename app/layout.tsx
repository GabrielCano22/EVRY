import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EVRY — Elite Performance',
  description: 'Fitness adaptativo con seguimiento del ciclo hormonal. Entrena con tu cuerpo.',
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
      <body className="bg-background text-on-background font-lexend antialiased">{children}</body>
    </html>
  );
}
