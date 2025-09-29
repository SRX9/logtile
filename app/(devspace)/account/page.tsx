"use client";

import { useRouter } from "next/navigation";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { useUser } from "@/lib/context/UserContext";
import { fontHeading } from "@/config/fonts";
import { LogOut, Mail, UserRound, Calendar, ArrowLeft } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const { user, signOutUser } = useUser();

  const handleLogout = async () => {
    await signOutUser();
    router.push("/login");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex w-full max-w-3xl flex-col gap-6 p-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
            <div>
              <h1 className={`${fontHeading.className} text-2xl font-semibold`}>
                Account
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage your profile and sign out of Logtiles.
              </p>
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800/70">
          <CardHeader className="flex items-center gap-4 border-b border-slate-200/60 p-6 dark:border-slate-800/60">
            <Avatar
              isBordered
              size="lg"
              src={user?.image}
              name={user?.name || "User"}
            />
            <div>
              <h2
                className={`${fontHeading.className} text-xl font-semibold text-slate-900 dark:text-slate-100`}
              >
                {user?.name ?? "Authenticated user"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Logged in via GitHub OAuth
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-6 p-6 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                <UserRound className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Name
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user?.name ?? "Not available"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Email
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user?.email ?? "Not available"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                <Calendar className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Session
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  You are currently authenticated. Sign out to switch accounts.
                </p>
              </div>
            </div>

            <Button
              color="default"
              className="w-full sm:w-fit"
              endContent={<LogOut className="h-4 w-4" />}
              onPress={handleLogout}
            >
              Sign out
            </Button>
          </CardBody>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800/70">
          <CardBody className="space-y-4 p-6 text-sm text-slate-600 dark:text-slate-400">
            <div>
              <h2
                className={`${fontHeading.className} text-lg font-semibold text-slate-900 dark:text-slate-100`}
              >
                Delete account
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Permanently remove your account and associated data from
                Logtiles.
              </p>
            </div>
            <Button isDisabled className="w-full sm:w-fit" variant="bordered">
              Delete account (coming soon)
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
