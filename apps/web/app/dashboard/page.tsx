"use client";

/** Dashboard placeholder proving the shell — Phase 8 builds the real
 * vertical-aware overview. */
import { Target } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { FirstRunChecklist } from "@/components/FirstRunChecklist";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Stat } from "@/components/ui/Stat";
import { useAuth } from "@/lib/AuthProvider";
import { getVerticalConfig } from "@/lib/verticals";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <AppShell>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </AppShell>
    );
  }

  const vertical = getVerticalConfig(user.vertical);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={vertical.label}
          title={vertical.dashboardTitle}
          description={vertical.dashboardSummary}
          actions={
            <Link href="/leads" className={buttonClasses()}>
              Generate leads
            </Link>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Leads" value={user.leads_used} detail={`of ${user.leads_quota} quota`} />
          <Stat label="Credits" value={user.credits} detail="email sends available" />
          <Stat label="Emails sent" value={user.emails_sent} detail="all time" />
          <Stat label="Plan" value={user.plan_name} detail={user.email_verified ? "email verified" : "verify email to send"} />
        </div>

        <FirstRunChecklist user={user} />

        <EmptyState
          icon={Target}
          title="The full dashboard lands in Phase 8"
          description="Stat tiles, funnel trends, recent activity, and the first-run checklist are built on this foundation."
          action={
            <Link href="/kitchen-sink" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              View the design system
            </Link>
          }
        />
      </div>
    </AppShell>
  );
}
