import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Sudoku — a little time to focus',
  description: 'A simple, free Sudoku game. Play at your own pace, save your progress, and enjoy puzzles offline.',
  applicationName: 'Sudoku',
  metadataBase: new URL('https://sudoku.seanoliver.dev'),
  openGraph: { type: 'website', url: '/', siteName: 'Sudoku', title: 'Sudoku', description: 'A calm Sudoku that teaches you every technique, one move at a time.' },
  twitter: { card: 'summary_large_image', title: 'Sudoku', description: 'A calm Sudoku that teaches you every technique, one move at a time.' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Sudoku' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f5f6f8' }, { media: '(prefers-color-scheme: dark)', color: '#181c24' }],
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{var t=JSON.parse(localStorage.getItem('sudoku.preferences.v1')||'null')?.theme;if(['system','light','dark'].includes(t))document.documentElement.setAttribute('data-theme',t)}catch{}` }}/></head><body>{children}</body></html>;
}
