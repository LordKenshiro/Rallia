export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      admins: {
        Row: {
          assigned_at: string;
          id: string;
          notes: string | null;
          permissions: Json | null;
          role: Database["public"]["Enums"]["admin_role_enum"];
        };
        Insert: {
          assigned_at?: string;
          id: string;
          notes?: string | null;
          permissions?: Json | null;
          role: Database["public"]["Enums"]["admin_role_enum"];
        };
        Update: {
          assigned_at?: string;
          id?: string;
          notes?: string | null;
          permissions?: Json | null;
          role?: Database["public"]["Enums"]["admin_role_enum"];
        };
        Relationships: [
          {
            foreignKeyName: "admins_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      court_sports: {
        Row: {
          court_id: string;
          created_at: string;
          id: string;
          sport_id: string;
          updated_at: string;
        };
        Insert: {
          court_id: string;
          created_at?: string;
          id?: string;
          sport_id: string;
          updated_at?: string;
        };
        Update: {
          court_id?: string;
          created_at?: string;
          id?: string;
          sport_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "court_sports_court_id_fkey";
            columns: ["court_id"];
            isOneToOne: false;
            referencedRelation: "courts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "court_sports_sport_id_fkey";
            columns: ["sport_id"];
            isOneToOne: false;
            referencedRelation: "sports";
            referencedColumns: ["id"];
          }
        ];
      };
      courts: {
        Row: {
          attributes: Json | null;
          availability_status: Database["public"]["Enums"]["availability_enum"];
          court_number: number | null;
          created_at: string;
          facility_id: string;
          id: string;
          indoor: boolean;
          is_active: boolean;
          lighting: boolean;
          lines_marked_for_multiple_sports: boolean;
          name: string | null;
          notes: string | null;
          surface_type: Database["public"]["Enums"]["surface_type_enum"] | null;
          updated_at: string;
        };
        Insert: {
          attributes?: Json | null;
          availability_status?: Database["public"]["Enums"]["availability_enum"];
          court_number?: number | null;
          created_at?: string;
          facility_id: string;
          id?: string;
          indoor?: boolean;
          is_active?: boolean;
          lighting?: boolean;
          lines_marked_for_multiple_sports?: boolean;
          name?: string | null;
          notes?: string | null;
          surface_type?:
            | Database["public"]["Enums"]["surface_type_enum"]
            | null;
          updated_at?: string;
        };
        Update: {
          attributes?: Json | null;
          availability_status?: Database["public"]["Enums"]["availability_enum"];
          court_number?: number | null;
          created_at?: string;
          facility_id?: string;
          id?: string;
          indoor?: boolean;
          is_active?: boolean;
          lighting?: boolean;
          lines_marked_for_multiple_sports?: boolean;
          name?: string | null;
          notes?: string | null;
          surface_type?:
            | Database["public"]["Enums"]["surface_type_enum"]
            | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courts_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          }
        ];
      };
      delivery_attempts: {
        Row: {
          attempt_number: number;
          channel: Database["public"]["Enums"]["delivery_channel_enum"];
          created_at: string;
          error_message: string | null;
          id: string;
          invitation_id: string | null;
          notification_id: string | null;
          provider_response: Json | null;
          status: Database["public"]["Enums"]["delivery_status_enum"];
        };
        Insert: {
          attempt_number: number;
          channel: Database["public"]["Enums"]["delivery_channel_enum"];
          created_at?: string;
          error_message?: string | null;
          id?: string;
          invitation_id?: string | null;
          notification_id?: string | null;
          provider_response?: Json | null;
          status: Database["public"]["Enums"]["delivery_status_enum"];
        };
        Update: {
          attempt_number?: number;
          channel?: Database["public"]["Enums"]["delivery_channel_enum"];
          created_at?: string;
          error_message?: string | null;
          id?: string;
          invitation_id?: string | null;
          notification_id?: string | null;
          provider_response?: Json | null;
          status?: Database["public"]["Enums"]["delivery_status_enum"];
        };
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "invitations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_attempts_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: false;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          }
        ];
      };
      facilities: {
        Row: {
          address: string | null;
          archived_at: string | null;
          attributes: Json | null;
          city: string | null;
          country: Database["public"]["Enums"]["country_enum"] | null;
          created_at: string;
          description: string | null;
          facility_type:
            | Database["public"]["Enums"]["facility_type_enum"]
            | null;
          id: string;
          is_active: boolean;
          latitude: number | null;
          location: unknown;
          longitude: number | null;
          name: string;
          organization_id: string;
          postal_code: string | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          archived_at?: string | null;
          attributes?: Json | null;
          city?: string | null;
          country?: Database["public"]["Enums"]["country_enum"] | null;
          created_at?: string;
          description?: string | null;
          facility_type?:
            | Database["public"]["Enums"]["facility_type_enum"]
            | null;
          id?: string;
          is_active?: boolean;
          latitude?: number | null;
          location?: unknown;
          longitude?: number | null;
          name: string;
          organization_id: string;
          postal_code?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          archived_at?: string | null;
          attributes?: Json | null;
          city?: string | null;
          country?: Database["public"]["Enums"]["country_enum"] | null;
          created_at?: string;
          description?: string | null;
          facility_type?:
            | Database["public"]["Enums"]["facility_type_enum"]
            | null;
          id?: string;
          is_active?: boolean;
          latitude?: number | null;
          location?: unknown;
          longitude?: number | null;
          name?: string;
          organization_id?: string;
          postal_code?: string | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facilities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      facility_contacts: {
        Row: {
          attributes: Json | null;
          contact_type: Database["public"]["Enums"]["facility_contact_type_enum"];
          created_at: string;
          email: string | null;
          facility_id: string;
          id: string;
          is_primary: boolean;
          notes: string | null;
          phone: string | null;
          sport_id: string | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          attributes?: Json | null;
          contact_type: Database["public"]["Enums"]["facility_contact_type_enum"];
          created_at?: string;
          email?: string | null;
          facility_id: string;
          id?: string;
          is_primary?: boolean;
          notes?: string | null;
          phone?: string | null;
          sport_id?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          attributes?: Json | null;
          contact_type?: Database["public"]["Enums"]["facility_contact_type_enum"];
          created_at?: string;
          email?: string | null;
          facility_id?: string;
          id?: string;
          is_primary?: boolean;
          notes?: string | null;
          phone?: string | null;
          sport_id?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "facility_contacts_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_contacts_sport_id_fkey";
            columns: ["sport_id"];
            isOneToOne: false;
            referencedRelation: "sports";
            referencedColumns: ["id"];
          }
        ];
      };
      facility_images: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          facility_id: string;
          file_size: number | null;
          id: string;
          is_primary: boolean;
          metadata: Json | null;
          mime_type: string | null;
          storage_key: string;
          thumbnail_url: string | null;
          uploaded_at: string;
          url: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          facility_id: string;
          file_size?: number | null;
          id?: string;
          is_primary?: boolean;
          metadata?: Json | null;
          mime_type?: string | null;
          storage_key: string;
          thumbnail_url?: string | null;
          uploaded_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          facility_id?: string;
          file_size?: number | null;
          id?: string;
          is_primary?: boolean;
          metadata?: Json | null;
          mime_type?: string | null;
          storage_key?: string;
          thumbnail_url?: string | null;
          uploaded_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_images_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          }
        ];
      };
      facility_sports: {
        Row: {
          created_at: string;
          facility_id: string;
          id: string;
          sport_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          facility_id: string;
          id?: string;
          sport_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          facility_id?: string;
          id?: string;
          sport_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_sports_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facility_sports_sport_id_fkey";
            columns: ["sport_id"];
            isOneToOne: false;
            referencedRelation: "sports";
            referencedColumns: ["id"];
          }
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          admin_role: Database["public"]["Enums"]["admin_role_enum"] | null;
          created_at: string;
          email: string | null;
          expires_at: string;
          id: string;
          invited_user_id: string | null;
          inviter_id: string;
          metadata: Json | null;
          phone: string | null;
          revoke_reason: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          role: Database["public"]["Enums"]["app_role_enum"];
          source: Database["public"]["Enums"]["invite_source_enum"];
          status: Database["public"]["Enums"]["invite_status_enum"];
          token: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          admin_role?: Database["public"]["Enums"]["admin_role_enum"] | null;
          created_at?: string;
          email?: string | null;
          expires_at: string;
          id?: string;
          invited_user_id?: string | null;
          inviter_id: string;
          metadata?: Json | null;
          phone?: string | null;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: Database["public"]["Enums"]["app_role_enum"];
          source?: Database["public"]["Enums"]["invite_source_enum"];
          status?: Database["public"]["Enums"]["invite_status_enum"];
          token: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          admin_role?: Database["public"]["Enums"]["admin_role_enum"] | null;
          created_at?: string;
          email?: string | null;
          expires_at?: string;
          id?: string;
          invited_user_id?: string | null;
          inviter_id?: string;
          metadata?: Json | null;
          phone?: string | null;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: Database["public"]["Enums"]["app_role_enum"];
          source?: Database["public"]["Enums"]["invite_source_enum"];
          status?: Database["public"]["Enums"]["invite_status_enum"];
          token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_invited_user_id_fkey";
            columns: ["invited_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_inviter_id_fkey";
            columns: ["inviter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_revoked_by_fkey";
            columns: ["revoked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          expires_at: string | null;
          id: string;
          payload: Json | null;
          read_at: string | null;
          target_id: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type_enum"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          payload?: Json | null;
          read_at?: string | null;
          target_id?: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type_enum"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          payload?: Json | null;
          read_at?: string | null;
          target_id?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type_enum"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      organization_members: {
        Row: {
          id: string;
          invited_by: string | null;
          joined_at: string;
          left_at: string | null;
          organization_id: string;
          permissions: Json | null;
          role: Database["public"]["Enums"]["role_enum"];
          user_id: string;
        };
        Insert: {
          id?: string;
          invited_by?: string | null;
          joined_at?: string;
          left_at?: string | null;
          organization_id: string;
          permissions?: Json | null;
          role: Database["public"]["Enums"]["role_enum"];
          user_id: string;
        };
        Update: {
          id?: string;
          invited_by?: string | null;
          joined_at?: string;
          left_at?: string | null;
          organization_id?: string;
          permissions?: Json | null;
          role?: Database["public"]["Enums"]["role_enum"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      organizations: {
        Row: {
          address: string | null;
          city: string | null;
          country: Database["public"]["Enums"]["country_enum"] | null;
          created_at: string;
          description: string | null;
          email: string;
          id: string;
          is_active: boolean;
          name: string;
          nature: Database["public"]["Enums"]["organization_nature_enum"];
          owner_id: string | null;
          phone: string | null;
          postal_code: string | null;
          slug: string;
          type: Database["public"]["Enums"]["organization_type_enum"] | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          country?: Database["public"]["Enums"]["country_enum"] | null;
          created_at?: string;
          description?: string | null;
          email: string;
          id?: string;
          is_active?: boolean;
          name: string;
          nature: Database["public"]["Enums"]["organization_nature_enum"];
          owner_id?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          slug: string;
          type?: Database["public"]["Enums"]["organization_type_enum"] | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          country?: Database["public"]["Enums"]["country_enum"] | null;
          created_at?: string;
          description?: string | null;
          email?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          nature?: Database["public"]["Enums"]["organization_nature_enum"];
          owner_id?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          slug?: string;
          type?: Database["public"]["Enums"]["organization_type_enum"] | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          birth_date: string | null;
          created_at: string;
          display_name: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean;
          last_active_at: string | null;
          locale: string;
          timezone: string;
          two_factor_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          display_name?: string | null;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          last_active_at?: string | null;
          locale?: string;
          timezone?: string;
          two_factor_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          display_name?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          last_active_at?: string | null;
          locale?: string;
          timezone?: string;
          two_factor_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      sports: {
        Row: {
          attributes: Json | null;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          attributes?: Json | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          attributes?: Json | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      waitlist_signups: {
        Row: {
          created_at: string | null;
          email: string;
          id: number;
          ip_address: string | null;
          location: string | null;
          name: string;
          phone: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: never;
          ip_address?: string | null;
          location?: string | null;
          name: string;
          phone?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: never;
          ip_address?: string | null;
          location?: string | null;
          name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      admin_role_enum: "super_admin" | "moderator" | "support";
      app_role_enum: "player" | "organization_member" | "admin";
      availability_enum:
        | "available"
        | "unavailable"
        | "maintenance"
        | "reserved";
      country_enum: "Canada" | "United States";
      delivery_channel_enum: "email" | "sms" | "push";
      delivery_status_enum: "pending" | "success" | "failed";
      facility_contact_type_enum:
        | "general"
        | "reservation"
        | "maintenance"
        | "other";
      facility_type_enum:
        | "park"
        | "club"
        | "indoor_center"
        | "private"
        | "other";
      invite_source_enum:
        | "manual"
        | "auto_match"
        | "invite_list"
        | "mailing_list"
        | "growth_prompt";
      invite_status_enum:
        | "pending"
        | "sent"
        | "accepted"
        | "expired"
        | "bounced"
        | "cancelled";
      notification_type_enum:
        | "match_invitation"
        | "reminder"
        | "payment"
        | "support"
        | "chat"
        | "system";
      organization_nature_enum: "public" | "private";
      organization_type_enum: "club" | "municipality" | "city" | "association";
      role_enum: "admin" | "staff" | "player" | "coach" | "owner";
      surface_type_enum:
        | "hard"
        | "clay"
        | "grass"
        | "synthetic"
        | "carpet"
        | "concrete"
        | "asphalt";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      admin_role_enum: ["super_admin", "moderator", "support"],
      app_role_enum: ["player", "organization_member", "admin"],
      availability_enum: [
        "available",
        "unavailable",
        "maintenance",
        "reserved",
      ],
      country_enum: ["Canada", "United States"],
      delivery_channel_enum: ["email", "sms", "push"],
      delivery_status_enum: ["pending", "success", "failed"],
      facility_contact_type_enum: [
        "general",
        "reservation",
        "maintenance",
        "other",
      ],
      facility_type_enum: ["park", "club", "indoor_center", "private", "other"],
      invite_source_enum: [
        "manual",
        "auto_match",
        "invite_list",
        "mailing_list",
        "growth_prompt",
      ],
      invite_status_enum: [
        "pending",
        "sent",
        "accepted",
        "expired",
        "bounced",
        "cancelled",
      ],
      notification_type_enum: [
        "match_invitation",
        "reminder",
        "payment",
        "support",
        "chat",
        "system",
      ],
      organization_nature_enum: ["public", "private"],
      organization_type_enum: ["club", "municipality", "city", "association"],
      role_enum: ["admin", "staff", "player", "coach", "owner"],
      surface_type_enum: [
        "hard",
        "clay",
        "grass",
        "synthetic",
        "carpet",
        "concrete",
        "asphalt",
      ],
    },
  },
} as const;
