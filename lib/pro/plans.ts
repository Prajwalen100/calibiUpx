export type ProPlanId = 'monthly' | 'half_yearly' | 'yearly'

export interface ProPlan {
  id: ProPlanId
  name: string
  tagline: string
  price: number // in INR
  originalPrice?: number // in INR for strikethrough
  discountPercent?: number
  durationMonths: number
  durationDays: number
  monthlyEquivalent: number
  badge?: string
  popular?: boolean
  features: string[]
}

export const PRO_PLANS: Record<ProPlanId, ProPlan> = {
  monthly: {
    id: 'monthly',
    name: '1 Month',
    tagline: 'Ideal for immediate test prep',
    price: 299,
    durationMonths: 1,
    durationDays: 30,
    monthlyEquivalent: 299,
    features: [
      'Unlimited access to 60+ Company Mocks',
      '24/7 Mentorly AI Placement Coach',
      'Company Cutoff Predictions & Percentiles',
      'Full Comprehensive PDF Reports',
    ],
  },
  half_yearly: {
    id: 'half_yearly',
    name: '6 Months',
    tagline: 'Best for placement season',
    price: 599,
    durationMonths: 6,
    durationDays: 180,
    monthlyEquivalent: 100,
    badge: 'Popular',
    features: [
      'Everything in 1 Month Plan',
      'Full 6-Month Unrestricted Access',
      'All 60+ Company Mock Exams',
      'Unlimited Mentorly Chat & Voice',
      'ATS Resume Screening & Suggestions',
    ],
  },
  yearly: {
    id: 'yearly',
    name: '1 Year Annual',
    tagline: 'Full placement to career mastery',
    price: 899,
    originalPrice: 1299,
    discountPercent: 31,
    durationMonths: 12,
    durationDays: 365,
    monthlyEquivalent: 75,
    badge: 'Best Value · 31% OFF',
    popular: true,
    features: [
      'Everything in 6 Months Plan',
      'Full 365-Day Unrestricted Access',
      'Complete 60+ Company Blueprints & Coding Labs',
      'Priority Mentorly AI with Long-Term Memory',
      'Comprehensive Placement Coaching & Report',
      'Official CalibiUpX Verified Pro Badge',
    ],
  },
}

export const FREE_FEATURES = [
  'CalibiAI Core 120-Min Assessment',
  'Capgemini 2027 Mock Assessment',
  'Basic Employability Score & Grade',
  'Profile & Academic Portfolio',
]

export const PRO_FEATURES = [
  '60+ Realistic Company Mocks (TCS, Meta, Infosys, Amazon, etc.)',
  '24/7 Mentorly AI Placement Coach (Chat, Voice, Memory)',
  'Company-Specific Round Cutoff Predictor',
  'Comprehensive Master PDF Credentials & Detailed Reports',
  'Deep Algorithmic & Coding Lab Hidden Test Feedback',
  'ATS Resume Scoring & Keyword Optimization',
]
