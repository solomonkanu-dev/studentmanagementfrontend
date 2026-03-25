"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScrollText, Save, RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RuleSection {
  id: string;
  title: string;
  content: string;
}

const STORAGE_KEY = "rules_and_regulations";

const DEFAULT_SECTIONS: RuleSection[] = [
  {
    id: "academic",
    title: "Academic Rules",
    content:
      "1. Students must attend at least 75% of classes to be eligible for examinations.\n2. Assignments must be submitted by the specified due date. Late submissions will incur a penalty.\n3. Academic dishonesty including plagiarism and cheating is strictly prohibited.\n4. Students must maintain a minimum GPA of 2.0 to remain in good academic standing.\n5. All examination rules as communicated by the examinations office must be followed.",
  },
  {
    id: "conduct",
    title: "Conduct & Discipline",
    content:
      "1. Students must treat all staff, lecturers, and fellow students with respect.\n2. Use of abusive language, bullying, or harassment of any kind will result in disciplinary action.\n3. Students are responsible for the upkeep of school property. Damage to property will be charged to the responsible student.\n4. Mobile phones must be on silent during class sessions unless explicitly permitted by the lecturer.\n5. Dress code must be adhered to at all times while on school premises.",
  },
  {
    id: "attendance",
    title: "Attendance Policy",
    content:
      "1. Attendance is compulsory for all scheduled classes, lectures, and examinations.\n2. Absences must be reported to the class teacher or administration before the class, or within 24 hours of the absence.\n3. Medical absences must be supported by a valid medical certificate.\n4. Students with attendance below 75% in any subject will not be permitted to sit the final examination for that subject.\n5. Persistent truancy will result in suspension or expulsion.",
  },
  {
    id: "examination",
    title: "Examination Rules",
    content:
      "1. Students must arrive at least 15 minutes before the scheduled examination time.\n2. No student will be admitted to the examination hall after 30 minutes from the start time.\n3. Electronic devices, notes, or any unauthorized materials are strictly prohibited in the examination hall.\n4. Students must present their valid student ID to enter the examination hall.\n5. Results will be released within 4 weeks of the examination date.",
  },
  {
    id: "fees",
    title: "Fee Policy",
    content:
      "1. All school fees must be paid in full by the specified deadline each term.\n2. Students with outstanding fees may be suspended from classes until the balance is settled.\n3. Fee receipts must be kept and presented upon request.\n4. Requests for fee deferrals must be made in writing to the administration at least two weeks before the due date.\n5. Refund requests are subject to the school's refund policy as communicated at enrollment.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RulesPage() {
  const [sections, setSections] = useState<RuleSection[]>(DEFAULT_SECTIONS);
  const [activeId, setActiveId] = useState("academic");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSections(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function reset() {
    setSections(DEFAULT_SECTIONS);
  }

  function updateContent(id: string, content: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content } : s))
    );
  }

  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* ── Section list ─────────────────────────────────────────────── */}
        <div className="space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={[
                "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors",
                activeId === s.id
                  ? "bg-primary text-white"
                  : "text-body hover:bg-meta-2 hover:text-black dark:hover:bg-meta-4 dark:hover:text-white",
              ].join(" ")}
            >
              <ScrollText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {s.title}
            </button>
          ))}
        </div>

        {/* ── Editor ──────────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
            <h2 className="text-sm font-semibold text-black dark:text-white">
              {active?.title}
            </h2>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </Button>
              <Button size="sm" onClick={save}>
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                {saved ? "Saved!" : "Save All"}
              </Button>
            </div>
          </div>
          <CardContent>
            <p className="mb-2 text-xs text-body">
              Each numbered line is displayed as a separate rule. Use plain text
              — formatting is not supported.
            </p>
            <textarea
              key={activeId}
              value={active?.content ?? ""}
              onChange={(e) => updateContent(activeId, e.target.value)}
              rows={16}
              className="w-full resize-y rounded border border-stroke bg-transparent px-3 py-2.5 text-sm leading-relaxed text-black outline-none focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary"
              placeholder="Enter rules, one per line..."
              aria-label={`Rules for ${active?.title}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Preview ──────────────────────────────────────────────────────── */}
      <Card>
        <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
          <h2 className="text-sm font-semibold text-black dark:text-white">
            Preview — {active?.title}
          </h2>
        </div>
        <CardContent>
          <ol className="space-y-2">
            {(active?.content ?? "")
              .split("\n")
              .filter((line) => line.trim())
              .map((line, i) => {
                const text = line.replace(/^\d+\.\s*/, "");
                return (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <p className="pt-0.5 text-sm text-black dark:text-white">
                      {text}
                    </p>
                  </li>
                );
              })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
