import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in or create your free account',
  description:
    'Sign in to CalibiUpX to take the free AI-scored placement assessment, practise 50+ company mock tests and download your verified 1000-point score report.',
  alternates: { canonical: '/login' },
  // Indexable so the brand owns its own "CalibiUpX login" query, but kept out
  // of large previews — there is nothing to preview on a sign-in form.
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'none' } },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
