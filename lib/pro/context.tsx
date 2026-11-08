'use client'
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { authenticatedFetch } from '@/lib/clientAuth'
import type { ProPlanId } from './plans'

export interface SubscriptionData {
  id: string
  student_id: string
  plan: ProPlanId
  amount_paise: number
  currency: string
  razorpay_order_id?: string
  razorpay_payment_id?: string
  status: 'active' | 'expired' | 'cancelled'
  starts_at: string
  expires_at: string
  created_at: string
}

interface ProContextValue {
  isPro: boolean
  subscription: SubscriptionData | null
  loading: boolean
  isUpgradeModalOpen: boolean
  modalFeatureHint: string | null
  isInvoiceModalOpen: boolean
  invoiceData: any | null
  openUpgradeModal: (featureHint?: string) => void
  closeUpgradeModal: () => void
  openInvoiceModal: (data?: any) => void
  closeInvoiceModal: () => void
  setProStatus: (isPro: boolean, sub?: SubscriptionData | null) => void
  refreshSubscription: () => Promise<void>
}

const ProContext = createContext<ProContextValue | null>(null)

const PRO_KEY = 'calibi_is_pro'
const SUB_KEY = 'calibi_subscription'

export function ProProvider({ children }: { children: React.ReactNode }) {
  const { user } = useStore()
  const [isPro, setIsPro] = useState<boolean>(false)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false)
  const [modalFeatureHint, setModalFeatureHint] = useState<string | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false)
  const [invoiceData, setInvoiceData] = useState<any | null>(null)

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const cachedPro = localStorage.getItem(PRO_KEY)
      const cachedSub = localStorage.getItem(SUB_KEY)
      if (cachedPro === 'true') {
        setIsPro(true)
      }
      if (cachedSub) {
        setSubscription(JSON.parse(cachedSub))
      }
    } catch {}
    setLoading(false)
  }, [])

  const setProStatus = useCallback((pro: boolean, sub: SubscriptionData | null = null) => {
    setIsPro(pro)
    setSubscription(sub)
    try {
      if (pro) {
        localStorage.setItem(PRO_KEY, 'true')
        if (sub) localStorage.setItem(SUB_KEY, JSON.stringify(sub))
      } else {
        localStorage.removeItem(PRO_KEY)
        localStorage.removeItem(SUB_KEY)
      }
    } catch {}
  }, [])

  const refreshSubscription = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await authenticatedFetch(`/api/user/subscription?student_id=${encodeURIComponent(user.id)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.isPro) {
          setProStatus(true, data.subscription)
        } else {
          // If expired or none, clear pro
          setProStatus(false, null)
        }
      }
    } catch (err) {
      console.warn('Could not refresh subscription status:', err)
    }
  }, [user?.id, setProStatus])

  // Refresh whenever active user changes
  useEffect(() => {
    if (user?.id) {
      refreshSubscription()
    } else {
      setProStatus(false, null)
    }
  }, [user?.id, refreshSubscription, setProStatus])

  const openUpgradeModal = useCallback((featureHint?: string) => {
    setModalFeatureHint(featureHint || null)
    setIsUpgradeModalOpen(true)
  }, [])

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false)
    setModalFeatureHint(null)
  }, [])

  const openInvoiceModal = useCallback((data?: any) => {
    if (data) {
      setInvoiceData(data)
    } else if (subscription) {
      setInvoiceData(subscription)
    }
    setIsInvoiceModalOpen(true)
  }, [subscription])

  const closeInvoiceModal = useCallback(() => {
    setIsInvoiceModalOpen(false)
  }, [])

  return (
    <ProContext.Provider
      value={{
        isPro,
        subscription,
        loading,
        isUpgradeModalOpen,
        modalFeatureHint,
        isInvoiceModalOpen,
        invoiceData,
        openUpgradeModal,
        closeUpgradeModal,
        openInvoiceModal,
        closeInvoiceModal,
        setProStatus,
        refreshSubscription,
      }}
    >
      {children}
    </ProContext.Provider>
  )
}

export function usePro() {
  const ctx = useContext(ProContext)
  if (!ctx) {
    throw new Error('usePro must be used within a ProProvider')
  }
  return ctx
}
