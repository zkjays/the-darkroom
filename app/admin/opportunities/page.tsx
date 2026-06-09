"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { key: "job",       label: "💼 Job" },
  { key: "bounty",    label: "💰 Bounty" },
  { key: "hackathon", label: "🏆 Hackathon" },
  { key: "grant",     label: "🔬 Grant" },
  { key: "gig",       label: "🎨 Gig" },
];

const SOURCES = [
  "manual",
  "superteam",
  "gitcoin",
  "ethglobal",
  "immunefi",
  "web3.career",
  "cryptojobslist",
  "dorahacks",
];

export default function AdminOpportunitiesPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);
  const [authError, setAuthError] = useState("");

  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [category, setCategory] = useState("job");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");
  const [link, setLink] = useState("");
  const [source, setSource] = useState("manual");
  const [tags, setTags] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const checkAuth = async () => {
    if (!secret.trim() || authChecking) return;
    setAuthChecking(true);
    setAuthError("");
    try {
      // Verify the secret against the real API before granting access
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ _auth_check: true }),
      });
      // 400 = secret valid but missing fields (expected) → auth OK
      // 401 = secret invalid
      if (res.status === 400 || res.status === 201) {
        setAuthed(true);
      } else {
        setAuthError("Invalid secret. Try again.");
      }
    } catch {
      setAuthError("Connection error. Try again.");
    } finally {
      setAuthChecking(false);
    }
  };

  const submit = async () => {
    if (!title.trim() || !link.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({
          title: title.trim(),
          project: project.trim() || null,
          category,
          description: description.trim() || null,
          reward: reward.trim() || null,
          deadline: deadline || null,
          link: link.trim(),
          source,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccess(true);
      setTitle(""); setProject(""); setDescription("");
      setReward(""); setDeadline(""); setLink(""); setTags("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Auth gate
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <p className="font-mono text-xs text-slate-500 tracking-widest uppercase text-center">
            Admin — The Darkroom
          </p>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => { setSecret(e.target.value); setAuthError(""); }}
            onKeyDown={(e) => e.key === "Enter" && checkAuth()}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-white/20"
          />
          {authError && (
            <p className="font-mono text-xs text-red-400 text-center">{authError}</p>
          )}
          <button
            onClick={checkAuth}
            disabled={!secret.trim() || authChecking}
            className="w-full rounded-lg bg-white text-black text-sm font-medium py-3 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {authChecking ? "Verifying…" : "Enter →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white px-6 py-12">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-[11px] text-slate-500 tracking-widest uppercase mb-1">Admin</p>
            <h1 className="text-xl font-bold">Add Opportunity</h1>
          </div>
          <button
            onClick={() => router.push("/opportunities")}
            className="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← View page
          </button>
        </div>

        <div className="flex flex-col gap-5">

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-slate-400 uppercase tracking-widest">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Community Manager at Mina Protocol"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-white/20"
            />
          </div>

          {/* Project */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-slate-400 uppercase tracking-widest">Project / Company</label>
            <input
              type="text"
              placeholder="o1Labs, Gitcoin, ETHGlobal..."
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-white/20"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-slate-400 uppercase tracking-widest">
              Category <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`font-mono text-xs px-3 py-2 rounded-lg border transition-all ${
                    category === cat.key
                      ? "bg-white/[0.1] border-white/30 text-white"
                      : "bg-transparent border-white/[0.08] text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-slate-400 uppercase tracking-widest">Description</label>
            <textarea
              placeholder="Brief description of the opportunity..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-white/20 resize-none"
            />
          </div>

          {/* Reward + Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] text-slate-400 uppercase tracking-widest">Reward</label>
              <input
                type="text"
                placeholder="$500 USDC, $3k/mo..."
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-white/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] text-slate-400 uppercase tracking-widest">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Link */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[11px] text-slate-400 uppercase tracking-widest">
              Link <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-white/20"
            />
          </div>

          {/* Source + Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] text-slate-400 uppercase tracking-widest">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-white/20"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s} className="bg-[#0c0c14]">{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[11px] text-slate-400 uppercase tracking-widest">Tags</label>
              <input
                type="text"
                placeholder="content, dev, design"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="font-mono text-xs text-red-400 bg-red-400/[0.08] border border-red-400/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={submit}
            disabled={!title.trim() || !link.trim() || submitting}
            className="w-full rounded-lg bg-white text-black font-medium py-3 hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Adding…" : success ? "✓ Added!" : "Add Opportunity"}
          </button>

        </div>
      </div>
    </div>
  );
}
