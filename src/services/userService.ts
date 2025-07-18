import { createClient } from '@/lib/supabase/client';

export interface UserUpdateData {
  full_name?: string;
  metadata?: {
    full_name?: string;
    [key: string]: any;
  };
}

/**
 * Update user profile information
 * This function updates both the profiles table and the auth.users metadata
 */
export async function updateUser(userId: string, updates: UserUpdateData): Promise<void> {
  const supabase = createClient();

  // Update the profiles table
  if (updates.full_name) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: updates.full_name })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw new Error('Failed to update profile information');
    }
  }

  // Update the auth user metadata
  if (updates.metadata) {
    const { error: authError } = await supabase.auth.updateUser({
      data: updates.metadata,
    });

    if (authError) {
      console.error('Error updating auth metadata:', authError);
      throw new Error('Failed to update user metadata');
    }
  }
}

/**
 * Get user profile information
 */
export async function getUserProfile(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('Failed to fetch user profile');
  }

  return data;
}

/**
 * Update user profile with additional fields
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<{
    full_name: string;
    avatar_url: string;
    bio: string;
    website: string;
    location: string;
    company: string;
    job_title: string;
  }>
) {
  const supabase = createClient();

  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile');
  }
}
