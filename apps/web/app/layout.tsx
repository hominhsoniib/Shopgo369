import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Lora } from 'next/font/google';
import '../styles/globals.css';
import Header from '../components/Header';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600'],
  variable: '--font-lora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '369 Shop — Hệ sinh thái HTX 369',
  description: 'Nền tảng thương mại điện tử của Hệ sinh thái HTX 369',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-800 antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
