import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { THEME_COLOR } from '@/lib/theme-color';
export const metadata: Metadata = {
  title: 'Sudoclue — a little time to focus',
  description: 'A calm Sudoku that teaches you every technique, one move at a time. Free, private, and playable offline.',
  applicationName: 'Sudoclue',
  metadataBase: new URL('https://sudoclue.app'),
  openGraph: { type: 'website', url: '/', siteName: 'Sudoclue', title: 'Sudoclue', description: 'A calm Sudoku that teaches you every technique, one move at a time.' },
  twitter: { card: 'summary_large_image', title: 'Sudoclue', description: 'A calm Sudoku that teaches you every technique, one move at a time.' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Sudoclue' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: THEME_COLOR.light }, { media: '(prefers-color-scheme: dark)', color: THEME_COLOR.dark }],
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-app={process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios' ? 'ios' : undefined} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{var t=JSON.parse(localStorage.getItem('sudoku.preferences.v1')||'null')?.theme;if(['system','light','dark'].includes(t))document.documentElement.setAttribute('data-theme',t)}catch{}` }}/></head><body>{children}{process.env.NEXT_PUBLIC_BUILD_TARGET !== 'ios' && <Analytics />}</body></html>;
}
