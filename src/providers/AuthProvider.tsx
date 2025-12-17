import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true, // Default to loading
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AUTH: Starting session check...");

    // 1. Set a "Safety Timer"
    // If Supabase doesn't answer in 3 seconds, we stop waiting.
    const safetyTimer = setTimeout(() => {
      console.warn("AUTH: Supabase took too long. Forcing app to load.");
      setLoading(false);
    }, 3000);

    // 2. Check Supabase Session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error("AUTH ERROR:", error.message);
        } else {
          console.log("AUTH SUCCESS: Session found?", !!session);
          setSession(session);
        }
      })
      .catch((err) => {
        console.error("AUTH CRASH:", err);
      })
      .finally(() => {
        // Clear the safety timer and stop the spinner
        clearTimeout(safetyTimer);
        setLoading(false);
      });

    // 3. Listen for Login/Logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("AUTH EVENT:", _event);
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}