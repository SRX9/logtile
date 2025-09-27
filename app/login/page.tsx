"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { GithubIcon } from "@/components/icons";
import { useUser } from "@/lib/context/UserContext";
import Image from "next/image";

export default function LoginPage() {
  const { user, isLoading, signIn } = useUser();
  const router = useRouter();
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100"></div>
      </div>
    );
  }

  // If we have a user, don't render anything (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="flex justify-center mb-12">
          <Image
            src="/icon1.png"
            alt="Logo"
            width={500}
            height={500}
            className="w-48 h-48 rounded-full object-contain dark:invert"
          />
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            Welcome back
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Sign in to your account to continue
          </p>
        </div>

        {/* GitHub Sign In Button */}
        <div className="space-y-4">
          <Button
            onClick={async () => {
              try {
                setSignInError(null);
                await signIn();
              } catch (error) {
                console.error("Sign in button error:", error);
                setSignInError("Failed to initiate sign in. Please try again.");
              }
            }}
            className="w-full h-14 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-medium text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            disabled={isLoading}
          >
            <GithubIcon className="w-6 h-6 mr-3" />
            {isLoading ? "Signing in..." : "Continue with GitHub"}
          </Button>

          {signInError && (
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {signInError}
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              By signing in, you agree to our Terms of Service
            </p>
          </div>
        </div>
        {/* Decorative Elements */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-purple-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-green-400 rounded-full opacity-20 animate-pulse delay-500"></div>
      </div>
    </div>
  );
}
