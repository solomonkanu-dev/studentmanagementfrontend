"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { ScrollText } from "lucide-react";

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

export default function StudentRulesPage() {
  const [sections, setSections] = useState<RuleSection[]>(DEFAULT_SECTIONS);
  const [activeId, setActiveId] = useState("academic");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSections(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  const active = sections.find((s) => s.id === activeId) ?? sections[0];

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
                    activeId === s.id
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
          <h2 className="text-sm font-semibold text-black dark:text-white">{active?.title}</h2>
        </div>
        <CardContent>
          {active ? (
            <div className="whitespace-pre-line text-sm leading-relaxed text-body">
              {active.content}
            </div>
          ) : (
            <p className="text-sm text-body">Select a section to read.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
