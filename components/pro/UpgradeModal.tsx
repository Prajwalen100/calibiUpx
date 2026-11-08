'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Crown,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Lock,
  Layers,
  Bot,
  Flame,
  Check,
  FileText,
  Building2,
} from 'lucide-react'
import { PRO_PLANS, FREE_FEATURES, PRO_FEATURES, type ProPlanId } from '@/lib/pro/plans'
import { usePro } from '@/lib/pro/context'
import { useStore } from '@/lib/store'
import { openRazorpayCheckout } from '@/lib/pro/razorpay'

export function UpgradeModal() {
  const router = useRouter()
  const {
    isUpgradeModalOpen,
    closeUpgradeModal,
    modalFeatureHint,
    setProStatus,
    openInvoiceModal,
    isPro,
  } = usePro()
  const { user, profile } = useStore()
  const [selectedPlanId, setSelectedPlanId] = useState<ProPlanId>('yearly')
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<any | null>(null)

  if (!isUpgradeModalOpen) return null

  const selectedPlan = PRO_PLANS[selectedPlanId]

  const handleCheckout = async () => {
    // Security check: Must be signed in with a valid account
    if (!user?.id) {
      closeUpgradeModal()
      router.push('/login?redirect=/company-assessments')
      return
    }

    try {
      setLoading(true)
      setErrorMsg(null)

      // 1. Create order on server securely tied to user.id
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          amount: selectedPlan.price * 100,
          currency: 'INR',
          student_id: user.id,
        }),
      })

      const data = await res.json()
      const orderId = data.order_id || data.orderId
      if (!res.ok || !orderId) {
        throw new Error(data.error || 'Failed to initiate checkout order.')
      }

      // 2. Open Razorpay checkout modal
      await openRazorpayCheckout({
        orderId,
        amount: data.amount,
        currency: data.currency || 'INR',
        keyId: data.key_id || data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        planName: selectedPlan.name,
        planId: selectedPlanId,
        userName: profile?.full_name || user?.name || '',
        userEmail: user?.email || '',
        onSuccess: async (rzpResult) => {
          try {
            // 3. Verify payment on server
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...rzpResult,
                plan_id: selectedPlanId,
                student_id: user.id,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok || (!verifyData.ok && !verifyData.success)) {
              throw new Error(verifyData.error || 'Payment verification failed.')
            }

            // 4. Update Pro state globally
            setProStatus(true, verifyData.subscription)
            setSuccessData({
              subscription: verifyData.subscription,
              payment_id: verifyData.payment_id || rzpResult.razorpay_payment_id,
              order_id: verifyData.order_id || rzpResult.razorpay_order_id,
            })
          } catch (vErr: any) {
            console.error('Verification error:', vErr)
            setErrorMsg(vErr?.message || 'Payment verification failed.')
          } finally {
            setLoading(false)
          }
        },
        onError: (err) => {
          console.error('Razorpay Error:', err)
          setErrorMsg(err?.description || 'Payment was unsuccessful or cancelled.')
          setLoading(false)
        },
        onDismiss: () => {
          setLoading(false)
        },
      })
    } catch (err: any) {
      console.error('Checkout error:', err)
      setErrorMsg(err?.message || 'Could not start checkout.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSuccessData(null)
    setErrorMsg(null)
    closeUpgradeModal()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in backdrop-blur-md bg-slate-950/70"
    >
      {/* Outer Glow Card */}
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/20 dark:border-indigo-500/30 bg-white/95 dark:bg-slate-900/95 shadow-2xl shadow-indigo-500/20 backdrop-blur-2xl text-slate-800 dark:text-slate-100 p-5 sm:p-8">
        {/* Decorative Top Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-pink-500" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* If payment just succeeded: Show celebration and instant invoice download */}
        {successData ? (
          <div className="text-center py-6 sm:py-8 space-y-6 animate-pop">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-400/30">
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            </div>

            <div>
              <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                Payment Verified & Payout Secured
              </span>
              <h2 className="mt-4 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Welcome to CalibiUpX PRO!
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Your payment of <strong className="text-slate-900 dark:text-white font-bold">₹{selectedPlan.price}</strong> was successful. All 60+ Company Mock Exams and 24/7 Mentorly AI Coach are now fully unlocked for your account!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                <span className="block text-slate-400 text-[10px] uppercase font-bold">Plan</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPlan.name} Pass</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                <span className="block text-slate-400 text-[10px] uppercase font-bold">Payment ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white truncate block">
                  {successData.payment_id}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                <span className="block text-slate-400 text-[10px] uppercase font-bold">Access Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE PRO
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={() => {
                  handleClose()
                  openInvoiceModal(successData.subscription)
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/60 shadow-md transition active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>Download / View Tax Invoice</span>
              </button>

              <button
                onClick={() => {
                  handleClose()
                  router.push('/company-assessments')
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-black text-xs shadow-lg shadow-indigo-500/30 hover:scale-105 transition active:scale-95"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Start Practicing 60+ Mocks Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="text-center max-w-2xl mx-auto pt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-purple-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs font-black uppercase tracking-wider mb-3">
                <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                CalibiUpX Pro Upgrade
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Accelerate Your Placement Success
              </h2>

              {modalFeatureHint ? (
                <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 py-1.5 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800/50 inline-block">
                  ✨ Unlock <span className="font-black underline">{modalFeatureHint}</span> and master all 60+ company mocks
                </p>
              ) : (
                <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Calibi Core & Capgemini 2027 are <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Free Forever</span>.
                  Upgrade to Pro for full access to 60+ Company Mocks & Mentorly AI Coach.
                </p>
              )}
            </div>

            {/* Auth Warning if not signed in */}
            {!user && (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
                  <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Sign In Required:</strong> Please sign in to your student account first. Your payment receipt, tax invoice, and Pro mock history are securely linked to your account.
                  </span>
                </div>
                <button
                  onClick={() => {
                    handleClose()
                    router.push('/login?redirect=/company-assessments')
                  }}
                  className="shrink-0 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition"
                >
                  Sign In Now →
                </button>
              </div>
            )}

            {/* Error Alert */}
            {errorMsg && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700/60 text-rose-800 dark:text-rose-200 text-center text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* 3 Pricing Cards Grid */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Monthly Plan */}
              <div
                onClick={() => setSelectedPlanId('monthly')}
                className={`cursor-pointer relative rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between ${
                  selectedPlanId === 'monthly'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/50'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-base text-slate-900 dark:text-white">1 Month</span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedPlanId === 'monthly'
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selectedPlanId === 'monthly' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Flexible monthly prep</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">₹299</span>
                    <span className="text-xs text-slate-400 font-semibold">/ month</span>
                  </div>
                </div>

                <ul className="mt-5 space-y-2 text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-200/60 dark:border-slate-700/60 pt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>All 60+ Company Mocks</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>24/7 Mentorly AI Coach</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Round Cutoff Predictor</span>
                  </li>
                </ul>
              </div>

              {/* 6 Months Plan */}
              <div
                onClick={() => setSelectedPlanId('half_yearly')}
                className={`cursor-pointer relative rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between ${
                  selectedPlanId === 'half_yearly'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/50'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white">6 Months</span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        Popular
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedPlanId === 'half_yearly'
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selectedPlanId === 'half_yearly' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Campus placement season</p>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">₹599</span>
                    <span className="text-xs text-slate-400 font-semibold">(₹100/mo)</span>
                  </div>
                </div>

                <ul className="mt-5 space-y-2 text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-200/60 dark:border-slate-700/60 pt-3">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>6 Months Unrestricted Access</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>60+ Company Blueprints</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>ATS Resume Review</span>
                  </li>
                </ul>
              </div>

              {/* 1 Year Annual Plan */}
              <div
                onClick={() => setSelectedPlanId('yearly')}
                className={`cursor-pointer relative rounded-2xl p-4 sm:p-5 border-2 transition-all duration-200 flex flex-col justify-between ${
                  selectedPlanId === 'yearly'
                    ? 'border-indigo-600 dark:border-indigo-400 bg-gradient-to-b from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/60 dark:to-purple-950/60 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-500'
                    : 'border-amber-300/80 dark:border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/20 hover:border-amber-400'
                }`}
              >
                {/* Top Ribbon */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-white" />
                  Best Value · Save 31%
                </div>

                <div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-extrabold text-base text-slate-900 dark:text-white">1 Year Full Pass</span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedPlanId === 'yearly'
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selectedPlanId === 'yearly' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">365 days career mastery</p>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">₹899</span>
                    <span className="text-sm line-through text-slate-400 font-semibold">₹1299</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">(₹75/mo)</span>
                  </div>
                </div>

                <ul className="mt-5 space-y-2 text-[11px] text-slate-700 dark:text-slate-200 border-t border-slate-200/60 dark:border-slate-700/60 pt-3 font-medium">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Everything in 6 Months Plan</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>All 60+ Company Mock Exams</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Priority Mentorly AI Memory</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Official CalibiUpX PRO Badge & Tax Invoice</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature Comparison Matrix Banner */}
            <div className="mt-6 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    Included Free For All Students:
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>CalibiAI Core 120-Min Comprehensive Assessment</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Capgemini 2027 Mock Assessment</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Basic Employability Score & Profile</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Unlocked With CalibiUpX Pro:
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                    <li className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-semibold">60+ Realistic Company Mocks (TCS, Meta, Amazon, Infosys...)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-semibold">24/7 Mentorly AI Placement Coach with Audio & Memory</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-semibold">Official Downloadable Tax Invoice (GST Compliant)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Button Section */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>
                  Secure checkout powered by <span className="font-bold text-slate-700 dark:text-slate-200">Razorpay</span> · 256-Bit SSL Encrypted
                </span>
              </div>

              {!user ? (
                <button
                  onClick={() => {
                    handleClose()
                    router.push('/login?redirect=/company-assessments')
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm tracking-wide text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Sign In to Upgrade to Pro
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm tracking-wide text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connecting Razorpay...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      Upgrade to Pro (₹{selectedPlan.price}/-)
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
