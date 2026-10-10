import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';
import { THEME_COLOR } from '@/lib/theme-color';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'Sudoku', short_name: 'Sudoku',
    description: 'A simple, free Sudoku game that feels right at home.',
    start_url: '/', scope: '/', display: 'standalone',
    background_color: THEME_COLOR.light, theme_color: THEME_COLOR.light,
    categories: ['games', 'puzzle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
