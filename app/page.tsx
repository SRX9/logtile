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
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";

import { subtitle } from "@/components/primitives";
import { GithubIcon, SunFilledIcon, MoonFilledIcon } from "@/components/icons";
import { useUser } from "@/lib/context/UserContext";
import { fontHeading } from "@/config/fonts";

export default function Home() {
  const { user, signOutUser, signIn, isLoading } = useUser();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const isAuthenticated = Boolean(user);

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
            <Link className="flex items-center" href="/">
              <div className="rounded-full  flex items-center justify-center">
                <Image
                  alt="Logo"
                  className="w-14 h-14 dark:invert"
                  height={20}
                  src="/icon1.png"
                  width={250}
                />
              </div>
              <h1
                className={cn(
                  fontHeading.className,
                  "font-heading text-slate-900 text-xl pt-1 -tracking-tighter dark:text-slate-100",
                )}
              >
                Logtiles
              </h1>
            </Link>
          </NavbarItem>
        </NavbarContent>

        <NavbarContent className="hidden md:flex gap-6" justify="center">
          <NavbarItem>
            <a
              className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              href="#features"
            >
              Features
            </a>
          </NavbarItem>
          <NavbarItem>
            <a
              className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              href="#how-it-works"
            >
              How it works
            </a>
          </NavbarItem>
          <NavbarItem>
            <a
              className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              href="#preview"
            >
              Preview
            </a>
          </NavbarItem>
          <NavbarItem>
            <a
              className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              href="#cta"
            >
              Get started
            </a>
          </NavbarItem>
        </NavbarContent>

        <NavbarContent justify="end">
          <NavbarItem>
            <Button
              isIconOnly
              className="w-9 h-9"
              variant="light"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <MoonFilledIcon size={18} />
              ) : (
                <SunFilledIcon size={18} />
              )}
            </Button>
          </NavbarItem>

          {isAuthenticated ? (
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
                  <DropdownItem
                    key="settings"
                    onPress={() => router.push("/my-repositories")}
                  >
                    My Repositories
                  </DropdownItem>
                  <DropdownItem
                    key="team_settings"
                    onPress={() => router.push("/my-changelogs")}
                  >
                    Changelogs
                  </DropdownItem>
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
          ) : (
            <NavbarItem>
              <Button
                className="font-medium"
                color="primary"
                isDisabled={isLoading}
                onPress={async () => {
                  try {
                    await signIn();
                  } catch {
                    router.push("/login");
                  }
                }}
              >
                {isLoading ? "Loading..." : "Sign in with GitHub"}
              </Button>
            </NavbarItem>
          )}
        </NavbarContent>
      </Navbar>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 pt-12 sm:pt-16 md:pt-20" id="hero">
          <div className="max-w-5xl mx-auto text-center">
            <div className="w-48 h-48 mx-auto ">
              <img
                alt="Logo"
                className="w-48 h-48 object-contain dark:invert"
                src="/icon1.png"
              />
            </div>
            <h1
              className={cn(
                fontHeading.className,
                "text-4xl font-semibold max-w-xl text-center mx-auto tracking-tight text-balance",
              )}
            >
              Ship Changelogs in Minutes That Tells Your Product{"'"}s Story
            </h1>
            <p
              className={subtitle({
                class:
                  "mt-4  text-slate-600 dark:text-slate-300 max-w-xl text-center mx-auto",
              })}
            >
              Turn noisy commit history into clean, human-friendly release notes
              using LLMs. Save hours on every deploy.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <>
                  <Button
                    className={buttonStyles({
                      color: "primary",
                      radius: "full",
                      variant: "shadow",
                    })}
                    color="primary"
                    onPress={() => router.push("/my-repositories")}
                  >
                    <GithubIcon className="w-5 h-5" />
                    Open dashboard
                  </Button>
                  <Button
                    className={buttonStyles({
                      variant: "bordered",
                      radius: "full",
                    })}
                    variant="bordered"
                    onPress={() => {
                      const el = document.getElementById("how-it-works");

                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    See how it works
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className={buttonStyles({
                      color: "primary",
                      radius: "full",
                      variant: "shadow",
                    })}
                    color="primary"
                    isDisabled={isLoading}
                    onPress={async () => {
                      try {
                        await signIn();
                      } catch {
                        router.push("/login");
                      }
                    }}
                  >
                    <GithubIcon className="w-5 h-5" />
                    {isLoading ? "Loading..." : "Continue with GitHub"}
                  </Button>
                  <Button
                    className={buttonStyles({
                      variant: "bordered",
                      radius: "full",
                    })}
                    variant="bordered"
                    onPress={() => {
                      const el = document.getElementById("how-it-works");

                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    See how it works
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-16 sm:py-20" id="features">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 mb-3">
                  <GithubIcon aria-hidden="true" className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  GitHub-native
                </h3>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Connect your repositories and generate changelogs straight
                  from commits, PRs, and tags.
                </p>
              </div>
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 mb-3">
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 3l2.39 4.84L20 9.27l-4 3.9.94 5.48L12 16.9 7.06 18.65 8 13.17 4 9.27l5.61-1.43L12 3z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  LLM summarization
                </h3>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                  High‑quality, consistent summaries that read like a human
                  wrote them.
                </p>
              </div>
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100 mb-3">
                  <SunFilledIcon aria-hidden="true" className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Clean, theme‑aware
                </h3>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Minimal output formatted for readability. Looks great in both
                  light and dark.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-16 sm:py-20" id="how-it-works">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center text-xl font-semibold text-slate-900 dark:text-slate-100 mb-8">
              How it works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {["Connect", "Select", "Generate"].map((step, idx) => (
                <div
                  key={step}
                  className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30"
                >
                  <div className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-sm mb-3">
                    {idx + 1}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {step}
                  </h3>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {idx === 0 &&
                      "Sign in with GitHub and pick the repository to analyze."}
                    {idx === 1 &&
                      "Choose the range (tags, dates, or commits) to be considered for the changelog."}
                    {idx === 2 &&
                      "We summarize, you review, then copy or publish your changelog."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preview */}
        <section className="px-6 py-16 sm:py-20" id="preview">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Preview
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  A sample of the output you can expect.
                </p>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <h3>v1.4.0 — Improvements & Fixes</h3>
                <ul>
                  <li>
                    Revamped onboarding and repository sync for faster setup.
                  </li>
                  <li>Smarter grouping of commit messages and PR titles.</li>
                  <li>Improved dark mode rendering for Markdown output.</li>
                  <li>
                    Resolved edge case where tags weren’t detected on shallow
                    clones.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-16 sm:pb-24" id="cta">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 bg-slate-50 dark:bg-slate-900/40">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Ready to Turn Commits Into Compelling Stories?
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Join developers who ship with confidence. Your first changelog
                  is just one GitHub connection away.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                  {isAuthenticated ? (
                    <Button
                      className={buttonStyles({
                        color: "primary",
                        radius: "full",
                        variant: "shadow",
                      })}
                      color="primary"
                      onPress={() => router.push("/my-repositories")}
                    >
                      <GithubIcon className="w-5 h-5" />
                      Go to repositories
                    </Button>
                  ) : (
                    <Button
                      className={buttonStyles({
                        color: "primary",
                        radius: "full",
                        variant: "shadow",
                      })}
                      color="primary"
                      isDisabled={isLoading}
                      onPress={async () => {
                        try {
                          await signIn();
                        } catch {
                          router.push("/login");
                        }
                      }}
                    >
                      <GithubIcon className="w-5 h-5" />
                      {isLoading ? "Loading..." : "Continue with GitHub"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 pb-8">
          <div className="max-w-6xl mx-auto border-t border-slate-200 dark:border-slate-800 pt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            <p>© {new Date().getFullYear()} Logtiles. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
