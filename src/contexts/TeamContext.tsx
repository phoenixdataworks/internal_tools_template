'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { QueryKeys } from '@/utils/queryKeys';

interface Team {
  id: string;
  name: string;
  description?: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending' | 'inactive';
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface TeamJoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface TeamContextType {
  teams: Team[];
  currentTeam: Team | null;
  teamMembers: TeamMember[];
  joinRequests: TeamJoinRequest[];
  isLoading: boolean;
  error: Error | null;
  setCurrentTeam: (team: Team | null) => void;
  createTeam: (data: { name: string; description?: string; slug: string }) => Promise<Team>;
  updateTeam: (teamId: string, data: Partial<Team>) => Promise<Team>;
  deleteTeam: (teamId: string) => Promise<void>;
  addTeamMember: (teamId: string, userId: string, role: 'admin' | 'member') => Promise<TeamMember>;
  removeTeamMember: (teamId: string, userId: string) => Promise<void>;
  updateTeamMemberRole: (
    teamId: string,
    userId: string,
    role: 'admin' | 'member'
  ) => Promise<TeamMember>;
  requestToJoinTeam: (teamId: string, message?: string) => Promise<TeamJoinRequest>;
  approveJoinRequest: (requestId: string) => Promise<void>;
  rejectJoinRequest: (requestId: string) => Promise<void>;
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  // Fetch teams
  const {
    data: teams = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: QueryKeys.teams(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch team members for current team
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team', currentTeam?.id, 'members'],
    queryFn: async () => {
      if (!currentTeam) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('team_members')
        .select(
          `
          *,
          profile:profiles(id, email, full_name)
        `
        )
        .eq('team_id', currentTeam.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentTeam,
  });

  // Fetch join requests for current team
  const { data: joinRequests = [] } = useQuery({
    queryKey: ['team', currentTeam?.id, 'join-requests'],
    queryFn: async () => {
      if (!currentTeam) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('team_join_requests')
        .select(
          `
          *,
          profile:profiles(id, email, full_name)
        `
        )
        .eq('team_id', currentTeam.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentTeam,
  });

  // Set first team as current if none selected
  useEffect(() => {
    if (teams.length > 0 && !currentTeam) {
      setCurrentTeam(teams[0]);
    }
  }, [teams, currentTeam]);

  const createTeam = async (data: {
    name: string;
    description?: string;
    slug: string;
  }): Promise<Team> => {
    const supabase = createClient();
    const { data: team, error } = await supabase
      .from('teams')
      .insert({ ...data, created_by: user!.id })
      .select()
      .single();

    if (error) throw error;

    // Add creator as admin
    await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: user!.id,
      role: 'admin',
      status: 'active',
    });

    queryClient.invalidateQueries({ queryKey: QueryKeys.teams(user!.id) });
    return team;
  };

  const updateTeam = async (teamId: string, data: Partial<Team>): Promise<Team> => {
    const supabase = createClient();
    const { data: team, error } = await supabase
      .from('teams')
      .update(data)
      .eq('id', teamId)
      .select()
      .single();

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: QueryKeys.teams(user!.id) });
    if (currentTeam?.id === teamId) {
      setCurrentTeam(team);
    }
    return team;
  };

  const deleteTeam = async (teamId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase.from('teams').delete().eq('id', teamId);

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: QueryKeys.teams(user!.id) });
    if (currentTeam?.id === teamId) {
      setCurrentTeam(null);
    }
  };

  const addTeamMember = async (
    teamId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<TeamMember> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
    return data;
  };

  const removeTeamMember = async (teamId: string, userId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
  };

  const updateTeamMemberRole = async (
    teamId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<TeamMember> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
    return data;
  };

  const requestToJoinTeam = async (teamId: string, message?: string): Promise<TeamJoinRequest> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('team_join_requests')
      .insert({
        team_id: teamId,
        user_id: user!.id,
        message,
      })
      .select()
      .single();

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['team', teamId, 'join-requests'] });
    return data;
  };

  const approveJoinRequest = async (requestId: string): Promise<void> => {
    const supabase = createClient();

    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('team_join_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    // Update request status
    const { error: updateError } = await supabase
      .from('team_join_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Add user to team
    const { error: memberError } = await supabase.from('team_members').insert({
      team_id: request.team_id,
      user_id: request.user_id,
      role: 'member',
      status: 'active',
    });

    if (memberError) throw memberError;

    queryClient.invalidateQueries({ queryKey: ['team', request.team_id, 'join-requests'] });
    queryClient.invalidateQueries({ queryKey: ['team', request.team_id, 'members'] });
  };

  const rejectJoinRequest = async (requestId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from('team_join_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['team', currentTeam?.id, 'join-requests'] });
  };

  const refreshTeams = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: QueryKeys.teams(user!.id) });
  };

  return (
    <TeamContext.Provider
      value={{
        teams,
        currentTeam,
        teamMembers,
        joinRequests,
        isLoading,
        error,
        setCurrentTeam,
        createTeam,
        updateTeam,
        deleteTeam,
        addTeamMember,
        removeTeamMember,
        updateTeamMemberRole,
        requestToJoinTeam,
        approveJoinRequest,
        rejectJoinRequest,
        refreshTeams,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
