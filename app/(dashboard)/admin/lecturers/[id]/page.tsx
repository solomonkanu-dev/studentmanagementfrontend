"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { subjectApi } from "@/lib/api/subject";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowLeft,
  Users,
  BookOpen,
  Briefcase,
  Phone,
  MapPin,
  Pencil,
  X,
  Calendar,
  Heart,
  GraduationCap,
} from "lucide-react";
import type { AuthUser, Subject } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function LecturerDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "profile">("overview");
  const [editOpen, setEditOpen] = useState(false);

  const { data: lecturer, isLoading } = useQuery({
    queryKey: ["admin-lecturer", id],
    queryFn: () => adminApi.getLecturer(id),
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: subjectApi.getAll,
  });

  const lecturerSubjects = useMemo(() => {
    return allSubjects.filter((s: Subject) => {
      const lecId =
        s.lecturer && typeof s.lecturer === "object"
          ? (s.lecturer as { _id: string })._id
          : s.lecturer;
      return lecId === id;
    });
  }, [allSubjects, id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary"
          role="status"
          aria-label="Loading lecturer"
        />
      </div>
    );
  }

  if (!lecturer) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <GraduationCap className="h-10 w-10 text-body" aria-hidden="true" />
        <p className="text-sm text-body">Lecturer not found.</p>
        <Link href="/admin/lecturers/list" className="text-xs text-primary hover:underline">
          Back to Lecturers
        </Link>
      </div>
    );
  }

  const lp = ((lecturer as unknown) as Record<string, unknown>).lecturerProfile as Record<string, unknown> | undefined ?? {};

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/admin/lecturers/list"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-body hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Lecturers
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-meta-2 text-lg font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
            {lecturer.fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-bold text-black dark:text-white">{lecturer.fullName}</h1>
            <p className="text-sm text-body">{lecturer.email}</p>
            {!!lp.department && (
              <p className="text-xs text-body">{lp.position ? `${String(lp.position)} · ` : ""}{String(lp.department)}</p>
            )}
          </div>
          <Badge variant={(lecturer as unknown as { isActive: boolean }).isActive ? "success" : "danger"}>
            {(lecturer as unknown as { isActive: boolean }).isActive ? "Active" : "Suspended"}
          </Badge>
        </div>
      </div>

      {/* Tab nav */}
      <div className="border-b border-stroke dark:border-strokedark">
        <nav className="-mb-px flex gap-6">
          {(["overview", "profile"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "pb-3 text-sm font-medium capitalize transition-colors",
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-body hover:text-black dark:hover:text-white",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<BookOpen className="h-6 w-6 text-primary" />}
              label="Subjects Assigned"
              value={String(lecturerSubjects.length)}
            />
            <StatCard
              icon={<Briefcase className="h-6 w-6 text-meta-3" />}
              label="Department"
              value={(lp.department as string) || "—"}
            />
            <StatCard
              icon={<Users className="h-6 w-6 text-yellow-500" />}
              label="Employee ID"
              value={(lp.employeeId as string) || "—"}
            />
          </div>

          {/* Subjects */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-black dark:text-white">Assigned Subjects</h2>
            </CardHeader>
            <CardContent>
              {lecturerSubjects.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <BookOpen className="h-8 w-8 text-body" aria-hidden="true" />
                  <p className="text-sm text-body">No subjects assigned yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {lecturerSubjects.map((s: Subject) => {
                    const className =
                      s.class && typeof s.class === "object"
                        ? (s.class as { name: string }).name
                        : "—";
                    return (
                      <div
                        key={s._id}
                        className="rounded-md border border-stroke p-3 dark:border-strokedark"
                      >
                        <p className="text-sm font-medium text-black dark:text-white">{s.name}</p>
                        <p className="mt-0.5 text-xs text-body">{className}</p>
                        {s.code && <p className="mt-0.5 text-xs text-body">{s.code}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black dark:text-white">Lecturer Information</h2>
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Basic */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-black dark:text-white">Professional Details</h3>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="space-y-1">
                  <ProfileRow label="Full Name" value={lecturer.fullName} />
                  <ProfileRow label="Email" value={lecturer.email} />
                  <ProfileRow label="Employee ID" value={(lp.employeeId as string) ?? "—"} />
                  <ProfileRow label="Department" value={(lp.department as string) ?? "—"} />
                  <ProfileRow label="Position" value={(lp.position as string) ?? "—"} />
                  <ProfileRow label="Date of Joining" value={lp.dateOfJoining ? new Date(lp.dateOfJoining as string).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
                </dl>
              </CardContent>
            </Card>

            {/* Personal */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-black dark:text-white">Personal Details</h3>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="space-y-1">
                  <ProfileRow label="Date of Birth" value={lp.dateOfBirth ? new Date(lp.dateOfBirth as string).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
                  <ProfileRow label="Gender" value={(lp.gender as string) ?? "—"} />
                  <ProfileRow label="Marital Status" value={(lp.maritalStatus as string) ?? "—"} />
                  <ProfileRow label="Blood Group" value={(lp.bloodGroup as string) ?? "—"} />
                  <ProfileRow label="Phone" value={(lp.phoneNumber as string) ?? "—"} />
                  <ProfileRow label="Address" value={(lp.address as string) ?? "—"} />
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && lecturer && (
        <EditLecturerModal
          lecturer={lecturer}
          lecturerProfile={lp}
          lecturerId={id}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-lecturer", id] });
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Edit Modal ─────────────────────────────────────────────────────────────

function EditLecturerModal({
  lecturer,
  lecturerProfile,
  lecturerId,
  onClose,
  onSaved,
}: {
  lecturer: AuthUser;
  lecturerProfile: Record<string, unknown>;
  lecturerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const lp = lecturerProfile;

  const [form, setForm] = useState({
    fullName: lecturer.fullName ?? "",
    email: lecturer.email ?? "",
    employeeId: (lp.employeeId as string) ?? "",
    department: (lp.department as string) ?? "",
    position: (lp.position as string) ?? "",
    dateOfJoining: lp.dateOfJoining ? (lp.dateOfJoining as string).slice(0, 10) : "",
    dateOfBirth: lp.dateOfBirth ? (lp.dateOfBirth as string).slice(0, 10) : "",
    gender: (lp.gender as string) ?? "",
    maritalStatus: (lp.maritalStatus as string) ?? "",
    bloodGroup: (lp.bloodGroup as string) ?? "",
    phoneNumber: (lp.phoneNumber as string) ?? "",
    address: (lp.address as string) ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await adminApi.updateLecturer(lecturerId, {
        fullName: form.fullName,
        email: form.email,
        lecturerProfile: {
          employeeId: form.employeeId,
          department: form.department,
          position: form.position,
          dateOfJoining: form.dateOfJoining || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender,
          maritalStatus: form.maritalStatus,
          bloodGroup: form.bloodGroup,
          phoneNumber: form.phoneNumber,
          address: form.address,
        },
      });
      onSaved();
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
          <h2 className="text-base font-semibold text-black dark:text-white">Edit Lecturer Profile</h2>
          <button onClick={onClose} className="text-body hover:text-black dark:hover:text-white transition-colors">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Basic */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-body">Basic</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Name">
                <input name="fullName" value={form.fullName} onChange={handleChange} className={inputCls} required />
              </Field>
              <Field label="Email">
                <input name="email" type="email" value={form.email} onChange={handleChange} className={inputCls} />
              </Field>
            </div>
          </section>

          {/* Professional */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-body">Professional Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Employee ID">
                <input name="employeeId" value={form.employeeId} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Department">
                <input name="department" value={form.department} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Position">
                <input name="position" value={form.position} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Date of Joining">
                <input name="dateOfJoining" type="date" value={form.dateOfJoining} onChange={handleChange} className={inputCls} />
              </Field>
            </div>
          </section>

          {/* Personal */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-body">Personal Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date of Birth">
                <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Gender">
                <select name="gender" value={form.gender} onChange={handleChange} className={inputCls}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Marital Status">
                <select name="maritalStatus" value={form.maritalStatus} onChange={handleChange} className={inputCls}>
                  <option value="">Select</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </Field>
              <Field label="Blood Group">
                <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className={inputCls}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </Field>
              <Field label="Phone">
                <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <textarea name="address" value={form.address} onChange={handleChange} rows={2} className={inputCls} />
              </Field>
            </div>
          </section>

          {error && <p className="text-sm text-meta-1">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-stroke pt-4 dark:border-strokedark">
            <button type="button" onClick={onClose} className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-body hover:bg-whiter transition-colors dark:border-strokedark dark:hover:bg-meta-4">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60 transition-colors">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-body">{label}</label>
      {children}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-stroke last:border-0 dark:border-strokedark">
      <dt className="shrink-0 text-xs text-body">{label}</dt>
      <dd className="text-right text-xs font-medium text-black dark:text-white">{value || "—"}</dd>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
        {icon}
      </div>
      <p className="text-xs text-body">{label}</p>
      <p className="mt-1 text-xl font-bold text-black dark:text-white">{value}</p>
    </div>
  );
}
