import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's teams
    const { data: teams, error } = await supabase
      .from('teams')
      .select(
        `
        *,
        team_members!inner (
          user_id,
          role,
          status
        )
      `
      )
      .eq('team_members.user_id', user.id)
      .eq('team_members.status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching teams:', error);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, slug } = await request.json();

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Check if slug is unique
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingTeam) {
      return NextResponse.json({ error: 'Team slug already exists' }, { status: 409 });
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        description,
        slug,
        created_by: user.id,
      })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }

    // Add creator as admin
    const { error: memberError } = await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: user.id,
      role: 'admin',
      status: 'active',
    });

    if (memberError) {
      console.error('Error adding team member:', memberError);
      return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
