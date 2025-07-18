import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isAuthorizedForUserAccess } from '@/lib/middlewares/apiSecurity';

// Define the schema for user updates
const userUpdatesSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  avatar_url: z.url().optional(),
  user_group: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Schema for URL parameter validation
const userIdSchema = z.uuid('User ID must be a valid UUID');

type UserUpdates = z.infer<typeof userUpdatesSchema>;

// GET /api/users/[id]
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop(); // Extract the ID from the URL

    if (!userId) {
      return NextResponse.json({ error: 'User ID is missing' }, { status: 400 });
    }

    // Validate the user ID format
    try {
      userIdSchema.parse(userId);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid user ID format', details: validationError.issues },
          { status: 400 }
        );
      }
    }

    const supabase = await createSupabaseServerClient();

    // Check authentication
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization - verify user can access this profile
    // Only allow if current user is viewing their own profile or has admin/owner role in a shared team
    const isAuthorized = await isAuthorizedForUserAccess(supabase, currentUser.id, userId);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden. Insufficient permissions to access this user profile.' },
        { status: 403 }
      );
    }

    // Get user from auth.users
    const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user profile including team memberships
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        `
        *,
        team_members:team_members (
          team:teams (
            id,
            name,
            slug,
            logo_url
          ),
          role
        )
      `
      )
      .eq('id', userId)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      auth: authUser,
      profile,
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id]
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop(); // Extract the ID from the URL

    if (!userId) {
      return NextResponse.json({ error: 'User ID is missing' }, { status: 400 });
    }

    // Validate the user ID format
    try {
      userIdSchema.parse(userId);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid user ID format', details: validationError.issues },
          { status: 400 }
        );
      }
    }

    const supabase = await createSupabaseServerClient();

    try {
      // Parse and validate request body
      const rawBody = await request.json();
      const updates = userUpdatesSchema.parse(rawBody);

      // Check authentication
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check if user has permission to update this profile
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', currentUser.id)
        .single();

      const canUpdateUser =
        currentUser.id === userId || // User can update their own profile
        teamMember?.role === 'owner' || // Team owner can update team members
        teamMember?.role === 'admin'; // Team admin can update team members

      if (!canUpdateUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Update auth.users metadata
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          full_name: updates.full_name,
          avatar_url: updates.avatar_url,
          ...updates.metadata,
        },
      });

      if (authUpdateError) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      // Update profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: updates.full_name,
          avatar_url: updates.avatar_url,
          user_group: updates.user_group,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (profileError) {
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }

      return NextResponse.json(profile);
    } catch (validationError) {
      // Handle Zod validation errors
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation error',
            details: validationError.issues,
          },
          { status: 400 }
        );
      }
      throw validationError; // Re-throw if it's not a validation error
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id]
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop(); // Extract the ID from the URL

    if (!userId) {
      return NextResponse.json({ error: 'User ID is missing' }, { status: 400 });
    }

    // Validate the user ID format
    try {
      userIdSchema.parse(userId);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid user ID format', details: validationError.issues },
          { status: 400 }
        );
      }
    }

    const supabase = await createSupabaseServerClient();

    // Check authentication
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete users
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', currentUser.id)
      .single();

    const canDeleteUser =
      currentUser.id === userId || // User can delete their own account
      teamMember?.role === 'owner'; // Only team owner can delete other users

    if (!canDeleteUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
