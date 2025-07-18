import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
    const teamId = searchParams.get('team_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('chat_threads')
      .select(
        `
        id,
        title,
        content,
        created_by,
        team_id,
        created_at,
        updated_at,
        status,
        object_id,
        object_type,
        metadata,
        pinned,
        resolved_at,
        resolved_by,
        created_by_user:profiles!chat_threads_created_by_fkey(id, full_name, avatar_url),
        resolved_by_user:profiles!chat_threads_resolved_by_fkey(id, full_name, avatar_url),
        _count:chat_comments(count)
      `
      )
      .eq('team_id', teamId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: threads, error } = await query;

    if (error) {
      console.error('[Chat API] Error fetching threads:', error);
      return NextResponse.json({ error: 'Failed to fetch chat threads' }, { status: 500 });
    }

    return NextResponse.json({
      threads: threads || [],
      pagination: {
        limit,
        offset,
        hasMore: (threads || []).length === limit,
      },
    });
  } catch (error) {
    console.error('[Chat API] Unexpected error:', error);
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
    const { title, content, team_id, object_type, object_id, metadata } = body;

    // Validate required fields
    if (!title || !team_id) {
      return NextResponse.json({ error: 'Title and team_id are required' }, { status: 400 });
    }

    // Create thread
    const { data: thread, error } = await supabase
      .from('chat_threads')
      .insert({
        title,
        content,
        team_id,
        created_by: user.id,
        object_type,
        object_id,
        metadata,
      })
      .select(
        `
        id,
        title,
        content,
        created_by,
        team_id,
        created_at,
        updated_at,
        status,
        object_id,
        object_type,
        metadata,
        pinned,
        resolved_at,
        resolved_by,
        created_by_user:profiles!chat_threads_created_by_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error('[Chat API] Error creating thread:', error);
      return NextResponse.json({ error: 'Failed to create chat thread' }, { status: 500 });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error('[Chat API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
