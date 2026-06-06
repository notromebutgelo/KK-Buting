import AsyncStorage from '@react-native-async-storage/async-storage'

export type RuntimeDiagnostic = {
  message: string
  stack?: string
  source: string
  createdAt: string
}

type ErrorUtilsLike = {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void
}

const DIAGNOSTIC_KEY = 'merchant-runtime-diagnostic'
const STARTUP_PHASE_KEY = 'merchant-startup-phase'
const listeners = new Set<(diagnostic: RuntimeDiagnostic) => void>()

let installed = false
let currentRuntimeError: RuntimeDiagnostic | null = null

function describeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown runtime error',
      stack: error.stack,
    }
  }

  if (typeof error === 'string') {
    return { message: error }
  }

  try {
    return { message: JSON.stringify(error) }
  } catch {
    return { message: 'Unknown runtime error' }
  }
}

async function persistDiagnostic(diagnostic: RuntimeDiagnostic) {
  try {
    await AsyncStorage.setItem(DIAGNOSTIC_KEY, JSON.stringify(diagnostic))
  } catch {
    // Diagnostics must never become another crash source.
  }
}

export function reportRuntimeError(error: unknown, source = 'runtime') {
  const details = describeError(error)
  const diagnostic: RuntimeDiagnostic = {
    message: details.message,
    stack: details.stack,
    source,
    createdAt: new Date().toISOString(),
  }

  currentRuntimeError = diagnostic
  void persistDiagnostic(diagnostic)
  listeners.forEach((listener) => listener(diagnostic))
}

export function getCurrentRuntimeError() {
  return currentRuntimeError
}

export function subscribeRuntimeError(listener: (diagnostic: RuntimeDiagnostic) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function markStartupPhase(phase: string) {
  try {
    await AsyncStorage.setItem(
      STARTUP_PHASE_KEY,
      JSON.stringify({
        phase,
        createdAt: new Date().toISOString(),
      })
    )
  } catch {
    // Startup markers are best-effort only.
  }
}

export async function getStoredRuntimeDiagnostics() {
  try {
    const [diagnosticValue, startupPhaseValue] = await Promise.all([
      AsyncStorage.getItem(DIAGNOSTIC_KEY),
      AsyncStorage.getItem(STARTUP_PHASE_KEY),
    ])

    return {
      diagnostic: diagnosticValue ? (JSON.parse(diagnosticValue) as RuntimeDiagnostic) : null,
      startupPhase: startupPhaseValue ? (JSON.parse(startupPhaseValue) as { phase: string; createdAt: string }) : null,
    }
  } catch {
    return { diagnostic: null, startupPhase: null }
  }
}

export async function clearRuntimeDiagnostics() {
  currentRuntimeError = null
  try {
    await Promise.all([
      AsyncStorage.removeItem(DIAGNOSTIC_KEY),
      AsyncStorage.removeItem(STARTUP_PHASE_KEY),
    ])
  } catch {
    // Ignore clear failures.
  }
}

export function installRuntimeDiagnostics() {
  if (installed) return
  installed = true

  const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: ErrorUtilsLike }).ErrorUtils
  const previousHandler = errorUtils?.getGlobalHandler?.()

  errorUtils?.setGlobalHandler?.((error, isFatal) => {
    reportRuntimeError(error, isFatal ? 'fatal-js' : 'js')

    if (__DEV__ && previousHandler) {
      previousHandler(error, isFatal)
    }
  })

  const globalWithEvents = globalThis as typeof globalThis & {
    addEventListener?: (event: string, handler: (event: { reason?: unknown }) => void) => void
  }

  globalWithEvents.addEventListener?.('unhandledrejection', (event) => {
    reportRuntimeError(event.reason ?? 'Unhandled promise rejection', 'unhandled-promise')
  })
}
