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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
