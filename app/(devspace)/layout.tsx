"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Button } from "@heroui/button";
import { cn } from "@heroui/theme";

import { DevspaceSidebar } from "@/components/devspace-navbar";

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

  const handleOverlayKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "Spacebar"
    ) {
      event.preventDefault();
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-background relative">
      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          onKeyDown={handleOverlayKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
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
          isMobile={isMobile}
          onClose={() => setIsSidebarOpen(false)}
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
