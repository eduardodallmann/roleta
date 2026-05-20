import type { PropsWithChildren } from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

import { Analytics } from '@vercel/analytics/next';

import CoffeeTipQr from '~/components/coffee-tip-qr';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Roleta',
  description: 'Uma roleta melhor',
};

export default function RootLayout({ children }: Readonly<PropsWithChildren>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <CoffeeTipQr />
        <Analytics />
      </body>
    </html>
  );
}
