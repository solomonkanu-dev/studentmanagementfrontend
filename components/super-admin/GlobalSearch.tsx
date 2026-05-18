"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Building2, ShieldCheck } from "lucide-react";
import { monitorApi } from "@/lib/api/monitor";
import { superAdminApi } from "@/lib/api/superAdmin";
import type { InstituteHealthReport, PendingAdmin } from "@/lib/types";

type Result = {
  id: string;
  type: "institute" | "admin";
  title: string;
  subtitle: string;
  href: string;
};

// Command-palette search across institutes and admins. Self-contained:
// renders its own trigger button and registers the ⌘K / Ctrl+K shortcut.
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          setQuery("");
          setActive(0);
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Only fetch while the palette is open; reuses the dashboard's cache keys.
  const { data: institutes = [] } = useQuery<InstituteHealthReport[]>({
    queryKey: ["monitor-institutes"],
    queryFn: monitorApi.getInstitutes,
    enabled: open,
  });
  const { data: admins = [] } = useQuery<PendingAdmin[]>({
    queryKey: ["super-admins-all"],
    queryFn: superAdminApi.getAllAdmins,
    enabled: open,
  });

  const results: Result[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const instituteHits = institutes
      .filter(
        (r) =>
          r.institute.name.toLowerCase().includes(q) ||
          (r.institute.email ?? "").toLowerCase().includes(q)
      )
      .slice(0, 6)
      .map<Result>((r) => ({
        id: r.institute.id,
        type: "institute",
        title: r.institute.name,
        subtitle: r.institute.email || "Institute",
        href: `/super-admin/institutes?q=${encodeURIComponent(r.institute.name)}`,
      }));
    const adminHits = admins
      .filter(
        (a) =>
          a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
      )
      .slice(0, 6)
      .map<Result>((a) => ({
        id: a._id,
        type: "admin",
        title: a.fullName,
        subtitle: a.email,
        href: `/super-admin/admins?q=${encodeURIComponent(a.fullName)}`,
      }));
    return [...instituteHits, ...adminHits];
  }, [query, institutes, admins]);

  const go = (r: Result) => {
    setOpen(false);
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setActive(0);
          setOpen(true);
        }}
        className="flex items-center gap-2 rounded-sm border border-stroke bg-white px-3 py-2 text-xs text-body transition-colors hover:border-primary/50 dark:border-strokedark dark:bg-boxdark"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Search institutes &amp; admins…</span>
        <kbd className="ml-1 rounded border border-stroke px-1 text-[10px] dark:border-strokedark">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search institutes and admins"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark"
          >
            <div className="flex items-center gap-2 border-b border-stroke px-4 dark:border-strokedark">
              <Search className="h-4 w-4 shrink-0 text-body" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search institutes & admins…"
                aria-label="Search query"
                className="h-12 w-full bg-transparent text-sm text-black outline-none placeholder:text-body dark:text-white"
              />
            </div>
            <div className="max-h-80 overflow-y-auto py-2">
              {query.trim() === "" ? (
                <p className="px-4 py-6 text-center text-xs text-body">
                  Type to search institutes and admins.
                </p>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-body">
                  No matches for “{query}”.
                </p>
              ) : (
                <ul>
                  {results.map((r, i) => (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        type="button"
                        onClick={() => go(r)}
                        onMouseEnter={() => setActive(i)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          i === active ? "bg-whiter dark:bg-meta-4" : ""
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            r.type === "institute"
                              ? "bg-primary/10 text-primary"
                              : "bg-meta-3/10 text-meta-3"
                          }`}
                        >
                          {r.type === "institute" ? (
                            <Building2 className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-black dark:text-white">
                            {r.title}
                          </span>
                          <span className="block truncate text-xs text-body">{r.subtitle}</span>
                        </span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-body">
                          {r.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
