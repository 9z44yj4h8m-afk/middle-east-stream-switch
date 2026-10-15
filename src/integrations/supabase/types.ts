export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      channel_overrides: {
        Row: {
          category: string | null
          channel_id: string
          hidden: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          channel_id: string
          hidden?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          channel_id?: string
          hidden?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      channel_schedules: {
        Row: {
          channel_id: string
          created_at: string
          ends_at: string | null
          id: string
          starts_at: string
          title: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          ends_at?: string | null
          id?: string
          starts_at: string
          title: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      chat_bans: {
        Row: {
          created_at: string
          kind: string
          name: string
          reason: string
          until: string | null
        }
        Insert: {
          created_at?: string
          kind?: string
          name: string
          reason?: string
          until?: string | null
        }
        Update: {
          created_at?: string
          kind?: string
          name?: string
          reason?: string
          until?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          display_name: string
          id: string
          room_id: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          display_name?: string
          id?: string
          room_id?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          display_name?: string
          id?: string
          room_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          count: number
          emoji: string
        }
        Insert: {
          count?: number
          emoji: string
        }
        Update: {
          count?: number
          emoji?: string
        }
        Relationships: []
      }
      chat_room_moves: {
        Row: {
          moved_at: string
          name: string
          room_id: string | null
        }
        Insert: {
          moved_at?: string
          name: string
          room_id?: string | null
        }
        Update: {
          moved_at?: string
          name?: string
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_moves_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      custom_channels: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          logo: string
          name: string
          stream_url: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          id: string
          logo?: string
          name: string
          stream_url: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          logo?: string
          name?: string
          stream_url?: string
        }
        Relationships: []
      }
      custom_movies: {
        Row: {
          created_at: string
          description: string
          id: string
          title: string
          youtube_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          title: string
          youtube_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          title?: string
          youtube_id?: string
        }
        Relationships: []
      }
      hidden_movies: {
        Row: {
          created_at: string
          movie_id: string
        }
        Insert: {
          created_at?: string
          movie_id: string
        }
        Update: {
          created_at?: string
          movie_id?: string
        }
        Relationships: []
      }
      member_library_sessions: {
        Row: {
          entered_at: string
          session_id: string
          unlocked: boolean
          user_id: string
        }
        Insert: {
          entered_at?: string
          session_id: string
          unlocked?: boolean
          user_id: string
        }
        Update: {
          entered_at?: string
          session_id?: string
          unlocked?: boolean
          user_id?: string
        }
        Relationships: []
      }
      private_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          last_login_at: string | null
          suspended: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          last_login_at?: string | null
          suspended?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          last_login_at?: string | null
          suspended?: boolean
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      subscription_requests: {
        Row: {
          account_name: string
          amount: number | null
          created_at: string
          duration: string
          id: string
          payment: string
          phone: string
          receipt_name: string
          status: string
        }
        Insert: {
          account_name: string
          amount?: number | null
          created_at?: string
          duration: string
          id?: string
          payment?: string
          phone: string
          receipt_name?: string
          status?: string
        }
        Update: {
          account_name?: string
          amount?: number | null
          created_at?: string
          duration?: string
          id?: string
          payment?: string
          phone?: string
          receipt_name?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_chat_reaction: { Args: { p_emoji: string }; Returns: number }
      admin_set_library_pin: { Args: { p_pin: string }; Returns: boolean }
      admin_set_member_suspended: {
        Args: { p_suspended: boolean; p_user: string }
        Returns: boolean
      }
      claim_owner_admin: { Args: never; Returns: boolean }
      create_chat_room: {
        Args: { p_name: string }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "chat_rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_member_profile: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      unlock_member_library: { Args: { p_pin: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
