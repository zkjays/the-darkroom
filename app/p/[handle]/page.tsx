"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "../../component/landing/Navbar";
import { sanitizeHandle } from "@/app/lib/sanitize";
import { ProfileView } from "../../component/profile/ProfileView";
import type { DashboardData, WorkProof } from "../../dashboard/_types";

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Navbar />
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center flex flex-col gap-4">{children}</div>
      </main>
    </div>
  );
}

export default function PublicProfile() {
  const params = useParams();
  const searchParams = useSearchParams();
  const handle = sanitizeHandle((params?.handle as string) ?? "");
  const refParam = searchParams.get("ref");

  const [data, setData] = useState<DashboardData | null>(null);
  const [proofs, setProofs] = useState<WorkProof[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { data: session } = useSession();
  const currentHandle = session?.handle ? sanitizeHandle(session.handle) : undefined;

  useEffect(() => {
    if (!handle) return;
    fetch(`/api/dashboard?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNotFound(true); return; }
        if (!d.profile_public) { setIsPrivate(true); return; }
        setData(d);
        return fetch(`/api/goals?handle=${encodeURIComponent(handle)}&all=true&completed=true&public_only=true`)
          .then((r) => r.json())
          .then((g) => setProofs(g.goals ?? []));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    fetch(`/api/referrals?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((d) => setReferralCount(d.count ?? 0))
      .catch(() => {});
  }, [handle]);

  if (loading) return <LoadingState />;

  if (notFound) {
    return (
      <CenteredMessage>
        <p className="font-[family-name:var(--font-mono)] text-slate-500 text-sm">
          This builder hasn&apos;t claimed their ID yet.
        </p>
        <a
          href={refParam ? `/darkroom-id?ref=${encodeURIComponent(refParam)}` : "/darkroom-id"}
          className="font-[family-name:var(--font-mono)] text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
        >
          Get your Darkroom ID →
        </a>
      </CenteredMessage>
    );
  }

  if (isPrivate) {
    return (
      <CenteredMessage>
        <p className="font-[family-name:var(--font-mono)] text-slate-500 text-sm">This profile is private.</p>
      </CenteredMessage>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Navbar />
      <main className="mx-auto px-6 py-10 pt-20">
        <ProfileView
          data={data}
          proofs={proofs}
          owner={!!currentHandle && currentHandle === handle}
          referralCount={referralCount}
          currentHandle={currentHandle}
          refParam={refParam}
        />
      </main>
    </div>
  );
}
