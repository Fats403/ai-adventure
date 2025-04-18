"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  type ReactNode,
} from "react";
import { type User } from "firebase/auth";
import { listenToIdTokenChanges, getIdToken } from "@/lib/firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthContextProps {
  user: User | null;
  isLoading: boolean;
  token: string | null;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading until first check completes

  useEffect(() => {
    // Use onIdTokenChanged to get the user object and react to token refreshes
    const unsubscribe = listenToIdTokenChanges(async (firebaseUser) => {
      console.log("Auth state changed. User:", firebaseUser?.uid ?? "null");
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const currentToken = await getIdToken(); // Get initial token
          setToken(currentToken);
        } catch (error) {
          console.error("Error getting initial token:", error);
          setToken(null); // Ensure token is null on error
        }
      } else {
        setToken(null); // Clear token if user logs out
      }
      setIsLoading(false); // Initial check done
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Function to manually get token, exposed via context
  const getToken = async (forceRefresh = false): Promise<string | null> => {
    if (!user) return null;
    try {
      const newToken = await getIdToken(forceRefresh);
      setToken(newToken); // Update context state as well
      return newToken;
    } catch (error) {
      console.error("Error refreshing token:", error);
      setToken(null); // Clear token on error
      // Potentially sign out user if token refresh fails critically
      return null;
    }
  };

  // Show a loading state while Firebase initializes and checks the auth state
  if (isLoading) {
    // Avoid SSR flash of loading skeleton
    return (
      <div className="flex min-h-screen items-center justify-center">
        {/* Basic full-page loading indicator */}
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
          <p>Loading Session...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading: isLoading, token, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
