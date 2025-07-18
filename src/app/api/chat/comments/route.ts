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
    const threadId = searchParams.get('thread_id');
    const parentId = searchParams.get('parent_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('chat_comments')
      .select(
        `
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
      `
      )
      .eq('thread_id', threadId)
      .eq('deleted', false)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null); // Top-level comments only
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error('[Chat API] Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch chat comments' }, { status: 500 });
    }

    return NextResponse.json({
      comments: comments || [],
      pagination: {
        limit,
        offset,
        hasMore: (comments || []).length === limit,
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
    const { thread_id, parent_id, content, metadata } = body;

    // Validate required fields
    if (!thread_id || !content) {
      return NextResponse.json({ error: 'Thread ID and content are required' }, { status: 400 });
    }

    // Verify thread exists and user has access
    const { data: thread, error: threadError } = await supabase
      .from('chat_threads')
      .select('id, title, team_id')
      .eq('id', thread_id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('chat_comments')
      .insert({
        thread_id,
        parent_id,
        content,
        created_by: user.id,
        metadata,
      })
      .select(
        `
        id,
        thread_id,
        parent_id,
        content,
        created_by,
        created_at,
        updated_at,
        deleted,
        metadata,
        created_by_user:profiles!chat_comments_created_by_fkey(id, full_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error('[Chat API] Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create chat comment' }, { status: 500 });
    }

    // Check for mentions in the comment content
    try {
      const contentText = JSON.stringify(content);
      const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const mentions = contentText.match(mentionRegex);

      if (mentions) {
        for (const mention of mentions) {
          const email = mention.substring(1); // Remove @ symbol

          // Find user by email
          const { data: mentionedUser } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('email', email)
            .single();

          if (mentionedUser && mentionedUser.id !== user.id) {
            // Create notification for mention
            await NotificationService.createChatMentionNotification(
              mentionedUser.id,
              thread_id,
              comment.id,
              user.id,
              thread.title
            );
          }
        }
      }
    } catch (mentionError) {
      console.error('[Chat API] Error processing mentions:', mentionError);
      // Don't fail the comment creation if mention processing fails
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('[Chat API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
