"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { featuresApi } from "@/lib/api/features";
import { useFeatures } from "@/context/FeaturesContext";
import type { ModuleKey, ModuleToggles } from "@/lib/types";
import {
  Users, School, GraduationCap, Heart,
  BookOpen, TableProperties, CalendarDays, ClipboardList, CalendarCheck, FileText, ClipboardCheck,
  CreditCard, DollarSign, Landmark,
  MessageSquare, Megaphone, Images,
  Sparkles, Activity, Archive,
  Save, Loader2,
} from "lucide-react";

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none",
        checked ? "bg-primary" : "bg-stroke dark:bg-strokedark",
      ].join(" ")}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={[
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

// ─── Module definitions ───────────────────────────────────────────────────────

type ModuleDef = {
  key: ModuleKey;
  label: string;
  description: string;
  icon: React.ElementType;
  affectsAll?: boolean;
};

const moduleGroups: { group: string; items: ModuleDef[] }[] = [
  {
    group: "People",
    items: [
      { key: "teachers",  label: "Teachers",  description: "Manage and view teacher/staff records.", icon: Users },
      { key: "classes",   label: "Classes",   description: "Create and manage class groups.",       icon: School },
      { key: "students",  label: "Students",  description: "Student enrollment and records.",       icon: GraduationCap },
      { key: "parents",   label: "Parents",   description: "Parent accounts and linking.",          icon: Heart },
    ],
  },
  {
    group: "Academics",
    items: [
      { key: "subjects",         label: "Subjects",          description: "Course subjects and curriculum.", icon: BookOpen },
      { key: "timetable",        label: "Timetable",         description: "Class schedule and periods.",    icon: TableProperties, affectsAll: true },
      { key: "academicCalendar", label: "Academic Calendar", description: "School-wide event calendar.",    icon: CalendarDays,    affectsAll: true },
      { key: "assignments",      label: "Assignments",       description: "Homework and task management.",  icon: ClipboardList,   affectsAll: true },
      { key: "attendance",       label: "Attendance",        description: "Student attendance tracking.",   icon: CalendarCheck,   affectsAll: true },
      { key: "results",          label: "Results & Report Cards", description: "Exam results and report card generation.", icon: FileText, affectsAll: true },
      { key: "exams",            label: "Exams",             description: "Exam scheduling and records.",  icon: ClipboardCheck,  affectsAll: true },
      { key: "promote",          label: "Promote Students",  description: "End-of-term student promotion.", icon: GraduationCap },
    ],
  },
  {
    group: "Finance",
    items: [
      { key: "fees",             label: "Fees",              description: "Fee billing and collection.", icon: CreditCard,  affectsAll: true },
      { key: "terms",            label: "Terms",             description: "Academic term management.", icon: CalendarDays },
      { key: "salary",           label: "Salary",            description: "Staff salary management.", icon: DollarSign, affectsAll: true },
      { key: "financialRecords", label: "Financial Records", description: "Income and expenditure records.", icon: Landmark },
    ],
  },
  {
    group: "Communication",
    items: [
      { key: "messages",      label: "Messages",      description: "Direct messaging between users.", icon: MessageSquare, affectsAll: true },
      { key: "announcements", label: "Announcements", description: "Broadcast announcements.",        icon: Megaphone,     affectsAll: true },
      { key: "gallery",       label: "Gallery",       description: "Photo albums and media sharing.", icon: Images,        affectsAll: true },
    ],
  },
  {
    group: "Administration",
    items: [
      { key: "aiAnalytics", label: "AI Analytics", description: "AI-powered analytics dashboard.", icon: Sparkles },
      { key: "auditLogs",   label: "Audit Logs",   description: "System audit trail and activity logs.", icon: Activity },
      { key: "archive",     label: "Archive",      description: "Archived records and history.", icon: Archive },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModulesSettingsPage() {
  const queryClient = useQueryClient();
  const { refetch: refetchFeatures } = useFeatures();

  const { data, isLoading } = useQuery({
    queryKey: ["institute-modules"],
    queryFn: featuresApi.getModules,
  });

  const [localModules, setLocalModules] = useState<ModuleToggles | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.modules && localModules === null) {
      setLocalModules({ ...data.modules });
    }
  }, [data, localModules]);

  const { mutate, isPending, isSuccess, reset } = useMutation({
    mutationFn: (updates: ModuleToggles) => featuresApi.updateModules(updates),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["institute-modules"] });
      refetchFeatures();
      setLocalModules({ ...result.modules });
      setIsDirty(false);
      setTimeout(reset, 2000);
    },
  });

  const handleToggle = (key: ModuleKey, value: boolean) => {
    setLocalModules((prev) => ({ ...(prev ?? data?.modules ?? {} as ModuleToggles), [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!localModules) return;
    mutate(localModules);
  };

  const getChecked = (key: ModuleKey): boolean => {
    return localModules?.[key] ?? data?.modules?.[key] ?? true;
  };

  const hasChanges = isDirty;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-body">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading module settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-black dark:text-white">Module Toggles</h2>
        <p className="mt-0.5 text-sm text-body">
          Enable or disable features for your entire institution. Disabled modules are hidden from all users including admin.
        </p>
      </div>

      <div className="space-y-6">
        {moduleGroups.map(({ group, items }) => (
          <div key={group} className="rounded-sm border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-body">{group}</h3>
            <div className="space-y-4">
              {items.map(({ key, label, description, icon: Icon, affectsAll }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-meta-2 dark:bg-meta-4">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-black dark:text-white">{label}</span>
                        {affectsAll && (
                          <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                            Affects all roles
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-body">{description}</p>
                    </div>
                  </div>
                  <Toggle checked={getChecked(key)} onChange={(v) => handleToggle(key, v)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        {isSuccess && !hasChanges && (
          <span className="text-sm text-meta-3">Changes saved.</span>
        )}
        <button
          onClick={handleSave}
          disabled={!hasChanges || isPending}
          className="flex items-center gap-2 rounded bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-opacity-90 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </button>
      </div>
    </div>
  );
}
