import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store'
import { buildCloudPayload, cloudClient, pushSnapshot } from './cloud'

/**
 * Pushes a snapshot a few seconds after the data settles, but only while the
 * learner has switched auto-sync on and is signed in.
 */
export function useCloudSync() {
  const { state, update } = useApp()
  const { supabaseUrl, supabaseKey, cloudAutoSync } = state.settings
  const [userId, setUserId] = useState<string | null>(null)
  const client = useMemo(() => cloudClient(supabaseUrl, supabaseKey), [supabaseUrl, supabaseKey])
  const latest = useRef(state)

  useEffect(() => {
    latest.current = state
  }, [state])

  useEffect(() => {
    if (!client) {
      setUserId(null)
      return
    }
    let active = true
    void client.auth.getSession().then(({ data }) => {
      if (active) setUserId(data.session?.user.id ?? null)
    })
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [client])

  const serialized = useMemo(() => JSON.stringify(buildCloudPayload(state)), [state])

  useEffect(() => {
    if (!client || !userId || !cloudAutoSync) return
    const timer = window.setTimeout(() => {
      void pushSnapshot(client, userId, latest.current)
        .then((updatedAt) => {
          update((s) => ({
            ...s,
            settings: { ...s.settings, cloudLastSync: updatedAt },
          }))
        })
        .catch((error: unknown) => {
          console.warn('StudyDeck cloud backup failed', error)
        })
    }, 4000)
    return () => window.clearTimeout(timer)
    // serialized is the data fingerprint; latest.current holds the fresh state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, client, userId, cloudAutoSync])
}
