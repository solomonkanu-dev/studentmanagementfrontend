"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScrollText, Save, RotateCcw, Plus, Trash2, CloudOff } from "lucide-react";
import { rulesApi } from "@/lib/api/rules";
import { errMsg } from "@/lib/utils/errMsg";
import type { RuleSection } from "@/lib/types";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function RulesPage() {
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["rules"],
    queryFn: rulesApi.get,
    staleTime: 5 * 60_000,
  });

  const [sections, setSections] = useState<RuleSection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (data?.sections && !dirty) {
      setSections(data.sections);
      setActiveId((prev) => prev ?? data.sections[0]?.id ?? null);
    }
  }, [data, dirty]);

  const active = useMemo(
    () => sections.find((s) => s.id === activeId) ?? sections[0],
    [sections, activeId]
  );

  const publish = useMutation({
    mutationFn: () => rulesApi.update(sections.map((s, i) => ({ ...s, order: i }))),
    onSuccess: (fresh) => {
      qc.setQueryData(["rules"], fresh);
      setDirty(false);
      setToast("Published");
      setTimeout(() => setToast(null), 2500);
    },
    onError: (err) => {
      const msg = errMsg(err, "Failed to publish rules");
      setToast(msg);
      setTimeout(() => setToast(null), 4000);
    },
  });

  const loadDefaults = useMutation({
    mutationFn: rulesApi.getDefaults,
    onSuccess: ({ sections: defs }) => {
      setSections(defs);
      setActiveId(defs[0]?.id ?? null);
      setDirty(true);
    },
    onError: (err) => {
      const msg = errMsg(err, "Could not load defaults");
      setToast(msg);
      setTimeout(() => setToast(null), 4000);
    },
  });

  function updateContent(id: string, content: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content } : s))
    );
    setDirty(true);
  }

  function renameSection(id: string, title: string) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    setDirty(true);
  }

  function addSection() {
    const baseTitle = "New Section";
    let title = baseTitle;
    let n = 1;
    while (sections.some((s) => s.title.toLowerCase() === title.toLowerCase())) {
      n += 1;
      title = `${baseTitle} ${n}`;
    }
    let id = slugify(title) || `section-${Date.now()}`;
    while (sections.some((s) => s.id === id)) {
      id = `${id}-${Math.floor(Math.random() * 1000)}`;
    }
    setSections((prev) => [...prev, { id, title, content: "", order: prev.length }]);
    setActiveId(id);
    setDirty(true);
  }

  function removeSection(id: string) {
    if (sections.length <= 1) {
      setToast("At least one section is required");
      setTimeout(() => setToast(null), 2500);
      return;
    }
    if (!confirm("Remove this section?")) return;
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
    setDirty(true);
  }

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
            <Button size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const previewLines = (active?.content ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {data?.isDefault && (
        <Card>
          <CardContent>
            <p className="text-xs text-body">
              You&apos;re viewing the default rules. Publish to make them visible to your
              students.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Section list */}
        <div className="space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={[
                "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors",
                s.id === active?.id
                  ? "bg-primary text-white"
                  : "text-body hover:bg-meta-2 hover:text-black dark:hover:bg-meta-4 dark:hover:text-white",
              ].join(" ")}
            >
              <ScrollText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{s.title}</span>
            </button>
          ))}
          <button
            onClick={addSection}
            className="flex w-full items-center gap-2 rounded-md border border-dashed border-stroke px-3 py-2.5 text-left text-sm font-medium text-body hover:border-primary hover:text-primary dark:border-strokedark"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Add section
          </button>
        </div>

        {/* Editor */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke px-5 py-4 dark:border-strokedark">
            <input
              type="text"
              value={active?.title ?? ""}
              onChange={(e) =>
                active && renameSection(active.id, e.target.value)
              }
              placeholder="Section title"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-black outline-none focus:ring-0 dark:text-white"
              aria-label="Section title"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => active && removeSection(active.id)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Remove
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => loadDefaults.mutate()}
                disabled={loadDefaults.isPending}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset to defaults
              </Button>
              <Button
                size="sm"
                onClick={() => publish.mutate()}
                disabled={publish.isPending || !dirty}
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                {publish.isPending ? "Publishing…" : dirty ? "Publish" : "Published"}
              </Button>
            </div>
          </div>
          <CardContent>
            <p className="mb-2 text-xs text-body">
              Each numbered line is displayed as a separate rule. Use plain text —
              formatting is not supported.
            </p>
            <textarea
              key={active?.id}
              value={active?.content ?? ""}
              onChange={(e) =>
                active && updateContent(active.id, e.target.value)
              }
              rows={16}
              className="w-full resize-y rounded border border-stroke bg-transparent px-3 py-2.5 text-sm leading-relaxed text-black outline-none focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary"
              placeholder="1. First rule&#10;2. Second rule"
              aria-label={`Rules for ${active?.title ?? "section"}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      {active && (
        <Card>
          <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Preview — {active.title}
            </h2>
          </div>
          <CardContent>
            {previewLines.length === 0 ? (
              <p className="text-sm text-body">No rules in this section yet.</p>
            ) : (
              <ol className="space-y-2">
                {previewLines.map((line, i) => {
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
            )}
          </CardContent>
        </Card>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/85 px-4 py-2 text-sm text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
