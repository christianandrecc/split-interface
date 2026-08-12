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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          address_line: string | null
          address_city: string | null
          address_country: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          admin_collection_share: string | null
          admin_company_name: string | null
          admin_ipi: string | null
          city: string | null
          country: string | null
          custom_pro_name: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          ipi_number: string | null
          legal_address: string | null
          legal_first_name: string | null
          legal_last_name: string | null
          legal_middle_name: string | null
          legal_name: string | null
          mlc_number: string | null
          phone_country_code: string | null
          phone_number: string | null
          pka_names: string | null
          pro_affiliation: string | null
          profile_data: Json
          profile_image_url: string | null
          profile_location: string | null
          profile_visibility: string | null
          publisher_contact: string | null
          publisher_ipi: string | null
          publisher_name: string | null
          publisher_pro: string | null
          publishing_share: string | null
          publishing_status: string | null
          role_tags: string | null
          social_instagram: string | null
          social_tiktok: string | null
          social_website: string | null
          social_x: string | null
          stage_name: string | null
          state: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
          username: string | null
          zip_code: string | null
        }
        Insert: {
          address_line?: string | null
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          admin_collection_share?: string | null
          admin_company_name?: string | null
          admin_ipi?: string | null
          city?: string | null
          country?: string | null
          custom_pro_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          ipi_number?: string | null
          legal_address?: string | null
          legal_first_name?: string | null
          legal_last_name?: string | null
          legal_middle_name?: string | null
          legal_name?: string | null
          mlc_number?: string | null
          phone_country_code?: string | null
          phone_number?: string | null
          pka_names?: string | null
          pro_affiliation?: string | null
          profile_data?: Json
          profile_image_url?: string | null
          profile_location?: string | null
          profile_visibility?: string | null
          publisher_contact?: string | null
          publisher_ipi?: string | null
          publisher_name?: string | null
          publisher_pro?: string | null
          publishing_share?: string | null
          publishing_status?: string | null
          role_tags?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_website?: string | null
          social_x?: string | null
          stage_name?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line?: string | null
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          admin_collection_share?: string | null
          admin_company_name?: string | null
          admin_ipi?: string | null
          city?: string | null
          country?: string | null
          custom_pro_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          ipi_number?: string | null
          legal_address?: string | null
          legal_first_name?: string | null
          legal_last_name?: string | null
          legal_middle_name?: string | null
          legal_name?: string | null
          mlc_number?: string | null
          phone_country_code?: string | null
          phone_number?: string | null
          pka_names?: string | null
          pro_affiliation?: string | null
          profile_data?: Json
          profile_image_url?: string | null
          profile_location?: string | null
          profile_visibility?: string | null
          publisher_contact?: string | null
          publisher_ipi?: string | null
          publisher_name?: string | null
          publisher_pro?: string | null
          publishing_share?: string | null
          publishing_status?: string | null
          role_tags?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_website?: string | null
          social_x?: string | null
          stage_name?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      split_sheet_audit_records: {
        Row: {
          action: string
          actor_label: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          split_sheet_id: string
        }
        Insert: {
          action: string
          actor_label: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          split_sheet_id: string
        }
        Update: {
          action?: string
          actor_label?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          split_sheet_id?: string
        }
        Relationships: []
      }
      split_sheet_collaborators: {
        Row: {
          approval_status: string
          collaborator_user_id: string | null
          contribution_categories: Json
          contribution_notes: string | null
          created_at: string
          display_name: string | null
          id: string
          invite_email: string | null
          invite_method: string
          invite_phone: string | null
          invite_status: string
          invite_value: string | null
          legal_name: string | null
          party_id: string
          percentage: number
          profile_snapshot: Json
          responded_at: string | null
          role: string
          signature_status: string
          signed_at: string | null
          signing_order: number
          split_sheet_id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          approval_status?: string
          collaborator_user_id?: string | null
          contribution_categories?: Json
          contribution_notes?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          invite_email?: string | null
          invite_method?: string
          invite_phone?: string | null
          invite_status?: string
          invite_value?: string | null
          legal_name?: string | null
          party_id: string
          percentage?: number
          profile_snapshot?: Json
          responded_at?: string | null
          role?: string
          signature_status?: string
          signed_at?: string | null
          signing_order?: number
          split_sheet_id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          approval_status?: string
          collaborator_user_id?: string | null
          contribution_categories?: Json
          contribution_notes?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          invite_email?: string | null
          invite_method?: string
          invite_phone?: string | null
          invite_status?: string
          invite_value?: string | null
          legal_name?: string | null
          party_id?: string
          percentage?: number
          profile_snapshot?: Json
          responded_at?: string | null
          role?: string
          signature_status?: string
          signed_at?: string | null
          signing_order?: number
          split_sheet_id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      split_sheet_contract_deliveries: {
        Row: {
          created_at: string
          delivery_status: string
          error_message: string | null
          id: string
          payload: Json
          provider: string
          requested_by_label: string
          requested_by_user_id: string | null
          split_sheet_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          id?: string
          payload?: Json
          provider?: string
          requested_by_label: string
          requested_by_user_id?: string | null
          split_sheet_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          id?: string
          payload?: Json
          provider?: string
          requested_by_label?: string
          requested_by_user_id?: string | null
          split_sheet_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      split_sheet_proposal_versions: {
        Row: {
          allocations: Json
          created_at: string
          id: string
          notes: string | null
          proposed_by_label: string
          proposed_by_user_id: string | null
          split_sheet_id: string
          total_percentage: number
          version_number: number
        }
        Insert: {
          allocations?: Json
          created_at?: string
          id?: string
          notes?: string | null
          proposed_by_label: string
          proposed_by_user_id?: string | null
          split_sheet_id: string
          total_percentage?: number
          version_number: number
        }
        Update: {
          allocations?: Json
          created_at?: string
          id?: string
          notes?: string | null
          proposed_by_label?: string
          proposed_by_user_id?: string | null
          split_sheet_id?: string
          total_percentage?: number
          version_number?: number
        }
        Relationships: []
      }
      split_sheet_responses: {
        Row: {
          collaborator_id: string | null
          created_at: string
          id: string
          notes: string | null
          proposal_version_id: string | null
          responder_user_id: string | null
          response_type: string
          split_sheet_id: string
        }
        Insert: {
          collaborator_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          proposal_version_id?: string | null
          responder_user_id?: string | null
          response_type: string
          split_sheet_id: string
        }
        Update: {
          collaborator_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          proposal_version_id?: string | null
          responder_user_id?: string | null
          response_type?: string
          split_sheet_id?: string
        }
        Relationships: []
      }
      split_sheets: {
        Row: {
          artist_project_name: string | null
          contract_delivery_error: string | null
          contract_delivery_requested_at: string | null
          contract_delivery_status: string
          created_at: string
          creator_user_id: string
          current_proposal_id: string | null
          document_number: string
          document_payload: Json
          id: string
          sent_at: string | null
          split_total: number
          status: string
          stored_at: string | null
          title: string
          updated_at: string
          verified_at: string | null
          version: number
          work_title: string
        }
        Insert: {
          artist_project_name?: string | null
          contract_delivery_error?: string | null
          contract_delivery_requested_at?: string | null
          contract_delivery_status?: string
          created_at?: string
          creator_user_id: string
          current_proposal_id?: string | null
          document_number: string
          document_payload?: Json
          id?: string
          sent_at?: string | null
          split_total?: number
          status?: string
          stored_at?: string | null
          title: string
          updated_at?: string
          verified_at?: string | null
          version?: number
          work_title: string
        }
        Update: {
          artist_project_name?: string | null
          contract_delivery_error?: string | null
          contract_delivery_requested_at?: string | null
          contract_delivery_status?: string
          created_at?: string
          creator_user_id?: string
          current_proposal_id?: string | null
          document_number?: string
          document_payload?: Json
          id?: string
          sent_at?: string | null
          split_total?: number
          status?: string
          stored_at?: string | null
          title?: string
          updated_at?: string
          verified_at?: string | null
          version?: number
          work_title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_split_sheet_participant_update: {
        Args: {
          p_action: string
          p_actor_label?: string | null
          p_document_payload: Json
          p_notes?: string | null
          p_response_type?: string | null
          p_split_sheet_id: string
        }
        Returns: Json
      }
      resolve_split_sheet_collaborators: {
        Args: {
          p_split_sheet_id: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
