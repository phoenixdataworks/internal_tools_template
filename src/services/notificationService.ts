import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NotificationType } from '@/types/notification';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
}

export interface CreateTeamNotificationParams {
  teamId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, any>;
}

export class NotificationService {
  private static async getSupabase() {
    return await createSupabaseServerClient();
  }

  /**
   * Create a notification for a specific user
   */
  static async createNotification(params: CreateNotificationParams): Promise<string> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[NotificationService] Error creating notification:', error);
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    console.log(
      `[NotificationService] Created notification for user ${params.userId}: ${params.title}`
    );
    return data.id;
  }

  /**
   * Create notifications for all members of a team
   */
  static async createTeamNotification(params: CreateTeamNotificationParams): Promise<void> {
    const supabase = await this.getSupabase();

    // Get all active team members
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', params.teamId)
      .eq('status', 'active');

    if (teamError) {
      console.error('[NotificationService] Error fetching team members:', teamError);
      throw new Error(`Failed to fetch team members: ${teamError.message}`);
    }

    if (!teamMembers || teamMembers.length === 0) {
      console.log(`[NotificationService] No active members found for team ${params.teamId}`);
      return;
    }

    // Create notifications for all team members
    const notifications = teamMembers
      .filter(member => member.user_id) // Filter out null user_ids
      .map(member => ({
        user_id: member.user_id!,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data || null,
      }));

    const { error: insertError } = await supabase.from('notifications').insert(notifications);

    if (insertError) {
      console.error('[NotificationService] Error creating team notifications:', insertError);
      throw new Error(`Failed to create team notifications: ${insertError.message}`);
    }

    console.log(
      `[NotificationService] Created notifications for ${teamMembers.length} team members: ${params.title}`
    );
  }

  /**
   * Create a notification for a chat mention
   */
  static async createChatMentionNotification(
    mentionedUserId: string,
    threadId: string,
    commentId: string,
    commenterId: string,
    threadTitle: string
  ): Promise<string> {
    return this.createNotification({
      userId: mentionedUserId,
      type: 'chat',
      title: `You were mentioned in "${threadTitle}"`,
      message: 'Someone mentioned you in a chat thread',
      data: {
        thread_id: threadId,
        comment_id: commentId,
        commenter_id: commenterId,
        thread_title: threadTitle,
      },
    });
  }

  /**
   * Create a notification for a team invitation
   */
  static async createTeamInvitationNotification(
    invitedUserId: string,
    teamId: string,
    teamName: string,
    inviterName: string
  ): Promise<string> {
    return this.createNotification({
      userId: invitedUserId,
      type: 'team',
      title: `Invitation to join "${teamName}"`,
      message: `${inviterName} invited you to join their team`,
      data: {
        team_id: teamId,
        team_name: teamName,
        inviter_name: inviterName,
        action: 'team_invitation',
      },
    });
  }

  /**
   * Create a notification for a new chat thread
   */
  static async createNewThreadNotification(
    teamId: string,
    threadId: string,
    threadTitle: string,
    creatorName: string
  ): Promise<void> {
    return this.createTeamNotification({
      teamId,
      type: 'chat',
      title: `New discussion: "${threadTitle}"`,
      message: `${creatorName} started a new discussion`,
      data: {
        thread_id: threadId,
        thread_title: threadTitle,
        creator_name: creatorName,
        action: 'new_thread',
      },
    });
  }

  /**
   * Create a system notification
   */
  static async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'critical' = 'info',
    data?: Record<string, any>
  ): Promise<string> {
    return this.createNotification({
      userId,
      type: 'system',
      title,
      message,
      data: {
        severity,
        ...data,
      },
    });
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const supabase = await this.getSupabase();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('[NotificationService] Error marking notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const supabase = await this.getSupabase();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('[NotificationService] Error marking all notifications as read:', error);
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    const supabase = await this.getSupabase();

    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

    if (error) {
      console.error('[NotificationService] Error deleting notification:', error);
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Clear all notifications for a user
   */
  static async clearAllNotifications(userId: string): Promise<void> {
    const supabase = await this.getSupabase();

    const { error } = await supabase.from('notifications').delete().eq('user_id', userId);

    if (error) {
      console.error('[NotificationService] Error clearing all notifications:', error);
      throw new Error(`Failed to clear all notifications: ${error.message}`);
    }
  }
}
