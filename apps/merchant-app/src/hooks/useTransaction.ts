import { useCallback, useEffect, useState } from 'react'

import { useAuthStore } from '../store/authStore'
import { getRecentTransactions } from '../services/transaction.service'
import type { MerchantTransaction } from '../types/merchant'

export function useTransaction() {
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const user = useAuthStore((state) => state.user)

  const refresh = useCallback(async () => {
    if (!user) {
      setTransactions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const items = await getRecentTransactions(user)
    setTransactions(items)
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { transactions, isLoading, refresh }
}
