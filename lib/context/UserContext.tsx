"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authClient, signInWithGithub, signOut } from "../auth-client";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const session = await authClient.getSession();

        if (session?.data?.user) {
          setUser(session.data.user as User);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const signIn = async () => {
    setIsLoading(true);
    await signInWithGithub();
  };

  const signOutUser = async () => {
    try {
      setIsLoading(true);
      await signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signOutUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
