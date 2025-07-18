import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Provider } from '@/lib/crypto/tokenVault';

// Extended provider type to include generic endpoints
type WebhookProvider = Provider | 'google' | 'meta';

/**
 * Handle Google revocation callback
 * https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoked
 */
async function handleGoogleRevocation(req: NextRequest) {
  try {
    // Google sends a POST with application/json
    const payload = await req.json();

    if (!payload || typeof payload !== 'object') {
      console.error('Invalid Google revocation payload:', payload);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Check required fields
    const { subject, event_type } = payload;

    if (!subject || event_type !== 'token_revoked') {
      console.error('Missing required fields or not a token revocation event:', payload);
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 });
    }

    // Get the user_id (subject) and find any associated accounts
    const supabase = await createSupabaseServerClient();

    // Delete all social accounts with this provider_user_id for Google providers
    const { error, count } = await supabase
      .from('social_accounts')
      .delete({ count: 'exact' })
      .or(`provider.eq.ga4,provider.eq.youtube`)
      .eq('provider_user_id', subject);

    if (error) {
      console.error('Error deleting revoked Google accounts:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Log the event
    await supabase.from('audit_logs').insert({
      event_type: 'oauth_revocation',
      actor: 'google',
      resource_type: 'social_account',
      resource_id: subject,
      details: { provider_user_id: subject, count_deleted: count },
    });

    // Return success - Google expects a 200 response
    return NextResponse.json({ success: true, deleted: count });
  } catch (error) {
    console.error('Error handling Google revocation:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * Handle Facebook deauthorization callback
 * https://developers.facebook.com/docs/facebook-login/permissions/requesting-and-revoking#deauth-callback
 */
async function handleFacebookDeauth(req: NextRequest) {
  try {
    // Facebook sends a POST with application/x-www-form-urlencoded
    const formData = await req.formData();
    const signed_request = formData.get('signed_request') as string;

    if (!signed_request) {
      console.error('Missing signed_request in Facebook deauth callback');
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });
    }

    // Parse and validate the signed request
    // This is a simplification - in production you should verify the signature
    const [encodedSig, encodedPayload] = signed_request.split('.');
    const payload = JSON.parse(
      Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    // Get the user_id and find any associated accounts
    const userId = payload.user_id;
    if (!userId) {
      console.error('Missing user_id in Facebook deauth payload:', payload);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Delete all social accounts with this provider_user_id for Facebook or Instagram
    const { error, count } = await supabase
      .from('social_accounts')
      .delete({ count: 'exact' })
      .or(`provider.eq.facebook,provider.eq.instagram`)
      .eq('provider_user_id', userId);

    if (error) {
      console.error('Error deleting revoked Facebook accounts:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Log the event
    await supabase.from('audit_logs').insert({
      event_type: 'oauth_revocation',
      actor: 'facebook',
      resource_type: 'social_account',
      resource_id: userId,
      details: { provider_user_id: userId, count_deleted: count },
    });

    // Return success - Facebook expects a 200 response
    return NextResponse.json({ success: true, deleted: count });
  } catch (error) {
    console.error('Error handling Facebook deauth:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST handler for /api/oauth/[provider]/webhook
 * Handles provider-initiated deauthorization events
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const params = await context.params;
  const provider = params.provider as WebhookProvider;

  // Validate the request based on provider
  switch (provider) {
    case 'ga4':
    case 'youtube':
    case 'google': // Allow a generic 'google' endpoint
      return handleGoogleRevocation(request);

    case 'facebook':
    case 'instagram':
    case 'meta': // Allow a generic 'meta' endpoint
      return handleFacebookDeauth(request);

    case 'x':
      // X (Twitter) does not currently provide a deauthorization callback
      return NextResponse.json(
        { error: 'Deauthorization callbacks not supported for this provider' },
        { status: 501 }
      );

    default:
      return NextResponse.json({ error: `Invalid provider: ${provider}` }, { status: 400 });
  }
}
