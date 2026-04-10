import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'GDM - Automação de Despachos',
  description: 'Sistema de automação de despachos do Gabinete da Diretoria de Materiais',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
