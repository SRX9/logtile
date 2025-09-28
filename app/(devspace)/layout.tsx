"use client";

import { useState, useEffect } from "react";
import { DevspaceSidebar } from "@/components/devspace-navbar";
import { Menu, X } from "lucide-react";
import { Button } from "@heroui/button";
import { cn } from "@heroui/theme";

export default function DevspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false); // Close sidebar when switching to desktop
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-background relative">
      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed md:relative z-50 h-screen transition-transform duration-300 ease-in-out md:translate-x-0",
          isMobile && !isSidebarOpen && "-translate-x-full"
        )}
      >
        <DevspaceSidebar
          onClose={() => setIsSidebarOpen(false)}
          isMobile={isMobile}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <main className="flex-1 overflow-auto flex justify-start">
          {children}
        </main>
      </div>

      {/* Floating menu button for mobile/tablet */}
      {isMobile && !isSidebarOpen && (
        <Button
          isIconOnly
          className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full shadow-lg bg-primary text-primary-foreground"
          onClick={toggleSidebar}
        >
          <Menu size={24} />
        </Button>
      )}
    </div>
  );
}
