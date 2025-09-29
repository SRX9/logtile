"use client";

import { Card, CardBody, CardHeader } from "@heroui/card";
import { BarChart3, Leaf, Hourglass } from "lucide-react";

import { fontHeading } from "@/config/fonts";

export default function UsagePage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className=" flex w-full max-w-3xl flex-col gap-6 p-10">
        <header className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
          <BarChart3 className="h-7 w-7 text-primary" />
          <div>
            <h1 className={`${fontHeading.className} text-2xl font-semibold`}>
              Usage
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Insights and quotas for your changelog activity — coming soon.
            </p>
          </div>
        </header>

        <Card className="rounded-2xl border border-slate-200/70 shadow-sm dark:border-slate-800/80">
          <CardHeader className="flex items-start gap-3 border-b border-slate-200/60 p-6 dark:border-slate-800/60">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Hourglass className="h-5 w-5" />
            </span>
            <div>
              <h2
                className={`${fontHeading.className} text-lg font-semibold text-slate-900 dark:text-slate-100`}
              >
                Usage analytics coming soon
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Track how many changelog jobs you run, monitor plan quotas, and
                review historical usage.
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4 p-6 text-sm text-slate-600 dark:text-slate-400">
            <p>
              We are building insights that help you understand your team’s
              changelog cadence and resource usage. Expect charts,
              per-repository breakdowns, and exportable reports.
            </p>
            <div className="flex items-start gap-3 rounded-lg bg-slate-100/60 p-4 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <Leaf className="mt-1 h-4 w-4" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Stay tuned
                </p>
                <p className="mt-1">
                  Usage metrics will be rolled out alongside billing to give you
                  full visibility.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
