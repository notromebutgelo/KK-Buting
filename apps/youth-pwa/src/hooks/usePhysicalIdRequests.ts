'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createPhysicalIdRequest,
  getMyPhysicalIdRequests,
  type MyPhysicalIdRequestsResponse,
} from '@/services/physicalIdRequests.service'

type UsePhysicalIdRequestsOptions = {
  enabled?: boolean
}

type CreateRequestPayload = {
  reason: string
  contactNumber: string
  notes?: string
}

const DEFAULT_STATE: MyPhysicalIdRequestsResponse = {
  requests: [],
  activeRequest: null,
  canRequest: false,
  eligibilityReason: null,
}

export function usePhysicalIdRequests(
  options: UsePhysicalIdRequestsOptions = {}
) {
  const { enabled = true } = options
  const [data, setData] = useState<MyPhysicalIdRequestsResponse>(DEFAULT_STATE)
  const [isLoading, setIsLoading] = useState(enabled)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return DEFAULT_STATE
    }

    setIsLoading(true)
    try {
      const nextData = await getMyPhysicalIdRequests()
      setData(nextData)
      setError(null)
      return nextData
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load physical ID requests.'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    void refresh()
  }, [enabled, refresh])

  const submitRequest = useCallback(
    async (payload: CreateRequestPayload) => {
      setIsSubmitting(true)
      try {
        const request = await createPhysicalIdRequest(payload)
        await refresh()
        return request
      } finally {
        setIsSubmitting(false)
      }
    },
    [refresh]
  )

  return {
    ...data,
    isLoading,
    isSubmitting,
    error,
    clearError: () => setError(null),
    refresh,
    submitRequest,
  }
}
