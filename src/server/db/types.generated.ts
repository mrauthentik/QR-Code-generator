export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type QRStatus = "active" | "paused" | "archived";

export interface GenericRelationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

export type Database = {
  public: {
    Tables: {
      qr_codes: {
        Row: {
          id: string;
          owner_id: string;
          slug: string;
          name: string;
          destination_url: string;
          status: QRStatus;
          style: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          slug: string;
          name: string;
          destination_url: string;
          status?: QRStatus;
          style?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          slug?: string;
          name?: string;
          destination_url?: string;
          status?: QRStatus;
          style?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: GenericRelationship[];
      };
      scans: {
        Row: {
          id: number;
          qr_id: string;
          scanned_at: string;
          country: string | null;
          region: string | null;
          city: string | null;
          device_type: string | null;
          os: string | null;
          browser: string | null;
          referrer_host: string | null;
          visitor_hash: string;
          is_unique_in_day: boolean | null;
        };
        Insert: {
          id?: number;
          qr_id: string;
          scanned_at?: string;
          country?: string | null;
          region?: string | null;
          city?: string | null;
          device_type?: string | null;
          os?: string | null;
          browser?: string | null;
          referrer_host?: string | null;
          visitor_hash: string;
          is_unique_in_day?: boolean | null;
        };
        Update: {
          id?: number;
          qr_id?: string;
          scanned_at?: string;
          country?: string | null;
          region?: string | null;
          city?: string | null;
          device_type?: string | null;
          os?: string | null;
          browser?: string | null;
          referrer_host?: string | null;
          visitor_hash?: string;
          is_unique_in_day?: boolean | null;
        };
        Relationships: GenericRelationship[];
      };
      qr_destination_history: {
        Row: {
          id: number;
          qr_id: string;
          old_url: string;
          new_url: string;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          id?: number;
          qr_id: string;
          old_url: string;
          new_url: string;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: number;
          qr_id?: string;
          old_url?: string;
          new_url?: string;
          changed_by?: string | null;
          changed_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      scan_daily_stats: {
        Row: {
          id: number;
          qr_id: string;
          day: string;
          total_scans: number;
          unique_visitors: number;
          country_breakdown: Json;
          device_breakdown: Json;
          os_breakdown: Json;
          browser_breakdown: Json;
          referrer_breakdown: Json;
          updated_at: string;
        };
        Insert: {
          id?: number;
          qr_id: string;
          day: string;
          total_scans?: number;
          unique_visitors?: number;
          country_breakdown?: Json;
          device_breakdown?: Json;
          os_breakdown?: Json;
          browser_breakdown?: Json;
          referrer_breakdown?: Json;
          updated_at?: string;
        };
        Update: {
          id?: number;
          qr_id?: string;
          day?: string;
          total_scans?: number;
          unique_visitors?: number;
          country_breakdown?: Json;
          device_breakdown?: Json;
          os_breakdown?: Json;
          browser_breakdown?: Json;
          referrer_breakdown?: Json;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      resolve_redirect_destination: {
        Args: {
          p_slug: string;
        };
        Returns: {
          qr_id: string;
          destination_url: string;
          status: string;
        }[];
      };
      rollup_scans_for_date: {
        Args: {
          p_target_date: string;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
