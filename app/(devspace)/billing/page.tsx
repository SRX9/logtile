"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { CreditCard, Clock, ArrowRight } from "lucide-react";

import { fontHeading } from "@/config/fonts";

export default function BillingPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className=" flex w-full max-w-3xl flex-col gap-6 p-10">
        <header className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
          <CreditCard className="h-7 w-7 text-primary" />
          <div>
            <h1 className={`${fontHeading.className} text-2xl font-semibold`}>
              Billing
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Subscription management and invoices coming soon.
            </p>
          </div>
        </header>

        <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800/80">
          <CardHeader className="flex items-start gap-3 border-b border-slate-200/60 p-6 dark:border-slate-800/60">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <h2
                className={`${fontHeading.className} text-lg font-semibold text-slate-900 dark:text-slate-100`}
              >
                Coming soon
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We are working on bringing subscription options and exportable
                invoices.
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4 p-6 text-sm text-slate-600 dark:text-slate-400">
            <p>
              In the meantime, you can continue generating changelogs without
              any limits. Stay tuned for updates about pricing tiers and billing
              history.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
