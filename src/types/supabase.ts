export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      chat_comments: {
        Row: {
          content: Json;
          created_at: string | null;
          created_by: string | null;
          deleted: boolean | null;
          deleted_at: string | null;
          deleted_by: string | null;
          edited_at: string | null;
          id: string;
          metadata: Json | null;
          parent_id: string | null;
          thread_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          content: Json;
          created_at?: string | null;
          created_by?: string | null;
          deleted?: boolean | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          edited_at?: string | null;
          id?: string;
          metadata?: Json | null;
          parent_id?: string | null;
          thread_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          content?: Json;
          created_at?: string | null;
          created_by?: string | null;
          deleted?: boolean | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          edited_at?: string | null;
          id?: string;
          metadata?: Json | null;
          parent_id?: string | null;
          thread_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_comments_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_comments_deleted_by_fkey';
            columns: ['deleted_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_comments_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'chat_comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_comments_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'chat_threads';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_reactions: {
        Row: {
          comment_id: string | null;
          created_at: string | null;
          emoji: string;
          id: string;
          user_id: string | null;
        };
        Insert: {
          comment_id?: string | null;
          created_at?: string | null;
          emoji: string;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          comment_id?: string | null;
          created_at?: string | null;
          emoji?: string;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_reactions_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'chat_comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_read_receipts: {
        Row: {
          created_at: string;
          id: string;
          last_read_at: string;
          thread_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_read_at?: string;
          thread_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_read_at?: string;
          thread_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_read_receipts_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'chat_threads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_read_receipts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_threads: {
        Row: {
          content: string | null;
          created_at: string | null;
          created_by: string | null;
          id: string;
          metadata: Json | null;
          object_id: string | null;
          object_type: string | null;
          pinned: boolean | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          team_id: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          metadata?: Json | null;
          object_id?: string | null;
          object_type?: string | null;
          pinned?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          team_id?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          metadata?: Json | null;
          object_id?: string | null;
          object_type?: string | null;
          pinned?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          team_id?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_threads_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_threads_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_threads_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          data: Json | null;
          id: string;
          message: string | null;
          read: boolean | null;
          title: string;
          type: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          data?: Json | null;
          id?: string;
          message?: string | null;
          read?: boolean | null;
          title: string;
          type: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          data?: Json | null;
          id?: string;
          message?: string | null;
          read?: boolean | null;
          title?: string;
          type?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          is_super_admin: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          is_super_admin?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          is_super_admin?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      team_join_requests: {
        Row: {
          created_at: string | null;
          id: string;
          message: string | null;
          status: string;
          team_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          message?: string | null;
          status?: string;
          team_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          message?: string | null;
          status?: string;
          team_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'team_join_requests_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_join_requests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      team_members: {
        Row: {
          created_at: string | null;
          id: string;
          role: string;
          status: string;
          team_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          role?: string;
          status?: string;
          team_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role?: string;
          status?: string;
          team_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          slug: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'teams_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_notification: {
        Args: {
          p_user_id: string;
          p_type: string;
          p_title: string;
          p_message?: string;
          p_data?: Json;
        };
        Returns: string;
      };
      create_team_notification: {
        Args: {
          p_team_id: string;
          p_type: string;
          p_title: string;
          p_message?: string;
          p_data?: Json;
        };
        Returns: undefined;
      };
      is_allowed_domain: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_owner: {
        Args: { user_id: string };
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_team_admin: {
        Args: { team_id: string };
        Returns: boolean;
      };
      is_team_creator: {
        Args: { team_id: string };
        Returns: boolean;
      };
      is_team_member: {
        Args: { team_id: string };
        Returns: boolean;
      };
      is_user_in_teams: {
        Args: { team_ids: string[] };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
