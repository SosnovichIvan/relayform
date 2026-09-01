import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Relayform',
  description: 'Заявки с сайта — в нужный канал.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
