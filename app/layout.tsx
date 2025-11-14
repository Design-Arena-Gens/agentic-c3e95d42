import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Video Generator',
  description: 'Generate long-form videos (30-60 min) from a topic with images and captions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">AI Video Generator</h1>
            <a
              className="px-4 py-2 rounded-md bg-primary text-primary-fg hover:opacity-90 transition"
              href="https://commons.wikimedia.org/wiki/Main_Page"
              target="_blank"
              rel="noreferrer"
            >
              Images: Wikimedia Commons
            </a>
          </header>
          {children}
          <footer className="mt-16 text-sm text-zinc-400">
            <p>All generation runs locally in your browser. No uploads required.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
