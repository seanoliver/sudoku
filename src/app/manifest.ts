import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'Sudoku', short_name: 'Sudoku',
    description: 'A simple, free Sudoku game that feels right at home.',
    start_url: '/', scope: '/', display: 'standalone',
    background_color: '#f5f6f8', theme_color: '#f5f6f8',
    categories: ['games', 'puzzle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
