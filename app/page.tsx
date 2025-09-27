"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Navbar, NavbarContent, NavbarItem } from "@heroui/navbar";
import { button as buttonStyles, cn } from "@heroui/theme";

import { title, subtitle } from "@/components/primitives";
import { GithubIcon, SunFilledIcon, MoonFilledIcon } from "@/components/icons";
import { useUser } from "@/lib/context/UserContext";
import { useTheme } from "next-themes";
import Image from "next/image";
import { fontHeading } from "@/config/fonts";

export default function Home() {
  const { user, signOutUser } = useUser();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <Navbar
        isBordered
        className="border-b border-slate-200 dark:border-slate-800"
      >
        <NavbarContent justify="start">
          <NavbarItem>
            <div className="flex items-center">
              <div className="rounded-full  flex items-center justify-center">
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

        <NavbarContent justify="end">
          <NavbarItem>
            <Button
              isIconOnly
              variant="light"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="w-9 h-9"
            >
              {theme === "light" ? (
                <MoonFilledIcon size={18} />
              ) : (
                <SunFilledIcon size={18} />
              )}
            </Button>
          </NavbarItem>

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
                <DropdownItem
                  key="logout"
                  color="danger"
                  onClick={handleSignOut}
                >
                  Sign Out
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <section className="text-center max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 flex items-center justify-center shadow-xl">
              <img
                src="/icon1.png"
                alt="Logo"
                className="w-10 h-10 object-contain"
              />
            </div>
            <h1 className={title()}>
              Welcome back, {user?.name?.split(" ")[0]}!
            </h1>
            <p className={subtitle({ class: "mt-4" })}>
              You're successfully authenticated with GitHub. This is your
              dashboard.
            </p>
            <div className="text-sm  whitespace-pre-line">
              {JSON.stringify(user)}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              color="primary"
              className={buttonStyles({
                color: "primary",
                radius: "full",
                variant: "shadow",
              })}
              onPress={() => router.push("/my-repositories")}
            >
              <GithubIcon className="w-5 h-5" />
              See Repositories
            </Button>
            <Button
              variant="bordered"
              className={buttonStyles({
                variant: "bordered",
                radius: "full",
              })}
            >
              Documentation
            </Button>
          </div>

          <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Your Profile
            </h3>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p>
                <strong>Name:</strong> {user?.name}
              </p>
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>ID:</strong> {user?.id}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
