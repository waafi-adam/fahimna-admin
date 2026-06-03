import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fahimna — Linguistic Corrections',
  description: 'Edit verb conjugations, lemma meanings, noun and pronoun forms.',
};

// Mobile-first: lock the layout to device width so the tool is usable on a
// phone (editing on the commute). theme-color tints the browser chrome dark.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0f1115',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
