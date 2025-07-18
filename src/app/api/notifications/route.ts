import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NotificationService } from '@/services/notificationService';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread') === 'true';

    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('[Notifications API] Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        limit,
        offset,
        hasMore: (notifications || []).length === limit,
      },
    });
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, message, data, userId } = body;

    // Validate required fields
    if (!type || !title) {
      return NextResponse.json({ error: 'Type and title are required' }, { status: 400 });
    }

    // Determine target user (default to current user if not specified)
    const targetUserId = userId || user.id;

    // Create notification
    const notificationId = await NotificationService.createNotification({
      userId: targetUserId,
      type,
      title,
      message,
      data,
    });

    return NextResponse.json({
      id: notificationId,
      message: 'Notification created successfully',
    });
  } catch (error) {
    console.error('[Notifications API] Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}
