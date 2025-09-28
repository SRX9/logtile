"use client";

import { DevspaceSidebar } from "@/components/devspace-navbar";

export default function DevspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      <DevspaceSidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <main className="flex-1 overflow-auto flex justify-start">
          {children}
        </main>
      </div>
    </div>
  );
}
