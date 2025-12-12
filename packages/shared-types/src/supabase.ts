export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin: {
        Row: {
          assigned_at: string
          id: string
          notes: string | null
          permissions: Json | null
          role: Database["public"]["Enums"]["admin_role_enum"]
        }
        Insert: {
          assigned_at?: string
          id: string
          notes?: string | null
          permissions?: Json | null
          role: Database["public"]["Enums"]["admin_role_enum"]
        }
        Update: {
          assigned_at?: string
          id?: string
          notes?: string | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["admin_role_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "admin_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      booking: {
        Row: {
          booking_date: string
          court_slot_id: string
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          player_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          booking_date: string
          court_slot_id: string
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          player_id: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_date?: string
          court_slot_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          player_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_court_slot_id_fkey"
            columns: ["court_slot_id"]
            isOneToOne: false
            referencedRelation: "court_slot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation: {
        Row: {
          conversation_type: Database["public"]["Enums"]["conversation_type"]
          created_at: string | null
          created_by: string
          id: string
          match_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_type: Database["public"]["Enums"]["conversation_type"]
          created_at?: string | null
          created_by: string
          id?: string
          match_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_type?: Database["public"]["Enums"]["conversation_type"]
          created_at?: string | null
          created_by?: string
          id?: string
          match_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participant: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          is_muted: boolean | null
          joined_at: string | null
          last_read_at: string | null
          player_id: string
          updated_at: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          player_id: string
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          player_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participant_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participant_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      court: {
        Row: {
          attributes: Json | null
          availability_status: Database["public"]["Enums"]["availability_enum"]
          court_number: number | null
          created_at: string
          facility_id: string
          id: string
          indoor: boolean
          is_active: boolean
          lighting: boolean
          lines_marked_for_multiple_sports: boolean
          name: string | null
          notes: string | null
          surface_type: Database["public"]["Enums"]["surface_type_enum"] | null
          updated_at: string
        }
        Insert: {
          attributes?: Json | null
          availability_status?: Database["public"]["Enums"]["availability_enum"]
          court_number?: number | null
          created_at?: string
          facility_id: string
          id?: string
          indoor?: boolean
          is_active?: boolean
          lighting?: boolean
          lines_marked_for_multiple_sports?: boolean
          name?: string | null
          notes?: string | null
          surface_type?: Database["public"]["Enums"]["surface_type_enum"] | null
          updated_at?: string
        }
        Update: {
          attributes?: Json | null
          availability_status?: Database["public"]["Enums"]["availability_enum"]
          court_number?: number | null
          created_at?: string
          facility_id?: string
          id?: string
          indoor?: boolean
          is_active?: boolean
          lighting?: boolean
          lines_marked_for_multiple_sports?: boolean
          name?: string | null
          notes?: string | null
          surface_type?: Database["public"]["Enums"]["surface_type_enum"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility"
            referencedColumns: ["id"]
          },
        ]
      }
      court_slot: {
        Row: {
          court_id: string
          created_at: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          id: string
          is_available: boolean | null
          price: number | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          court_id: string
          created_at?: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          id?: string
          is_available?: boolean | null
          price?: number | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          court_id?: string
          created_at?: string | null
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          end_time?: string
          id?: string
          is_available?: boolean | null
          price?: number | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "court_slot_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "court"
            referencedColumns: ["id"]
          },
        ]
      }
      court_sport: {
        Row: {
          court_id: string
          created_at: string
          id: string
          sport_id: string
          updated_at: string
        }
        Insert: {
          court_id: string
          created_at?: string
          id?: string
          sport_id: string
          updated_at?: string
        }
        Update: {
          court_id?: string
          created_at?: string
          id?: string
          sport_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_sport_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "court"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_sport_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_attempt: {
        Row: {
          attempt_number: number
          channel: Database["public"]["Enums"]["delivery_channel_enum"]
          created_at: string
          error_message: string | null
          id: string
          invitation_id: string | null
          notification_id: string | null
          provider_response: Json | null
          status: Database["public"]["Enums"]["delivery_status_enum"]
        }
        Insert: {
          attempt_number: number
          channel: Database["public"]["Enums"]["delivery_channel_enum"]
          created_at?: string
          error_message?: string | null
          id?: string
          invitation_id?: string | null
          notification_id?: string | null
          provider_response?: Json | null
          status: Database["public"]["Enums"]["delivery_status_enum"]
        }
        Update: {
          attempt_number?: number
          channel?: Database["public"]["Enums"]["delivery_channel_enum"]
          created_at?: string
          error_message?: string | null
          id?: string
          invitation_id?: string | null
          notification_id?: string | null
          provider_response?: Json | null
          status?: Database["public"]["Enums"]["delivery_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempt_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_attempts_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitation"
            referencedColumns: ["id"]
          },
        ]
      }
      facility: {
        Row: {
          address: string | null
          archived_at: string | null
          attributes: Json | null
          city: string | null
          country: Database["public"]["Enums"]["country_enum"] | null
          created_at: string
          description: string | null
          facility_type:
            | Database["public"]["Enums"]["facility_type_enum"]
            | null
          id: string
          is_active: boolean
          latitude: number | null
          location: unknown
          longitude: number | null
          membership_required: boolean
          name: string
          organization_id: string
          postal_code: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          attributes?: Json | null
          city?: string | null
          country?: Database["public"]["Enums"]["country_enum"] | null
          created_at?: string
          description?: string | null
          facility_type?:
            | Database["public"]["Enums"]["facility_type_enum"]
            | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          membership_required?: boolean
          name: string
          organization_id: string
          postal_code?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          attributes?: Json | null
          city?: string | null
          country?: Database["public"]["Enums"]["country_enum"] | null
          created_at?: string
          description?: string | null
          facility_type?:
            | Database["public"]["Enums"]["facility_type_enum"]
            | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          membership_required?: boolean
          name?: string
          organization_id?: string
          postal_code?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_contact: {
        Row: {
          attributes: Json | null
          contact_type: Database["public"]["Enums"]["facility_contact_type_enum"]
          created_at: string
          email: string | null
          facility_id: string
          id: string
          is_primary: boolean
          notes: string | null
          phone: string | null
          sport_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          attributes?: Json | null
          contact_type: Database["public"]["Enums"]["facility_contact_type_enum"]
          created_at?: string
          email?: string | null
          facility_id: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          phone?: string | null
          sport_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          attributes?: Json | null
          contact_type?: Database["public"]["Enums"]["facility_contact_type_enum"]
          created_at?: string
          email?: string | null
          facility_id?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          phone?: string | null
          sport_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_contact_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_contacts_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_file: {
        Row: {
          display_order: number | null
          facility_id: string
          file_id: string
          id: string
          is_primary: boolean | null
        }
        Insert: {
          display_order?: number | null
          facility_id: string
          file_id: string
          id?: string
          is_primary?: boolean | null
        }
        Update: {
          display_order?: number | null
          facility_id?: string
          file_id?: string
          id?: string
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_file_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_file_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_image: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          facility_id: string
          file_size: number | null
          id: string
          is_primary: boolean
          metadata: Json | null
          mime_type: string | null
          storage_key: string
          thumbnail_url: string | null
          uploaded_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          facility_id: string
          file_size?: number | null
          id?: string
          is_primary?: boolean
          metadata?: Json | null
          mime_type?: string | null
          storage_key: string
          thumbnail_url?: string | null
          uploaded_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          facility_id?: string
          file_size?: number | null
          id?: string
          is_primary?: boolean
          metadata?: Json | null
          mime_type?: string | null
          storage_key?: string
          thumbnail_url?: string | null
          uploaded_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_image_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_sport: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          sport_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          sport_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          sport_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_sport_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_sport_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      file: {
        Row: {
          created_at: string
          deleted_at: string | null
          file_size: number
          file_type: Database["public"]["Enums"]["file_type_enum"]
          id: string
          is_deleted: boolean
          metadata: Json | null
          mime_type: string
          original_name: string
          storage_key: string
          thumbnail_url: string | null
          updated_at: string
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          file_size: number
          file_type: Database["public"]["Enums"]["file_type_enum"]
          id?: string
          is_deleted?: boolean
          metadata?: Json | null
          mime_type: string
          original_name: string
          storage_key: string
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          file_size?: number
          file_type?: Database["public"]["Enums"]["file_type_enum"]
          id?: string
          is_deleted?: boolean
          metadata?: Json | null
          mime_type?: string
          original_name?: string
          storage_key?: string
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation: {
        Row: {
          accepted_at: string | null
          admin_role: Database["public"]["Enums"]["admin_role_enum"] | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_user_id: string | null
          inviter_id: string
          metadata: Json | null
          organization_id: string | null
          phone: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["app_role_enum"]
          source: Database["public"]["Enums"]["invite_source_enum"]
          status: Database["public"]["Enums"]["invite_status_enum"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          admin_role?: Database["public"]["Enums"]["admin_role_enum"] | null
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          invited_user_id?: string | null
          inviter_id: string
          metadata?: Json | null
          organization_id?: string | null
          phone?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["app_role_enum"]
          source?: Database["public"]["Enums"]["invite_source_enum"]
          status?: Database["public"]["Enums"]["invite_status_enum"]
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          admin_role?: Database["public"]["Enums"]["admin_role_enum"] | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_user_id?: string | null
          inviter_id?: string
          metadata?: Json | null
          organization_id?: string | null
          phone?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["app_role_enum"]
          source?: Database["public"]["Enums"]["invite_source_enum"]
          status?: Database["public"]["Enums"]["invite_status_enum"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      match: {
        Row: {
          booking_id: string | null
          created_at: string | null
          created_by: string
          end_time: string
          id: string
          location_address: string | null
          location_name: string | null
          match_date: string
          match_type: Database["public"]["Enums"]["match_type"]
          notes: string | null
          sport_id: string
          start_time: string
          status: Database["public"]["Enums"]["match_status"] | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          created_by: string
          end_time: string
          id?: string
          location_address?: string | null
          location_name?: string | null
          match_date: string
          match_type: Database["public"]["Enums"]["match_type"]
          notes?: string | null
          sport_id: string
          start_time: string
          status?: Database["public"]["Enums"]["match_status"] | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          created_by?: string
          end_time?: string
          id?: string
          location_address?: string | null
          location_name?: string | null
          match_date?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          notes?: string | null
          sport_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["match_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participant: {
        Row: {
          created_at: string | null
          id: string
          invitation_status: Database["public"]["Enums"]["member_status"] | null
          is_host: boolean | null
          match_id: string
          player_id: string
          score: number | null
          team_number: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invitation_status?:
            | Database["public"]["Enums"]["member_status"]
            | null
          is_host?: boolean | null
          match_id: string
          player_id: string
          score?: number | null
          team_number?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invitation_status?:
            | Database["public"]["Enums"]["member_status"]
            | null
          is_host?: boolean | null
          match_id?: string
          player_id?: string
          score?: number | null
          team_number?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_participant_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participant_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      match_result: {
        Row: {
          created_at: string | null
          id: string
          is_verified: boolean | null
          match_id: string
          team1_score: number | null
          team2_score: number | null
          updated_at: string | null
          verified_at: string | null
          winning_team: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          match_id: string
          team1_score?: number | null
          team2_score?: number | null
          updated_at?: string | null
          verified_at?: string | null
          winning_team?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          match_id?: string
          team1_score?: number | null
          team2_score?: number | null
          updated_at?: string | null
          verified_at?: string | null
          winning_team?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_result_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
        ]
      }
      message: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read_by: Json | null
          sender_id: string
          status: Database["public"]["Enums"]["message_status"] | null
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read_by?: Json | null
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"] | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_by?: Json | null
          sender_id?: string
          status?: Database["public"]["Enums"]["message_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      network: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_private: boolean | null
          name: string
          network_type_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          name: string
          network_type_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
          network_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_network_type_id_fkey"
            columns: ["network_type_id"]
            isOneToOne: false
            referencedRelation: "network_type"
            referencedColumns: ["id"]
          },
        ]
      }
      network_member: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          network_id: string
          player_id: string
          status: Database["public"]["Enums"]["network_member_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          network_id: string
          player_id: string
          status?: Database["public"]["Enums"]["network_member_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          network_id?: string
          player_id?: string
          status?: Database["public"]["Enums"]["network_member_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_member_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "network"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_member_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      network_type: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      notification: {
        Row: {
          body: string | null
          created_at: string
          expires_at: string | null
          id: string
          payload: Json | null
          read_at: string | null
          target_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          target_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          target_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      organization: {
        Row: {
          address: string | null
          city: string | null
          country: Database["public"]["Enums"]["country_enum"] | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          nature: Database["public"]["Enums"]["organization_nature_enum"]
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          slug: string
          type: Database["public"]["Enums"]["organization_type_enum"] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: Database["public"]["Enums"]["country_enum"] | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          nature: Database["public"]["Enums"]["organization_nature_enum"]
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          slug: string
          type?: Database["public"]["Enums"]["organization_type_enum"] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: Database["public"]["Enums"]["country_enum"] | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          nature?: Database["public"]["Enums"]["organization_nature_enum"]
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          slug?: string
          type?: Database["public"]["Enums"]["organization_type_enum"] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_member: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          left_at: string | null
          organization_id: string
          permissions: Json | null
          role: Database["public"]["Enums"]["role_enum"]
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          left_at?: string | null
          organization_id: string
          permissions?: Json | null
          role: Database["public"]["Enums"]["role_enum"]
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          left_at?: string | null
          organization_id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["role_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_member_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_member_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_member_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_rating_request: {
        Row: {
          assigned_rating_score_id: string | null
          created_at: string
          evaluator_id: string
          expires_at: string
          id: string
          message: string | null
          rating_system_id: string
          requester_id: string
          responded_at: string | null
          response_message: string | null
          status: Database["public"]["Enums"]["rating_request_status_enum"]
          updated_at: string
        }
        Insert: {
          assigned_rating_score_id?: string | null
          created_at?: string
          evaluator_id: string
          expires_at: string
          id?: string
          message?: string | null
          rating_system_id: string
          requester_id: string
          responded_at?: string | null
          response_message?: string | null
          status?: Database["public"]["Enums"]["rating_request_status_enum"]
          updated_at?: string
        }
        Update: {
          assigned_rating_score_id?: string | null
          created_at?: string
          evaluator_id?: string
          expires_at?: string
          id?: string
          message?: string | null
          rating_system_id?: string
          requester_id?: string
          responded_at?: string | null
          response_message?: string | null
          status?: Database["public"]["Enums"]["rating_request_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_rating_requests_assigned_rating_score_id_fkey"
            columns: ["assigned_rating_score_id"]
            isOneToOne: false
            referencedRelation: "rating_score"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_rating_requests_rating_system_id_fkey"
            columns: ["rating_system_id"]
            isOneToOne: false
            referencedRelation: "rating_system"
            referencedColumns: ["id"]
          },
        ]
      }
      play_attribute: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sport_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sport_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sport_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "play_attributes_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      play_style: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sport_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sport_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sport_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "play_styles_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      player: {
        Row: {
          created_at: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          max_travel_distance: number | null
          notification_match_requests: boolean | null
          notification_messages: boolean | null
          notification_reminders: boolean | null
          playing_hand: Database["public"]["Enums"]["playing_hand"] | null
          privacy_show_age: boolean | null
          privacy_show_location: boolean | null
          privacy_show_stats: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id: string
          max_travel_distance?: number | null
          notification_match_requests?: boolean | null
          notification_messages?: boolean | null
          notification_reminders?: boolean | null
          playing_hand?: Database["public"]["Enums"]["playing_hand"] | null
          privacy_show_age?: boolean | null
          privacy_show_location?: boolean | null
          privacy_show_stats?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          max_travel_distance?: number | null
          notification_match_requests?: boolean | null
          notification_messages?: boolean | null
          notification_reminders?: boolean | null
          playing_hand?: Database["public"]["Enums"]["playing_hand"] | null
          privacy_show_age?: boolean | null
          privacy_show_location?: boolean | null
          privacy_show_stats?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      player_availability: {
        Row: {
          created_at: string
          day: Database["public"]["Enums"]["day_enum"]
          id: string
          is_active: boolean
          period: Database["public"]["Enums"]["period_enum"]
          player_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day: Database["public"]["Enums"]["day_enum"]
          id?: string
          is_active?: boolean
          period: Database["public"]["Enums"]["period_enum"]
          player_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day?: Database["public"]["Enums"]["day_enum"]
          id?: string
          is_active?: boolean
          period?: Database["public"]["Enums"]["period_enum"]
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_availability_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      player_play_attribute: {
        Row: {
          created_at: string | null
          id: string
          play_attribute_id: string
          player_sport_profile_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          play_attribute_id: string
          player_sport_profile_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          play_attribute_id?: string
          player_sport_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_play_attributes_play_attribute_id_fkey"
            columns: ["play_attribute_id"]
            isOneToOne: false
            referencedRelation: "play_attribute"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_play_attributes_player_sport_profile_id_fkey"
            columns: ["player_sport_profile_id"]
            isOneToOne: false
            referencedRelation: "player_sport_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      player_rating_score: {
        Row: {
          assigned_at: string
          certified_at: string | null
          certified_via:
            | Database["public"]["Enums"]["rating_certification_method_enum"]
            | null
          created_at: string
          evaluations_count: number
          expires_at: string | null
          external_rating_score_id: string | null
          id: string
          is_certified: boolean
          last_evaluated_at: string | null
          notes: string | null
          player_id: string
          rating_score_id: string
          referrals_count: number
          source: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          certified_at?: string | null
          certified_via?:
            | Database["public"]["Enums"]["rating_certification_method_enum"]
            | null
          created_at?: string
          evaluations_count?: number
          expires_at?: string | null
          external_rating_score_id?: string | null
          id?: string
          is_certified?: boolean
          last_evaluated_at?: string | null
          notes?: string | null
          player_id: string
          rating_score_id: string
          referrals_count?: number
          source?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          certified_at?: string | null
          certified_via?:
            | Database["public"]["Enums"]["rating_certification_method_enum"]
            | null
          created_at?: string
          evaluations_count?: number
          expires_at?: string | null
          external_rating_score_id?: string | null
          id?: string
          is_certified?: boolean
          last_evaluated_at?: string | null
          notes?: string | null
          player_id?: string
          rating_score_id?: string
          referrals_count?: number
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_rating_scores_external_rating_score_id_fkey"
            columns: ["external_rating_score_id"]
            isOneToOne: false
            referencedRelation: "rating_score"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_rating_scores_rating_score_id_fkey"
            columns: ["rating_score_id"]
            isOneToOne: false
            referencedRelation: "rating_score"
            referencedColumns: ["id"]
          },
        ]
      }
      player_review: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          match_id: string | null
          rating: number | null
          reviewed_id: string
          reviewer_id: string
          skill_rating_score_id: string | null
          skill_rating_value: number | null
          sport_id: string | null
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          match_id?: string | null
          rating?: number | null
          reviewed_id: string
          reviewer_id: string
          skill_rating_score_id?: string | null
          skill_rating_value?: number | null
          sport_id?: string | null
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          match_id?: string | null
          rating?: number | null
          reviewed_id?: string
          reviewer_id?: string
          skill_rating_score_id?: string | null
          skill_rating_value?: number | null
          sport_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_review_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_review_reviewed_id_fkey"
            columns: ["reviewed_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_review_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      player_sport: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          player_id: string
          preferred_court: string | null
          preferred_match_duration:
            | Database["public"]["Enums"]["match_duration"]
            | null
          preferred_match_type: Database["public"]["Enums"]["match_type"] | null
          preferred_play_attributes:
            | Database["public"]["Enums"]["play_attribute_enum"][]
            | null
          preferred_play_style:
            | Database["public"]["Enums"]["play_style_enum"]
            | null
          sport_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          player_id: string
          preferred_court?: string | null
          preferred_match_duration?:
            | Database["public"]["Enums"]["match_duration"]
            | null
          preferred_match_type?:
            | Database["public"]["Enums"]["match_type"]
            | null
          preferred_play_attributes?:
            | Database["public"]["Enums"]["play_attribute_enum"][]
            | null
          preferred_play_style?:
            | Database["public"]["Enums"]["play_style_enum"]
            | null
          sport_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          player_id?: string
          preferred_court?: string | null
          preferred_match_duration?:
            | Database["public"]["Enums"]["match_duration"]
            | null
          preferred_match_type?:
            | Database["public"]["Enums"]["match_type"]
            | null
          preferred_play_attributes?:
            | Database["public"]["Enums"]["play_attribute_enum"][]
            | null
          preferred_play_style?:
            | Database["public"]["Enums"]["play_style_enum"]
            | null
          sport_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_sport_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_sport_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      player_sport_profile: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          play_style_id: string | null
          player_id: string
          preferred_court_surface:
            | Database["public"]["Enums"]["surface_type_enum"]
            | null
          preferred_facility_id: string | null
          preferred_match_duration: Database["public"]["Enums"]["match_duration_enum"]
          preferred_match_type: Database["public"]["Enums"]["match_type_enum"]
          sport_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          play_style_id?: string | null
          player_id: string
          preferred_court_surface?:
            | Database["public"]["Enums"]["surface_type_enum"]
            | null
          preferred_facility_id?: string | null
          preferred_match_duration: Database["public"]["Enums"]["match_duration_enum"]
          preferred_match_type: Database["public"]["Enums"]["match_type_enum"]
          sport_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          play_style_id?: string | null
          player_id?: string
          preferred_court_surface?:
            | Database["public"]["Enums"]["surface_type_enum"]
            | null
          preferred_facility_id?: string | null
          preferred_match_duration?: Database["public"]["Enums"]["match_duration_enum"]
          preferred_match_type?: Database["public"]["Enums"]["match_type_enum"]
          sport_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_sport_profiles_play_style_id_fkey"
            columns: ["play_style_id"]
            isOneToOne: false
            referencedRelation: "play_style"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_sport_profiles_preferred_facility_id_fkey"
            columns: ["preferred_facility_id"]
            isOneToOne: false
            referencedRelation: "facility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_sport_profiles_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"] | null
          address: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string | null
          display_name: string | null
          email: string
          email_verified: boolean | null
          full_name: string
          id: string
          is_active: boolean | null
          last_active_at: string | null
          onboarding_completed: boolean | null
          phone: string | null
          phone_verified: boolean | null
          postal_code: string | null
          profile_picture_url: string | null
          province: string | null
          updated_at: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          address?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          email_verified?: boolean | null
          full_name: string
          id: string
          is_active?: boolean | null
          last_active_at?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          phone_verified?: boolean | null
          postal_code?: string | null
          profile_picture_url?: string | null
          province?: string | null
          updated_at?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          address?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_active_at?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          phone_verified?: boolean | null
          postal_code?: string | null
          profile_picture_url?: string | null
          province?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rating: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          max_value: number | null
          min_value: number | null
          rating_type: Database["public"]["Enums"]["rating_type"]
          sport_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          max_value?: number | null
          min_value?: number | null
          rating_type: Database["public"]["Enums"]["rating_type"]
          sport_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          max_value?: number | null
          min_value?: number | null
          rating_type?: Database["public"]["Enums"]["rating_type"]
          sport_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rating_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_proof: {
        Row: {
          created_at: string
          description: string | null
          external_url: string | null
          file_id: string | null
          id: string
          is_active: boolean
          player_rating_score_id: string
          proof_type: Database["public"]["Enums"]["proof_type_enum"]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["proof_status_enum"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_id?: string | null
          id?: string
          is_active?: boolean
          player_rating_score_id: string
          proof_type: Database["public"]["Enums"]["proof_type_enum"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["proof_status_enum"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_id?: string | null
          id?: string
          is_active?: boolean
          player_rating_score_id?: string
          proof_type?: Database["public"]["Enums"]["proof_type_enum"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["proof_status_enum"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_proof_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_proof_player_rating_score_id_fkey"
            columns: ["player_rating_score_id"]
            isOneToOne: false
            referencedRelation: "player_rating_score"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_proof_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_reference_request: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          message: string | null
          player_rating_score_id: string
          rating_supported: boolean
          referee_id: string
          requester_id: string
          responded_at: string | null
          response_message: string | null
          status: Database["public"]["Enums"]["rating_request_status_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          message?: string | null
          player_rating_score_id: string
          rating_supported?: boolean
          referee_id: string
          requester_id: string
          responded_at?: string | null
          response_message?: string | null
          status?: Database["public"]["Enums"]["rating_request_status_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          player_rating_score_id?: string
          rating_supported?: boolean
          referee_id?: string
          requester_id?: string
          responded_at?: string | null
          response_message?: string | null
          status?: Database["public"]["Enums"]["rating_request_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_reference_requests_player_rating_score_id_fkey"
            columns: ["player_rating_score_id"]
            isOneToOne: false
            referencedRelation: "player_rating_score"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_score: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          max_value: number | null
          min_value: number | null
          rating_system_id: string
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          max_value?: number | null
          min_value?: number | null
          rating_system_id: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          max_value?: number | null
          min_value?: number | null
          rating_system_id?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rating_scores_rating_system_id_fkey"
            columns: ["rating_system_id"]
            isOneToOne: false
            referencedRelation: "rating_system"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_system: {
        Row: {
          code: string
          created_at: string
          default_initial_value: number | null
          description: string | null
          id: string
          is_active: boolean
          max_value: number
          min_for_referral: number | null
          min_value: number
          name: string
          sport_id: string
          step: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_initial_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_value: number
          min_for_referral?: number | null
          min_value: number
          name: string
          sport_id: string
          step?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_initial_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_value?: number
          min_for_referral?: number | null
          min_value?: number
          name?: string
          sport_id?: string
          step?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_systems_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sport"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_request: {
        Row: {
          claimed_rating_score_id: string
          completed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          referee_comment: string | null
          referee_id: string
          reference_rating_score_id: string | null
          reference_rating_value: number | null
          requester_id: string
          responded_at: string | null
          sport_id: string
          status: string
        }
        Insert: {
          claimed_rating_score_id: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          referee_comment?: string | null
          referee_id: string
          reference_rating_score_id?: string | null
          reference_rating_value?: number | null
          requester_id: string
          responded_at?: string | null
          sport_id: string
          status?: string
        }
        Update: {
          claimed_rating_score_id?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          referee_comment?: string | null
          referee_id?: string
          reference_rating_score_id?: string | null
          reference_rating_value?: number | null
          requester_id?: string
          responded_at?: string | null
          sport_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_request_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_request_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      report: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          match_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id: string
          reporter_id: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          match_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id: string
          reporter_id: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          match_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_id?: string
          reporter_id?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["id"]
          },
        ]
      }
      sport: {
        Row: {
          attributes: Json | null
          created_at: string
          description: string | null
          display_name: string
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          attributes?: Json | null
          created_at?: string
          description?: string | null
          display_name: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          attributes?: Json | null
          created_at?: string
          description?: string | null
          display_name?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      verification_code: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          ip_address: string | null
          used: boolean | null
          used_at: string | null
          user_agent: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          ip_address?: string | null
          used?: boolean | null
          used_at?: string | null
          user_agent?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          used?: boolean | null
          used_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      waitlist_signup: {
        Row: {
          created_at: string | null
          email: string
          id: number
          ip_address: string | null
          location: string | null
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: never
          ip_address?: string | null
          location?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: never
          ip_address?: string | null
          location?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_peer_verification_threshold: {
        Args: { p_player_id: string; p_sport_id: string; p_threshold?: number }
        Returns: {
          average_rating: number
          peer_count: number
          recommended_rating_score_id: string
          should_create_verified: boolean
        }[]
      }
      expire_old_reference_requests: { Args: never; Returns: number }
      get_gender_types: {
        Args: never
        Returns: {
          label: string
          value: string
        }[]
      }
      get_match_duration_types: {
        Args: never
        Returns: {
          label: string
          value: string
        }[]
      }
      get_match_type_types: {
        Args: never
        Returns: {
          label: string
          value: string
        }[]
      }
      get_players_by_play_attributes: {
        Args: {
          p_play_attributes: Database["public"]["Enums"]["play_attribute_enum"][]
          p_sport_id: string
        }
        Returns: {
          matching_attributes: number
          play_attributes: Database["public"]["Enums"]["play_attribute_enum"][]
          play_style: Database["public"]["Enums"]["play_style_enum"]
          player_id: string
        }[]
      }
      get_players_by_play_style: {
        Args: {
          p_play_style: Database["public"]["Enums"]["play_style_enum"]
          p_sport_id: string
        }
        Returns: {
          play_attributes: Database["public"]["Enums"]["play_attribute_enum"][]
          play_style: Database["public"]["Enums"]["play_style_enum"]
          player_id: string
        }[]
      }
      get_playing_hand_types: {
        Args: never
        Returns: {
          label: string
          value: string
        }[]
      }
      get_rating_scores_by_type: {
        Args: {
          p_rating_type: Database["public"]["Enums"]["rating_type"]
          p_sport_name: string
        }
        Returns: {
          description: string
          display_label: string
          id: string
          score_value: number
          skill_level: Database["public"]["Enums"]["skill_level"]
        }[]
      }
    }
    Enums: {
      account_status:
        | "active"
        | "suspended"
        | "deleted"
        | "pending_verification"
      admin_role_enum: "super_admin" | "moderator" | "support"
      app_role_enum: "player" | "organization_member" | "admin"
      availability_enum:
        | "available"
        | "unavailable"
        | "maintenance"
        | "reserved"
        | "under_maintenance"
        | "closed"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      conversation_type: "direct" | "group" | "match" | "announcement"
      country_enum: "Canada" | "United States"
      court_surface: "hard" | "clay" | "grass" | "carpet" | "synthetic"
      court_type: "indoor" | "outdoor" | "covered"
      day_enum:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      delivery_channel_enum: "email" | "sms" | "push"
      delivery_status_enum: "pending" | "success" | "failed"
      facility_contact_type_enum:
        | "general"
        | "reservation"
        | "maintenance"
        | "other"
      facility_type_enum:
        | "park"
        | "club"
        | "indoor_center"
        | "private"
        | "other"
        | "community_club"
        | "municipal"
        | "university"
        | "school"
        | "community_center"
      file_type_enum: "image" | "video" | "document" | "audio" | "other"
      gender_enum: "M" | "F" | "O" | "prefer_not_to_say"
      gender_type: "male" | "female" | "other" | "prefer_not_to_say"
      invite_source_enum:
        | "manual"
        | "auto_match"
        | "invite_list"
        | "mailing_list"
        | "growth_prompt"
      invite_status_enum:
        | "pending"
        | "sent"
        | "accepted"
        | "expired"
        | "bounced"
        | "cancelled"
      match_duration: "1h" | "1.5h" | "2h"
      match_duration_enum: "30" | "60" | "90" | "120"
      match_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      match_type: "casual" | "competitive" | "both"
      match_type_enum: "practice" | "competitive" | "both"
      member_role: "owner" | "admin" | "manager" | "staff" | "member"
      member_status: "active" | "inactive" | "pending" | "suspended"
      message_status: "sent" | "delivered" | "read" | "failed"
      network_member_status: "active" | "pending" | "blocked" | "removed"
      network_visibility: "public" | "private" | "friends" | "club"
      notification_status: "unread" | "read" | "archived"
      notification_type:
        | "match_request"
        | "match_confirmation"
        | "match_cancellation"
        | "message"
        | "friend_request"
        | "system"
      notification_type_enum:
        | "match_invitation"
        | "reminder"
        | "payment"
        | "support"
        | "chat"
        | "system"
      organization_nature_enum: "public" | "private"
      organization_type:
        | "club"
        | "facility"
        | "league"
        | "academy"
        | "association"
      organization_type_enum: "club" | "municipality" | "city" | "association"
      payment_method:
        | "credit_card"
        | "debit_card"
        | "paypal"
        | "cash"
        | "bank_transfer"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      period_enum: "morning" | "afternoon" | "evening"
      play_attribute_enum:
        | "serve_speed_and_placement"
        | "net_play"
        | "court_coverage"
        | "forehand_power"
        | "shot_selection"
        | "spin_control"
      play_style_enum:
        | "counterpuncher"
        | "aggressive_baseliner"
        | "serve_and_volley"
        | "all_court"
      playing_hand: "left" | "right" | "both"
      playing_hand_enum: "right" | "left" | "both"
      proof_status_enum: "pending" | "approved" | "rejected"
      proof_type_enum: "external_link" | "file"
      rating_certification_method_enum:
        | "external_rating"
        | "proof"
        | "referrals"
      rating_request_status_enum:
        | "pending"
        | "completed"
        | "declined"
        | "expired"
        | "cancelled"
      rating_source_type:
        | "self_reported"
        | "api_verified"
        | "peer_verified"
        | "admin_verified"
        | "reference_verified"
      rating_type: "ntrp" | "utr" | "dupr" | "self_assessment"
      report_reason:
        | "inappropriate_behavior"
        | "harassment"
        | "spam"
        | "cheating"
        | "other"
      report_status: "pending" | "under_review" | "resolved" | "dismissed"
      role_enum: "admin" | "staff" | "player" | "coach" | "owner"
      skill_level: "beginner" | "intermediate" | "advanced" | "professional"
      surface_type_enum:
        | "hard"
        | "clay"
        | "grass"
        | "synthetic"
        | "carpet"
        | "concrete"
        | "asphalt"
      time_period: "morning" | "afternoon" | "evening" | "night"
      user_role: "player" | "admin" | "super_admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: [
        "active",
        "suspended",
        "deleted",
        "pending_verification",
      ],
      admin_role_enum: ["super_admin", "moderator", "support"],
      app_role_enum: ["player", "organization_member", "admin"],
      availability_enum: [
        "available",
        "unavailable",
        "maintenance",
        "reserved",
        "under_maintenance",
        "closed",
      ],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      conversation_type: ["direct", "group", "match", "announcement"],
      country_enum: ["Canada", "United States"],
      court_surface: ["hard", "clay", "grass", "carpet", "synthetic"],
      court_type: ["indoor", "outdoor", "covered"],
      day_enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      day_of_week: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      delivery_channel_enum: ["email", "sms", "push"],
      delivery_status_enum: ["pending", "success", "failed"],
      facility_contact_type_enum: [
        "general",
        "reservation",
        "maintenance",
        "other",
      ],
      facility_type_enum: [
        "park",
        "club",
        "indoor_center",
        "private",
        "other",
        "community_club",
        "municipal",
        "university",
        "school",
        "community_center",
      ],
      file_type_enum: ["image", "video", "document", "audio", "other"],
      gender_enum: ["M", "F", "O", "prefer_not_to_say"],
      gender_type: ["male", "female", "other", "prefer_not_to_say"],
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
      match_duration: ["1h", "1.5h", "2h"],
      match_duration_enum: ["30", "60", "90", "120"],
      match_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      match_type: ["casual", "competitive", "both"],
      match_type_enum: ["practice", "competitive", "both"],
      member_role: ["owner", "admin", "manager", "staff", "member"],
      member_status: ["active", "inactive", "pending", "suspended"],
      message_status: ["sent", "delivered", "read", "failed"],
      network_member_status: ["active", "pending", "blocked", "removed"],
      network_visibility: ["public", "private", "friends", "club"],
      notification_status: ["unread", "read", "archived"],
      notification_type: [
        "match_request",
        "match_confirmation",
        "match_cancellation",
        "message",
        "friend_request",
        "system",
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
      organization_type: [
        "club",
        "facility",
        "league",
        "academy",
        "association",
      ],
      organization_type_enum: ["club", "municipality", "city", "association"],
      payment_method: [
        "credit_card",
        "debit_card",
        "paypal",
        "cash",
        "bank_transfer",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      period_enum: ["morning", "afternoon", "evening"],
      play_attribute_enum: [
        "serve_speed_and_placement",
        "net_play",
        "court_coverage",
        "forehand_power",
        "shot_selection",
        "spin_control",
      ],
      play_style_enum: [
        "counterpuncher",
        "aggressive_baseliner",
        "serve_and_volley",
        "all_court",
      ],
      playing_hand: ["left", "right", "both"],
      playing_hand_enum: ["right", "left", "both"],
      proof_status_enum: ["pending", "approved", "rejected"],
      proof_type_enum: ["external_link", "file"],
      rating_certification_method_enum: [
        "external_rating",
        "proof",
        "referrals",
      ],
      rating_request_status_enum: [
        "pending",
        "completed",
        "declined",
        "expired",
        "cancelled",
      ],
      rating_source_type: [
        "self_reported",
        "api_verified",
        "peer_verified",
        "admin_verified",
        "reference_verified",
      ],
      rating_type: ["ntrp", "utr", "dupr", "self_assessment"],
      report_reason: [
        "inappropriate_behavior",
        "harassment",
        "spam",
        "cheating",
        "other",
      ],
      report_status: ["pending", "under_review", "resolved", "dismissed"],
      role_enum: ["admin", "staff", "player", "coach", "owner"],
      skill_level: ["beginner", "intermediate", "advanced", "professional"],
      surface_type_enum: [
        "hard",
        "clay",
        "grass",
        "synthetic",
        "carpet",
        "concrete",
        "asphalt",
      ],
      time_period: ["morning", "afternoon", "evening", "night"],
      user_role: ["player", "admin", "super_admin"],
    },
  },
} as const

