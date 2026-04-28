import { createBrowserClient } from '@supabase/ssr'

export function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton for client components
let _client: ReturnType<typeof createBrowserClient> | null = null
export const supabase = typeof window !== 'undefined'
  ? (_client ??= getSupabase())
  : ({} as ReturnType<typeof createBrowserClient>)
