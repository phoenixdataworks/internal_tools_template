import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface RefreshRequestBody {
  accountId: string;
}

/**
 * POST handler for /api/oauth/refresh
 * This is a generic endpoint that redirects to the provider-specific refresh endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Get account ID from request body
    const { accountId } = (await request.json()) as RefreshRequestBody;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get the provider for this account
    const supabase = await createSupabaseServerClient();
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('provider')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      console.error('Error fetching account details:', error);
      return NextResponse.json({ error: 'Failed to fetch account details' }, { status: 500 });
    }

    // Forward to the provider-specific endpoint
    const provider = account.provider;
    const providerEndpoint = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/${provider}/refresh`;

    const response = await fetch(providerEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId }),
    });

    // Return the response from the provider-specific endpoint
    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error refreshing token' },
      { status: 500 }
    );
  }
}
