import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  console.log('Callback URL info:', {
    requestUrl: request.url,
    hasCode: searchParams.get('code') ? 'present' : 'missing',
    code: searchParams.get('code'),
    error: searchParams.get('error'),
    error_description: searchParams.get('error_description'),
    next: searchParams.get('next'),
    inviteToken: searchParams.get('invite_token'),
    provider: searchParams.get('provider'),
    token: searchParams.get('token'),
    type: searchParams.get('type'),
    tokeHash: searchParams.get('token_hash'),
  });

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next);
    }
  }

  // redirect the user to an error page with some instructions
  redirect('/error');
}
