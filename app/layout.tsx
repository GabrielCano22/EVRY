import type { Metadata, Viewport } from 'next';
import { Abril_Fatface } from 'next/font/google';
import './globals.css';

const abrilFatface = Abril_Fatface({
  weight: '400',
  style: 'normal',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-abril-fatface',
});

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
      <body
        className={`${abrilFatface.variable} abril-fatface-regular bg-background text-on-background font-abril antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
