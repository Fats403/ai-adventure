"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  type ReactNode,
} from "react";
import { type User } from "firebase/auth";
import { listenToIdTokenChanges } from "@/lib/firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthContextProps {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  // isLoading now only tracks the initial user state check
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Use listenToIdTokenChanges as it covers login/logout too
    const unsubscribe = listenToIdTokenChanges(async (firebaseUser) => {
      console.log("Auth state changed. User:", firebaseUser?.uid ?? "null");
      setUser(firebaseUser);
      // Mark loading complete as soon as user state is known
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

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
    <AuthContext.Provider value={{ user, isLoading }}>
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
