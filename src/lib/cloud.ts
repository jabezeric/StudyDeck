import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type {
  AppState,
  Block,
  CalendarEvent,
  Duty,
  Message,
  Resource,
  Session as FocusSession,
  Settings,
  Task,
} from '../types'

export const SNAPSHOT_TABLE = 'studydeck_snapshots'

let cached: { url: string; key: string; client: SupabaseClient } | null = null

/** Reuses one client per server so auth state and listeners stay stable. */
export function cloudClient(url: string, key: string): SupabaseClient | null {
  const cleanUrl = url.trim().replace(/\/+$/, '')
  const cleanKey = key.trim()
  if (!cleanUrl || !cleanKey) return null
  if (cached && cached.url === cleanUrl && cached.key === cleanKey) return cached.client
  try {
    const client = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
    cached = { url: cleanUrl, key: cleanKey, client }
    return client
  } catch {
    // Still being typed, or not a valid project URL yet.
    return null
  }
}

type CloudSettings = Pick<
  Settings,
  | 'name'
  | 'dailyGoal'
  | 'provider'
  | 'apiBase'
  | 'model'
  | 'localBase'
  | 'localModel'
  | 'rasaUrl'
>

export type CloudPayload = {
  version: number
  blocks: Block[]
  tasks: Task[]
  duties: Duty[]
  events: CalendarEvent[]
  sessions: FocusSession[]
  messages: Message[]
  resources: Resource[]
  onboardingDone: boolean
  settings: CloudSettings
}

/**
 * Everything a learner needs to pick up on another device. Deliberately omits
 * API keys and local audio files — those never leave the device.
 */
export function buildCloudPayload(state: AppState): CloudPayload {
  return {
    version: 1,
    blocks: state.blocks,
    tasks: state.tasks,
    duties: state.duties,
    events: state.events,
    sessions: state.sessions,
    messages: state.messages,
    resources: state.resources,
    onboardingDone: state.onboardingDone,
    settings: {
      name: state.settings.name,
      dailyGoal: state.settings.dailyGoal,
      provider: state.settings.provider,
      apiBase: state.settings.apiBase,
      model: state.settings.model,
      localBase: state.settings.localBase,
      localModel: state.settings.localModel,
      rasaUrl: state.settings.rasaUrl,
    },
  }
}

export function applyCloudPayload(state: AppState, payload: CloudPayload): AppState {
  return {
    ...state,
    blocks: payload.blocks ?? state.blocks,
    tasks: payload.tasks ?? state.tasks,
    duties: payload.duties ?? state.duties,
    events: payload.events ?? state.events,
    sessions: payload.sessions ?? state.sessions,
    messages: payload.messages ?? state.messages,
    resources: payload.resources ?? state.resources,
    onboardingDone: payload.onboardingDone ?? true,
    settings: { ...state.settings, ...(payload.settings ?? {}) },
  }
}

export async function getSession(client: SupabaseClient): Promise<Session | null> {
  const { data } = await client.auth.getSession()
  return data.session ?? null
}

export async function signUp(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await client.auth.signUp({ email, password })
  if (error) throw error
  return { needsConfirmation: !data.session }
}

export async function signIn(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut(client: SupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function pushSnapshot(
  client: SupabaseClient,
  userId: string,
  state: AppState,
): Promise<string> {
  const updatedAt = new Date().toISOString()
  const { error } = await client.from(SNAPSHOT_TABLE).upsert(
    { user_id: userId, data: buildCloudPayload(state), updated_at: updatedAt },
    { onConflict: 'user_id' },
  )
  if (error) throw error
  return updatedAt
}

export async function getSnapshotInfo(
  client: SupabaseClient,
  userId: string,
): Promise<{ updated_at: string } | null> {
  const { data, error } = await client
    .from(SNAPSHOT_TABLE)
    .select('updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as { updated_at: string } | null) ?? null
}

export async function pullSnapshot(
  client: SupabaseClient,
  userId: string,
): Promise<{ data: CloudPayload; updated_at: string } | null> {
  const { data, error } = await client
    .from(SNAPSHOT_TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as { data: CloudPayload; updated_at: string } | null) ?? null
}
