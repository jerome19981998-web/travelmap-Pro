export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          home_country: string | null;
          preferred_currency: string;
          theme_preference: string;
          color_scheme: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      places: {
        Row: {
          id: string;
          name: string;
          name_local: string | null;
          type: "country" | "city" | "neighborhood" | "landmark" | "region";
          country_code: string | null;
          country_name: string | null;
          continent: string | null;
          region: string | null;
          lat: number | null;
          lng: number | null;
          timezone: string | null;
          population: number | null;
          area_km2: number | null;
          osm_id: string | null;
          iso3166_1: string | null;
          iso3166_2: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["places"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["places"]["Insert"]>;
      };
      visits: {
        Row: {
          id: string;
          user_id: string;
          place_id: string | null;
          place_name: string;
          place_type: string;
          country_code: string | null;
          country_name: string | null;
          continent: string | null;
          lat: number | null;
          lng: number | null;
          visited_at: string | null;
          departed_at: string | null;
          notes: string | null;
          rating: number | null;
          ranking: number | null;
          is_quick_memory: boolean;
          is_private: boolean;
          cover_photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["visits"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["visits"]["Insert"]>;
      };
      visit_photos: {
        Row: {
          id: string;
          visit_id: string;
          user_id: string;
          url: string;
          caption: string | null;
          taken_at: string | null;
          is_cover: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["visit_photos"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["visit_photos"]["Insert"]>;
      };
      wishlist: {
        Row: {
          id: string;
          user_id: string;
          place_id: string | null;
          place_name: string;
          place_type: string;
          country_code: string | null;
          country_name: string | null;
          continent: string | null;
          lat: number | null;
          lng: number | null;
          priority: "high" | "medium" | "low";
          notes: string | null;
          target_year: number | null;
          is_private: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["wishlist"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["wishlist"]["Insert"]>;
      };
      annual_goals: {
        Row: {
          id: string;
          user_id: string;
          year: number;
          target_countries: number | null;
          target_cities: number | null;
          target_continents: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["annual_goals"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["annual_goals"]["Insert"]>;
      };
      badge_definitions: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          category: string;
          condition_type: string;
          condition_value: Json;
          tier: number;
        };
        Insert: Database["public"]["Tables"]["badge_definitions"]["Row"];
        Update: Partial<Database["public"]["Tables"]["badge_definitions"]["Row"]>;
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_badges"]["Row"], "id" | "earned_at">;
        Update: Partial<Database["public"]["Tables"]["user_badges"]["Insert"]>;
      };
      shared_maps: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          share_token: string;
          filter_type: string;
          filter_value: string | null;
          show_stats: boolean;
          show_badges: boolean;
          is_active: boolean;
          view_count: number;
          created_at: string;
          expires_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["shared_maps"]["Row"], "id" | "share_token" | "created_at" | "view_count">;
        Update: Partial<Database["public"]["Tables"]["shared_maps"]["Insert"]>;
      };
    };
    Views: {
      user_stats: {
        Row: {
          user_id: string;
          countries_visited: number;
          continents_visited: number;
          cities_visited: number;
          total_visits: number;
          first_visit: string | null;
          last_visit: string | null;
        };
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Place = Database["public"]["Tables"]["places"]["Row"];
export type Visit = Database["public"]["Tables"]["visits"]["Row"];
export type VisitPhoto = Database["public"]["Tables"]["visit_photos"]["Row"];
export type WishlistItem = Database["public"]["Tables"]["wishlist"]["Row"];
export type AnnualGoal = Database["public"]["Tables"]["annual_goals"]["Row"];
export type BadgeDefinition = Database["public"]["Tables"]["badge_definitions"]["Row"];
export type UserBadge = Database["public"]["Tables"]["user_badges"]["Row"];
export type SharedMap = Database["public"]["Tables"]["shared_maps"]["Row"];
export type UserStats = Database["public"]["Views"]["user_stats"]["Row"];

export type VisitWithPhotos = Visit & { visit_photos: VisitPhoto[] };
