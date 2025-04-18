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
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = listenToIdTokenChanges(async (firebaseUser) => {
      console.log("Auth state changed. User:", firebaseUser?.uid ?? "null");
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const currentToken = await getIdToken();
          setToken(currentToken);
          console.log("AuthProvider: Initial token fetch successful.");
        } catch (error) {
          console.error("AuthProvider: Error getting initial token:", error);
          setToken(null);
        } finally {
          setIsInitialLoadComplete(true);
        }
      } else {
        setToken(null);
        setIsInitialLoadComplete(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const getToken = async (forceRefresh = false): Promise<string | null> => {
    const currentUser = user;
    if (!currentUser) {
      console.warn("getToken called but user state is null.");
      return null;
    }
    try {
      console.log(
        `getToken: Attempting fetch for user ${currentUser.uid}. Force refresh: ${forceRefresh}`,
      );
      const newToken = await getIdToken(forceRefresh);
      setToken(newToken);
      return newToken;
    } catch (error) {
      console.error("getToken: Error fetching/refreshing token:", error);
      setToken(null);
      return null;
    }
  };

  const isLoading = !isInitialLoadComplete;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
    <AuthContext.Provider value={{ user, isLoading, token, getToken }}>
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
