"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/Card";
import { ScrollText, CloudOff } from "lucide-react";
import { rulesApi } from "@/lib/api/rules";

export default function StudentRulesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rules"],
    queryFn: rulesApi.get,
    staleTime: 5 * 60_000,
  });

  const sections = data?.sections ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (sections.length && !activeId) setActiveId(sections[0].id);
  }, [sections, activeId]);

  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-body">
        Loading rules…
      </div>
    );
  }

  if (isError && sections.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <CloudOff className="h-6 w-6 text-body" aria-hidden="true" />
            <p className="text-sm text-body">
              Couldn&apos;t load rules. Check your connection and try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="py-6 text-center text-sm text-body">
            No rules published yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Sidebar tabs */}
      <Card className="lg:col-span-1">
        <div className="flex items-center gap-2 border-b border-stroke px-5 py-4 dark:border-strokedark">
          <ScrollText className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-black dark:text-white">Sections</h2>
        </div>
        <CardContent className="p-2">
          <ul className="space-y-0.5">
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setActiveId(s.id)}
                  className={[
                    "w-full rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    s.id === active?.id
                      ? "bg-primary text-white"
                      : "text-body hover:bg-stroke hover:text-black dark:hover:bg-meta-4 dark:hover:text-white",
                  ].join(" ")}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Content */}
      <Card className="lg:col-span-3">
        <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
          <h2 className="text-sm font-semibold text-black dark:text-white">
            {active?.title}
          </h2>
        </div>
        <CardContent>
          {active ? (
            <ol className="space-y-2">
              {(active.content ?? "")
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map((line, i) => {
                  const text = line.replace(/^\d+\.\s*/, "");
                  return (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <p className="pt-0.5 text-sm text-black dark:text-white">{text}</p>
                    </li>
                  );
                })}
            </ol>
          ) : (
            <p className="text-sm text-body">Select a section to read.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
