"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Navbar, NavbarContent, NavbarItem } from "@heroui/navbar";
import { FolderOpen, FileText, X } from "lucide-react";

import { cn } from "@heroui/theme";
import { fontHeading } from "@/config/fonts";
import { MoonFilledIcon, SunFilledIcon } from "@/components/icons";
import { useUser } from "@/lib/context/UserContext";
import { useTheme } from "next-themes";

export function DevspaceNavbar() {
  const { user, signOutUser } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/login");
  };

  return (
    <Navbar
      isBordered
      className="border-b border-slate-200 dark:border-slate-800"
    >
      <NavbarContent justify="start">
        <NavbarItem>
          <div className="flex items-center gap-2">
            <div className="rounded-full flex items-center justify-center">
              <Image
                width={250}
                height={20}
                src="/icon1.png"
                alt="Logo"
                className="w-14 h-14 dark:invert"
              />
            </div>
            <h1
              className={cn(
                fontHeading.className,
                "font-heading text-slate-900 text-xl pt-1 -tracking-tighter dark:text-slate-100"
              )}
            >
              Logtiles
            </h1>
          </div>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent justify="end" className="items-center gap-2">
        <NavbarItem>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                isBordered
                as="button"
                className="transition-transform"
                name={user?.name || "User"}
                size="sm"
                src={user?.image}
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat">
              <DropdownItem key="profile" className="h-14 gap-2">
                <p className="font-semibold">{user?.name}</p>
                <p className="font-normal text-sm text-slate-500">
                  {user?.email}
                </p>
              </DropdownItem>
              <DropdownItem key="settings">Settings</DropdownItem>
              <DropdownItem key="team_settings">Team Settings</DropdownItem>
              <DropdownItem key="analytics">Analytics</DropdownItem>
              <DropdownItem key="logout" color="danger" onClick={handleSignOut}>
                Sign Out
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}

// Sidebar component extracted for reuse
export function DevspaceSidebar({
  onClose,
  isMobile = false,
}: {
  onClose?: () => void;
  isMobile?: boolean;
}) {
  const { user, signOutUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const menuItems = [
    {
      key: "repositories",
      label: "My Repositories",
      href: "/my-repositories",
      icon: FolderOpen,
    },
    {
      key: "changelogs",
      label: "My Changelogs",
      href: "/my-changelogs",
      icon: FileText,
    },
  ];

  const isActivePath = (href: string) => {
    if (href === "/my-repositories") {
      return (
        pathname === "/my-repositories" ||
        pathname?.startsWith("/my-repositories/")
      );
    }
    if (href === "/my-changelogs") {
      return pathname === "/my-changelogs";
    }
    return pathname === href;
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div className="w-64 h-screen bg-background border-r border-slate-200 dark:border-slate-800 flex flex-col">
      {/* Logo and Brand with close button for mobile */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full flex items-center justify-center">
              <Image
                width={250}
                height={20}
                src="/icon1.png"
                alt="Logo"
                className="w-10 h-10 dark:invert"
              />
            </div>
            <h1
              className={cn(
                fontHeading.className,
                "font-heading text-slate-900 text-lg pt-1 -tracking-tighter dark:text-slate-100"
              )}
            >
              Logtiles
            </h1>
          </div>
          {isMobile && onClose && (
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onClick={onClose}
              className="md:hidden"
            >
              <X size={20} />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = isActivePath(item.href);
            const IconComponent = item.icon;
            return (
              <li key={item.key}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-3",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  )}
                >
                  <IconComponent size={18} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Section - Fixed at bottom */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 mt-auto flex flex-col gap-4">
        <Button
          isIconOnly
          variant="light"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="w-full h-10 border flex justify-between px-3 border-slate-200 dark:border-slate-700"
        >
          Switch to {theme === "light" ? "Dark" : "Light"} Mode
          {theme === "light" ? (
            <MoonFilledIcon size={20} />
          ) : (
            <SunFilledIcon size={20} />
          )}
        </Button>

        <Dropdown placement="top-start">
          <DropdownTrigger>
            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Avatar
                isBordered
                name={user?.name || "User"}
                size="sm"
                src={user?.image}
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            </button>
          </DropdownTrigger>
          <DropdownMenu aria-label="Profile Actions" variant="flat">
            <DropdownItem
              key="logout"
              color="danger"
              onClick={async () => {
                await signOutUser();
                router.push("/login");
              }}
            >
              Sign Out
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  );
}
