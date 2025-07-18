import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;

    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get thread with comments
    const { data: thread, error } = await supabase
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
        comments:chat_comments(
          id,
          thread_id,
          parent_id,
          content,
          created_by,
          created_at,
          updated_at,
          deleted,
          metadata,
          created_by_user:profiles!chat_comments_created_by_fkey(id, full_name, avatar_url),
          reactions:chat_reactions(*)
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }
      console.error('[Chat API] Error fetching thread:', error);
      return NextResponse.json({ error: 'Failed to fetch chat thread' }, { status: 500 });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error('[Chat API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;

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
    const { title, content, status, pinned, metadata } = body;

    // Get current thread to check permissions
    const { data: currentThread, error: fetchError } = await supabase
      .from('chat_threads')
      .select('created_by, team_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch thread' }, { status: 500 });
    }

    // Check if user can update the thread
    const canUpdate = currentThread.created_by === user.id;
    if (!canUpdate) {
      return NextResponse.json({ error: 'You can only update your own threads' }, { status: 403 });
    }

    // Update thread
    const { data: thread, error } = await supabase
      .from('chat_threads')
      .update({
        title,
        content,
        status,
        pinned,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
      console.error('[Chat API] Error updating thread:', error);
      return NextResponse.json({ error: 'Failed to update chat thread' }, { status: 500 });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error('[Chat API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;

    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current thread to check permissions
    const { data: currentThread, error: fetchError } = await supabase
      .from('chat_threads')
      .select('created_by, team_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch thread' }, { status: 500 });
    }

    // Check if user can delete the thread
    const canDelete = currentThread.created_by === user.id;
    if (!canDelete) {
      return NextResponse.json({ error: 'You can only delete your own threads' }, { status: 403 });
    }

    // Delete thread (cascade will handle comments, reactions, etc.)
    const { error } = await supabase.from('chat_threads').delete().eq('id', id);

    if (error) {
      console.error('[Chat API] Error deleting thread:', error);
      return NextResponse.json({ error: 'Failed to delete chat thread' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('[Chat API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
