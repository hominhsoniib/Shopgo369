import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: '369 Shop — Hệ sinh thái HTX 369',
  description: 'Nền tảng thương mại điện tử của Hệ sinh thái HTX 369',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
