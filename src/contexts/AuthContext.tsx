import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/database.types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: Partial<Profile>) => Promise<void>;
  signIn: (email: string, password: string, desiredRole?: Profile['role']) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateRole: (role: Profile['role']) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }: any) => {
      const session = data?.session;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        return;
      }

      if (!data) {
        // Auto-create a minimal profile for existing users with no profile row
        const { data: userRes } = await supabase.auth.getUser();
        const authUser = userRes?.user ?? null;
        const inferredFullName =
          (authUser?.user_metadata as Record<string, unknown> | undefined)?.full_name as string | undefined ||
          authUser?.email?.split('@')[0] ||
          'User';
        const inferredRole =
          ((authUser?.user_metadata as Record<string, unknown> | undefined)?.role as
            'patient' | 'rider' | 'admin' | undefined) || 'patient';

        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: inferredFullName,
            role: inferredRole,
          })
          .select('*')
          .maybeSingle();

        if (insertError) {
          console.error('Error auto-creating profile:', insertError);
          setProfile(null);
          return;
        }

        setProfile(inserted);
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching/creating profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<Profile>) => {
    if (userData.role === 'admin') {
      throw new Error('Admin signup is disabled. Contact support for access.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: userData.full_name!,
        role: userData.role!,
        phone: userData.phone,
        address: userData.address,
        date_of_birth: userData.date_of_birth,
        emergency_contact: userData.emergency_contact,
        medical_conditions: userData.medical_conditions,
      });

      if (profileError) throw profileError;
    }
  };

  const signIn = async (email: string, password: string, desiredRole?: Profile['role']) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    if (data.user && desiredRole) {
      // Persist desired role immediately after sign-in
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: desiredRole, updated_at: new Date().toISOString() })
        .eq('id', data.user.id);
      if (roleError) {
        console.error('Failed to set role after login:', roleError);
      } else {
        await fetchProfile(data.user.id);
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const updateRole = async (role: Profile['role']) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) throw error;
    await fetchProfile(user.id);
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    updateRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}