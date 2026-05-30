import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BuilderPulse',
  description: 'AI activity graph for builders',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d1117] text-gray-100 font-sans">{children}</body>
    </html>
  );
}
