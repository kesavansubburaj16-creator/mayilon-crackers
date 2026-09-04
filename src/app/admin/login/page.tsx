"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck, Sparkles } from "lucide-react";
import { LogoLockup } from "@/components/brand/Logo";

export default function AdminLoginPage() {
  const [passcode, setPasscode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg("Please enter admin passcode");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/admin");
        router.refresh();
      } else {
        setErrorMsg(data.message || "Invalid passcode");
      }
    } catch (err) {
      setErrorMsg("Server authentication error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="relative text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="flex justify-center mb-2">
            <LogoLockup />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">MAYILON ADMIN PORTAL</h1>
          <p className="text-xs text-slate-400 mt-1">Enterprise Operations & Order Management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 relative">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Passcode Required
            </label>
            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter admin passcode..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 text-white rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none transition-colors"
                autoFocus
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-4" />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>ACCESS CONSOLE</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-[10px] text-slate-500">
          Protected by Server-Side HTTP-Only Session Cookie • Mayilon Pyroworld Operations v3.0
        </div>
      </div>
    </div>
  );
}
