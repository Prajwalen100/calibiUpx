// Public preview of the CalibiAI Scorecard — reachable straight from the
// landing page ("See a sample report"). Shows the exact same report UI with
// bundled sample data; no account or assessment is needed.
import type { Metadata } from 'next'
import { StoreProvider } from '@/lib/store'
import { ScoreReport } from '@/components/ScoreReport'

export const metadata: Metadata = {
  title: 'Sample score report — see a full 1000-point CalibiUpX result',
  description:
    'A complete example CalibiUpX report: section performance, behavioural profile, objective accuracy, AI feedback and the verifiable 1000-point credential. No sign-up needed.',
  alternates: { canonical: '/sample-report' },
  openGraph: {
    title: 'Sample score report | CalibiUpX',
    description: 'See exactly what a verified 1000-point CalibiUpX employability report looks like.',
    url: '/sample-report',
    type: 'article',
  },
}
import { SAMPLE_SCORES } from '@/lib/sample'

export default function Page() {
  return (
    <StoreProvider>
      <ScoreReport scores={SAMPLE_SCORES} sample />
    </StoreProvider>
  )
}
