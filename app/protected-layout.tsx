"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/lib/context/UserContext";

const PUBLIC_ROUTES = ["/login"];

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname ?? "");

  useEffect(() => {
    if (!isPublicRoute && !isLoading && !user) {
      router.replace("/login");
    }
  }, [isPublicRoute, isLoading, user, router]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="relative flex flex-col h-screen">
        <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
