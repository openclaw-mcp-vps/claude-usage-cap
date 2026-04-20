"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm font-semibold text-[#cbd5e1] transition hover:border-[#ef4444] hover:text-[#ef4444]"
    >
      Log Out
    </button>
  );
}
