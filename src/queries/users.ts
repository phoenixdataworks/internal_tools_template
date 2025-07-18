import { createClient } from '@/lib/supabase/client';
import { createBrowserClient, createServerClient } from '@supabase/ssr';

type Client = ReturnType<typeof createBrowserClient | typeof createServerClient> | undefined;

export const getUserProfile = async (userId: string, client?: Client) => {
  const supabase = client || (await createClient());
  return await supabase.from('profiles').select('*').eq('id', userId).single();
};
