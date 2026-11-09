import type { MetadataRoute } from 'next'
import { BRAND } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — Verified employability score`,
    short_name: BRAND.name,
    description: BRAND.shortDescription,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#eef1fb',
    theme_color: '#4f46e5',
    categories: ['education', 'productivity'],
    lang: 'en-IN',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
