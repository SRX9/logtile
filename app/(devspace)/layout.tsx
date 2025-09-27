"use client";

import { useTheme } from "next-themes";
import { Button } from "@heroui/button";
import { MoonFilledIcon, SunFilledIcon } from "@/components/icons";
import { DevspaceSidebar } from "@/components/devspace-navbar";

export default function DevspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen bg-background">
      <DevspaceSidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top right theme toggle */}
        <div className="absolute top-4 right-4 z-50">
          <Button
            isIconOnly
            variant="light"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="w-10 h-10 shadow-lg bg-background/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700"
          >
            {theme === "light" ? (
              <MoonFilledIcon size={20} />
            ) : (
              <SunFilledIcon size={20} />
            )}
          </Button>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
