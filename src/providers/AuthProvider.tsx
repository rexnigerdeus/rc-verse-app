// src/providers/AuthProvider.tsx

import { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Define the shape of the data that our context will provide
type AuthData = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

// Create the context with a default value of undefined
const AuthContext = createContext<AuthData | undefined>(undefined);

// This is our main provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This function fetches the initial user session
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    fetchSession();

    // This listens for changes in the user's auth state (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Cleanup function to remove the listener when the component unmounts
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // The value that will be provided to all children components
  const value = {
    session,
    user,
    loading,
  };

  // We render the children, but only after the initial loading is complete
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// This is a custom hook that makes it easy to access the auth data
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
