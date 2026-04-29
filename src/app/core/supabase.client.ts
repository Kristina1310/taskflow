import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any> = createClient(
  environment.supabase.url,
  environment.supabase.anonKey,
  {
    auth: {
      storageKey: `sb-${new URL(environment.supabase.url).hostname.split('.')[0]}-auth-token`,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Avoid lock contention errors when multiple tabs are open
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lock: (_name: string, _timeout: number, fn: () => Promise<any>) => fn() as any
    }
  }
);
