export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'patient' | 'rider' | 'admin';
          full_name: string;
          phone: string | null;
          address: string | null;
          date_of_birth: string | null;
          emergency_contact: string | null;
          medical_conditions: string | null;
          avatar_url: string | null;
          is_verified: boolean;
          rating: number;
          total_rides: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: 'patient' | 'rider' | 'admin';
          full_name: string;
          phone?: string | null;
          address?: string | null;
          date_of_birth?: string | null;
          emergency_contact?: string | null;
          medical_conditions?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          rating?: number;
          total_rides?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'patient' | 'rider' | 'admin';
          full_name?: string;
          phone?: string | null;
          address?: string | null;
          date_of_birth?: string | null;
          emergency_contact?: string | null;
          medical_conditions?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          rating?: number;
          total_rides?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          rider_id: string | null;
          hospital_name: string;
          hospital_address: string;
          appointment_date: string;
          estimated_duration: string;
          special_instructions: string | null;
          status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
          pickup_location: string;
          total_cost: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          rider_id?: string | null;
          hospital_name: string;
          hospital_address: string;
          appointment_date: string;
          estimated_duration?: string;
          special_instructions?: string | null;
          status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
          pickup_location: string;
          total_cost?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          rider_id?: string | null;
          hospital_name?: string;
          hospital_address?: string;
          appointment_date?: string;
          estimated_duration?: string;
          special_instructions?: string | null;
          status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
          pickup_location?: string;
          total_cost?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rides: {
        Row: {
          id: string;
          appointment_id: string;
          patient_id: string;
          rider_id: string;
          status: 'requested' | 'accepted' | 'pickup' | 'en_route' | 'at_hospital' | 'in_appointment' | 'returning' | 'completed' | 'cancelled';
          pickup_time: string | null;
          dropoff_time: string | null;
          return_pickup_time: string | null;
          completion_time: string | null;
          distance_km: number | null;
          duration_minutes: number | null;
          base_fare: number;
          distance_fare: number;
          time_fare: number;
          total_fare: number | null;
          rider_completed?: boolean; // added by migrations
          patient_completed?: boolean; // added by migrations
          patient_notes: string | null;
          rider_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          patient_id: string;
          rider_id: string;
          status?: 'requested' | 'accepted' | 'pickup' | 'en_route' | 'at_hospital' | 'in_appointment' | 'returning' | 'completed' | 'cancelled';
          pickup_time?: string | null;
          dropoff_time?: string | null;
          return_pickup_time?: string | null;
          completion_time?: string | null;
          distance_km?: number | null;
          duration_minutes?: number | null;
          base_fare?: number;
          distance_fare?: number;
          time_fare?: number;
          total_fare?: number | null;
          rider_completed?: boolean; // added by migrations
          patient_completed?: boolean; // added by migrations
          patient_notes?: string | null;
          rider_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          patient_id?: string;
          rider_id?: string;
          status?: 'requested' | 'accepted' | 'pickup' | 'en_route' | 'at_hospital' | 'in_appointment' | 'returning' | 'completed' | 'cancelled';
          pickup_time?: string | null;
          dropoff_time?: string | null;
          return_pickup_time?: string | null;
          completion_time?: string | null;
          distance_km?: number | null;
          duration_minutes?: number | null;
          base_fare?: number;
          distance_fare?: number;
          time_fare?: number;
          total_fare?: number | null;
          rider_completed?: boolean; // added by migrations
          patient_completed?: boolean; // added by migrations
          patient_notes?: string | null;
          rider_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      earnings: {
        Row: {
          id: string;
          rider_id: string;
          ride_id: string;
          amount: number;
          commission: number;
          net_amount: number;
          payment_status: string;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rider_id: string;
          ride_id: string;
          amount: number;
          commission?: number;
          net_amount: number;
          payment_status?: string;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rider_id?: string;
          ride_id?: string;
          amount?: number;
          commission?: number;
          net_amount?: number;
          payment_status?: string;
          paid_at?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
      ride_status_updates: {
        Row: {
          id: string;
          ride_id: string;
          status: 'requested' | 'accepted' | 'pickup' | 'en_route' | 'at_hospital' | 'in_appointment' | 'returning' | 'completed' | 'cancelled';
          notes: string | null;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          status: 'requested' | 'accepted' | 'pickup' | 'en_route' | 'at_hospital' | 'in_appointment' | 'returning' | 'completed' | 'cancelled';
          notes?: string | null;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          status?: 'requested' | 'accepted' | 'pickup' | 'en_route' | 'at_hospital' | 'in_appointment' | 'returning' | 'completed' | 'cancelled';
          notes?: string | null;
          location?: string | null;
          created_at?: string;
        };
      };
    };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type Ride = Database['public']['Tables']['rides']['Row'];
export type Earning = Database['public']['Tables']['earnings']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];