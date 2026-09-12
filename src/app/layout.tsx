import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI CodeLab — Generative AI Coding & Learning Studio',
  description: 'Interactive Generative AI Coding Laboratory & PBL Learning Platform with intelligent assistance, code analysis, real-time runner, and Socratic tutoring.',
  keywords: ['Generative AI', 'CodeLab', 'Project-Based Learning', 'Coding Assistant', 'AI Tutor', 'Gemini AI', 'Next.js'],
  authors: [{ name: 'AI CodeLab Studio' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  );
}
