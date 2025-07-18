import { TableRow, TableInsert, TableUpdate } from '@/types/helpers';
import { User } from './user';

// Base types from database
export type Team = TableRow<'teams'>;
export type TeamMember = TableRow<'team_members'>;
export type TeamInvite = TableRow<'team_invites'>;

// Insert types for creating new records
export type NewTeam = TableInsert<'teams'>;
export type NewTeamMember = TableInsert<'team_members'>;
export type NewTeamInvite = TableInsert<'team_invites'>;

// Update types for modifying records
export type TeamUpdate = TableUpdate<'teams'>;
export type TeamMemberUpdate = TableUpdate<'team_members'>;
export type TeamInviteUpdate = TableUpdate<'team_invites'>;

// Extended types with additional fields
export interface TeamWithMembers extends Team {
  members?: TeamMember[];
  invites?: TeamInvite[];
}

export interface TeamMemberWithProfile extends TeamMember {
  profile?: User;
}
