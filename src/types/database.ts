export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          role: 'user' | 'admin';
          pixels: number;
          rank: string | null;
          is_suspended: boolean;
          opportunities_shared: number;
          approved_submissions: number;
          referrals: number;
          contributions: number;
          badges: string[];
          referral_id: string;
          college: string | null;
          course: string | null;
          year_of_study: string | null;
          branch: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: 'user' | 'admin';
          pixels?: number;
          rank?: string | null;
          is_suspended?: boolean;
          opportunities_shared?: number;
          approved_submissions?: number;
          referrals?: number;
          contributions?: number;
          badges?: string[];
          referral_id?: string;
          college?: string | null;
          course?: string | null;
          year_of_study?: string | null;
          branch?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: 'user' | 'admin';
          pixels?: number;
          rank?: string | null;
          is_suspended?: boolean;
          opportunities_shared?: number;
          approved_submissions?: number;
          referrals?: number;
          contributions?: number;
          badges?: string[];
          referral_id?: string;
          college?: string | null;
          course?: string | null;
          year_of_study?: string | null;
          branch?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          is_active: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      opportunities: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          organizer: string;
          deadline: string;
          start_date: string | null;
          end_date: string | null;
          mode: 'online' | 'offline' | 'hybrid';
          location: string | null;
          prize: string | null;
          stipend: string | null;
          eligibility: string | null;
          team_size: string | null;
          skills: string[];
          apply_url: string;
          image_url: string | null;
          status: 'draft' | 'pending' | 'published' | 'rejected' | 'expired' | 'archived';
          source: 'admin' | 'user';
          featured: boolean;
          additional_info: string | null;
          views: number;
          apply_clicks: number;
          shares: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: string;
          organizer: string;
          deadline: string;
          start_date?: string | null;
          end_date?: string | null;
          mode?: 'online' | 'offline' | 'hybrid';
          location?: string | null;
          prize?: string | null;
          stipend?: string | null;
          eligibility?: string | null;
          team_size?: string | null;
          skills?: string[];
          apply_url: string;
          image_url?: string | null;
          status?: 'draft' | 'pending' | 'published' | 'rejected' | 'expired' | 'archived';
          source?: 'admin' | 'user';
          featured?: boolean;
          additional_info?: string | null;
          views?: number;
          apply_clicks?: number;
          shares?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          category?: string;
          organizer?: string;
          deadline?: string;
          start_date?: string | null;
          end_date?: string | null;
          mode?: 'online' | 'offline' | 'hybrid';
          location?: string | null;
          prize?: string | null;
          stipend?: string | null;
          eligibility?: string | null;
          team_size?: string | null;
          skills?: string[];
          apply_url?: string;
          image_url?: string | null;
          status?: 'draft' | 'pending' | 'published' | 'rejected' | 'expired' | 'archived';
          source?: 'admin' | 'user';
          featured?: boolean;
          additional_info?: string | null;
          views?: number;
          apply_clicks?: number;
          shares?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          category: string;
          organizer: string;
          deadline: string | null;
          start_date: string | null;
          end_date: string | null;
          mode: string | null;
          location: string | null;
          prize: string | null;
          stipend: string | null;
          eligibility: string | null;
          team_size: string | null;
          skills: string[];
          official_url: string;
          image_url: string | null;
          additional_info: string | null;
          status: 'pending' | 'approved' | 'rejected';
          admin_notes: string | null;
          reviewed_by: string | null;
          opportunity_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          category: string;
          organizer: string;
          deadline?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          mode?: string | null;
          location?: string | null;
          prize?: string | null;
          stipend?: string | null;
          eligibility?: string | null;
          team_size?: string | null;
          skills?: string[];
          official_url: string;
          image_url?: string | null;
          additional_info?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          admin_notes?: string | null;
          reviewed_by?: string | null;
          opportunity_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          category?: string;
          organizer?: string;
          deadline?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          mode?: string | null;
          location?: string | null;
          prize?: string | null;
          stipend?: string | null;
          eligibility?: string | null;
          team_size?: string | null;
          skills?: string[];
          official_url?: string;
          image_url?: string | null;
          additional_info?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          admin_notes?: string | null;
          reviewed_by?: string | null;
          opportunity_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_posts: {
        Row: {
          id: string;
          user_id: string;
          author_name: string;
          author_role: string;
          text: string;
          category: string | null;
          likes: number;
          comments: number;
          opportunity_id: string | null;
          link: string | null;
          image_url: string | null;
          source: 'admin' | 'user';
          status: 'published' | 'draft' | 'archived';
          featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          author_name: string;
          author_role?: string;
          text: string;
          category?: string | null;
          likes?: number;
          comments?: number;
          opportunity_id?: string | null;
          link?: string | null;
          image_url?: string | null;
          source?: 'admin' | 'user';
          status?: 'published' | 'draft' | 'archived';
          featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          author_name?: string;
          author_role?: string;
          text?: string;
          category?: string | null;
          likes?: number;
          comments?: number;
          opportunity_id?: string | null;
          link?: string | null;
          image_url?: string | null;
          source?: 'admin' | 'user';
          status?: 'published' | 'draft' | 'archived';
          featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      community_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          author_name: string;
          author_role: string;
          author_avatar: string | null;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          author_name: string;
          author_role?: string;
          author_avatar?: string | null;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          author_name?: string;
          author_role?: string;
          author_avatar?: string | null;
          text?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      pixel_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          action: string;
          reason: string;
          type: 'earn' | 'spend' | 'adjustment';
          admin_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          action: string;
          reason: string;
          type: 'earn' | 'spend' | 'adjustment';
          admin_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          action?: string;
          reason?: string;
          type?: 'earn' | 'spend' | 'adjustment';
          admin_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_user_id: string;
          referral_code: string;
          pixels_rewarded: number;
          opportunity_id: string | null;
          status: 'pending' | 'completed' | 'rejected';
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_user_id: string;
          referral_code: string;
          pixels_rewarded?: number;
          opportunity_id?: string | null;
          status?: 'pending' | 'completed' | 'rejected';
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_user_id?: string;
          referral_code?: string;
          pixels_rewarded?: number;
          opportunity_id?: string | null;
          status?: 'pending' | 'completed' | 'rejected';
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: 'opportunity' | 'post' | 'user';
          target_id: string;
          reason: string;
          status: 'pending' | 'resolved' | 'dismissed';
          admin_notes: string | null;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: 'opportunity' | 'post' | 'user';
          target_id: string;
          reason: string;
          status?: 'pending' | 'resolved' | 'dismissed';
          admin_notes?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          target_type?: 'opportunity' | 'post' | 'user';
          target_id?: string;
          reason?: string;
          status?: 'pending' | 'resolved' | 'dismissed';
          admin_notes?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reward_config: {
        Row: {
          id: string;
          share_opportunity: number;
          submit_opportunity: number;
          approved_opportunity: number;
          referral_signup: number;
          valid_report: number;
          daily_activity: number;
          profile_completion: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          share_opportunity?: number;
          submit_opportunity?: number;
          approved_opportunity?: number;
          referral_signup?: number;
          valid_report?: number;
          daily_activity?: number;
          profile_completion?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          share_opportunity?: number;
          submit_opportunity?: number;
          approved_opportunity?: number;
          referral_signup?: number;
          valid_report?: number;
          daily_activity?: number;
          profile_completion?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          message: string;
          cta_text: string | null;
          cta_link: string | null;
          image_url: string | null;
          target_audience: string | null;
          start_date: string;
          end_date: string;
          status: 'published' | 'draft' | 'archived';
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          cta_text?: string | null;
          cta_link?: string | null;
          image_url?: string | null;
          target_audience?: string | null;
          start_date?: string;
          end_date?: string;
          status?: 'published' | 'draft' | 'archived';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          message?: string;
          cta_text?: string | null;
          cta_link?: string | null;
          image_url?: string | null;
          target_audience?: string | null;
          start_date?: string;
          end_date?: string;
          status?: 'published' | 'draft' | 'archived';
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          title: string;
          message: string;
          type: 'offer' | 'opportunity' | 'announcement' | 'reminder' | 'community' | 'referral' | 'pixel' | 'system';
          link: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          type: 'offer' | 'opportunity' | 'announcement' | 'reminder' | 'community' | 'referral' | 'pixel' | 'system';
          link?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          message?: string;
          type?: 'offer' | 'opportunity' | 'announcement' | 'reminder' | 'community' | 'referral' | 'pixel' | 'system';
          link?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_notifications: {
        Row: {
          id: string;
          user_id: string;
          notification_id: string;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          notification_id: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          notification_id?: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          admin_email: string;
          action: string;
          target_type: string;
          target_id: string;
          reason: string | null;
          previous_value: Json | null;
          new_value: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          admin_email: string;
          action: string;
          target_type: string;
          target_id: string;
          reason?: string | null;
          previous_value?: Json | null;
          new_value?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          admin_email?: string;
          action?: string;
          target_type?: string;
          target_id?: string;
          reason?: string | null;
          previous_value?: Json | null;
          new_value?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_name: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_name: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          event_name?: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      increment_opportunity_views: {
        Args: { opp_id: string };
        Returns: undefined;
      };
      increment_opportunity_apply_clicks: {
        Args: { opp_id: string };
        Returns: undefined;
      };
      send_notification_rpc: {
        Args: {
          p_title: string;
          p_message: string;
          p_type?: string;
          p_link?: string | null;
          p_target_user_id?: string | null;
          p_admin_id?: string | null;
        };
        Returns: {
          success: boolean;
          notification_id: string;
          recipients_count: number;
        };
      };
    };
    Enums: Record<string, never>;
  };
};
