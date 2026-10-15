import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../src/styles.css';

export const metadata: Metadata = {
  title: 'Veilo',
  description: 'A second look before you share with AI. Veilo checks prompts and supported uploads locally, so you can choose what to keep private.',
  icons: { icon: '/veilo-mark.svg' },
  openGraph: { title: 'Veilo', description: 'Share your ideas. Keep your details. Local privacy checks for your everyday AI chats.' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f3ebdb' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><head><link rel="preload" href="/fonts/InterVariable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" /></head><body>{children}</body></html>;
}
