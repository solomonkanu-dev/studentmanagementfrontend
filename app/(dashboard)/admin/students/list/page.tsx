"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adminApi } from "@/lib/api/admin";
import { classApi } from "@/lib/api/class";
import { exportApi } from "@/lib/api/export";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import {
  Plus, Search, GraduationCap, Copy, CheckCircle2,
  Pencil, KeyRound, Eye, EyeOff, RefreshCw,
  ShieldOff, PlayCircle, Trash2, ShieldAlert, Download, Activity,
} from "lucide-react";
import type { AuthUser, Class } from "@/lib/types";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email"),
  classId: z.string().min(1, "Select a class"),
  registrationNumber: z.string().optional(),
  dateOfAdmission: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  religion: z.string().optional(),
  previousSchool: z.string().optional(),
  familyType: z.string().optional(),
  medicalInfo: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  guardianRelationship: z.string().optional(),
  guardianOccupation: z.string().optional(),
});

const editSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email"),
  classId: z.string().min(1, "Select a class"),
  registrationNumber: z.string().optional(),
  dateOfAdmission: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  religion: z.string().optional(),
  previousSchool: z.string().optional(),
  familyType: z.string().optional(),
  medicalInfo: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  guardianRelationship: z.string().optional(),
  guardianOccupation: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => chars[b % chars.length])
    .join("");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentsListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [pwCopied, setPwCopied] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<AuthUser | null>(null);
  const [editError, setEditError] = useState("");

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [resetCopied, setResetCopied] = useState(false);

  // Suspend / delete
  const [suspendTarget, setSuspendTarget] = useState<AuthUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [suspendError, setSuspendError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Lifecycle modal
  const [lifecycleTarget, setLifecycleTarget] = useState<AuthUser | null>(null);
  const [lifecycleStatus, setLifecycleStatus] = useState("active");
  const [lifecycleNote, setLifecycleNote] = useState("");
  const [lifecycleError, setLifecycleError] = useState("");

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classApi.getAll,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: adminApi.createStudent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      resetCreate();
      const d = data as unknown as Record<string, unknown>;
      if (d.tempPassword) setTempPassword(d.tempPassword as string);
      else setShowCreate(false);
    },
    onError: (e: unknown) => setCreateError(apiMsg(e, "Failed to create student")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateStudent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      closeEdit();
    },
    onError: (e: unknown) => setEditError(apiMsg(e, "Failed to update student")),
  });

  const resetMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      adminApi.resetPassword(userId, { password }),
    onSuccess: () => setResetDone(true),
    onError: (e: unknown) => setResetError(apiMsg(e, "Failed to reset password")),
  });

  const invalidateStudents = () => queryClient.invalidateQueries({ queryKey: ["admin-students"] });

  const suspendMutation = useMutation({
    mutationFn: (userId: string) =>
      (students as AuthUser[]).find((s) => s._id === userId)?.isActive
        ? adminApi.suspendUser(userId)
        : adminApi.unsuspendUser(userId),
    onSuccess: () => { invalidateStudents(); setSuspendTarget(null); setSuspendError(""); },
    onError: (e: unknown) => setSuspendError(apiMsg(e, "Failed to update account status")),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => { invalidateStudents(); setDeleteTarget(null); setDeleteError(""); },
    onError: (e: unknown) => setDeleteError(apiMsg(e, "Failed to delete student")),
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ studentId, payload }: { studentId: string; payload: { lifecycleStatus: string; lifecycleNote?: string } }) =>
      adminApi.updateStudentLifecycle(studentId, payload),
    onSuccess: () => {
      invalidateStudents();
      setLifecycleTarget(null);
      setLifecycleError("");
    },
    onError: (e: unknown) => setLifecycleError(apiMsg(e, "Failed to update lifecycle status")),
  });

  // ─── Create form ─────────────────────────────────────────────────────────────

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    setValue: setCreateValue,
    formState: { errors: createErrors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  function nextRegistrationNumber(list: AuthUser[]) {
    const nums = list.flatMap((s) => {
      const id = s.studentProfile?.registrationNumber ?? "";
      const m = id.match(/(\d+)$/);
      return m ? [parseInt(m[1], 10)] : [];
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `STU-${String(max + 1).padStart(3, "0")}`;
  }

  function openCreate() {
    setShowCreate(true);
    setCreateValue("registrationNumber", nextRegistrationNumber(students));
  }

  const onCreateSubmit = (v: CreateForm) => {
    setCreateError("");
    setTempPassword("");
    const studentProfile = buildStudentProfile(v);
    const guardian = buildGuardian(v);
    if (guardian) studentProfile.guardian = guardian;
    createMutation.mutate({
      fullName: v.fullName,
      email: v.email,
      classId: v.classId,
      ...(Object.keys(studentProfile).length > 0 ? { studentProfile } : {}),
    });
  };

  const closeCreate = () => {
    setShowCreate(false);
    resetCreate();
    setCreateError("");
    setTempPassword("");
    setPwCopied(false);
  };

  // ─── Edit form ───────────────────────────────────────────────────────────────

  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const openEdit = (s: AuthUser) => {
    setEditTarget(s);
    setEditError("");
    const p = s.studentProfile ?? {};
    const g = (p as Record<string, unknown>).guardian as Record<string, string> | undefined;
    resetEdit({
      fullName: s.fullName,
      email: s.email,
      classId: typeof s.class === "string" ? s.class : (s.class as unknown as Class)?._id ?? "",
      registrationNumber: (p as Record<string, string>).registrationNumber ?? "",
      dateOfAdmission: (p as Record<string, string>).dateOfAdmission ? (p as Record<string, string>).dateOfAdmission.slice(0, 10) : "",
      dateOfBirth: (p as Record<string, string>).dateOfBirth ?? "",
      gender: (p as Record<string, string>).gender ?? "",
      mobileNumber: (p as Record<string, string>).mobileNumber ?? "",
      address: (p as Record<string, string>).address ?? "",
      bloodGroup: (p as Record<string, string>).bloodGroup ?? "",
      religion: (p as Record<string, string>).religion ?? "",
      previousSchool: (p as Record<string, string>).previousSchool ?? "",
      familyType: (p as Record<string, string>).familyType ?? "",
      medicalInfo: (p as Record<string, string>).medicalInfo ?? "",
      guardianName: g?.guardianName ?? "",
      guardianPhone: g?.guardianPhone ?? "",
      guardianEmail: g?.guardianEmail ?? "",
      guardianRelationship: g?.guardianRelationship ?? "",
      guardianOccupation: g?.guardianOccupation ?? "",
    });
  };

  const closeEdit = () => {
    setEditTarget(null);
    resetEdit();
    setEditError("");
  };

  const onEditSubmit = (v: EditForm) => {
    if (!editTarget) return;
    setEditError("");
    const studentProfile = buildStudentProfile(v);
    const guardian = buildGuardian(v);
    if (guardian) studentProfile.guardian = guardian;
    updateMutation.mutate({
      id: editTarget._id,
      payload: {
        fullName: v.fullName,
        email: v.email,
        classId: v.classId,
        ...(Object.keys(studentProfile).length > 0 ? { studentProfile } : {}),
      },
    });
  };

  // ─── Reset password ──────────────────────────────────────────────────────────

  const openReset = (s: AuthUser) => {
    setResetTarget(s);
    setNewPassword(generatePassword());
    setResetError("");
    setResetDone(false);
    setResetCopied(false);
    setShowPwd(false);
  };

  const closeReset = () => {
    setResetTarget(null);
    setNewPassword("");
    setResetError("");
    setResetDone(false);
    setResetCopied(false);
  };

  const copyReset = () => {
    navigator.clipboard.writeText(newPassword);
    setResetCopied(true);
    setTimeout(() => setResetCopied(false), 2000);
  };

  // ─── Lifecycle handlers ──────────────────────────────────────────────────────

  const openLifecycle = (s: AuthUser) => {
    setLifecycleTarget(s);
    setLifecycleStatus(s.lifecycleStatus ?? "active");
    setLifecycleNote(s.lifecycleNote ?? "");
    setLifecycleError("");
  };

  const closeLifecycle = () => {
    setLifecycleTarget(null);
    setLifecycleError("");
  };

  // ─── Filtered list ───────────────────────────────────────────────────────────

  const filtered = students.filter((s: AuthUser) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const studentClassId =
      typeof s.class === "string" ? s.class : (s.class as unknown as { _id: string } | null)?._id ?? "";
    const matchesClass = !classFilter || studentClassId === classFilter;
    return matchesSearch && matchesClass;
  });

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search students"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded border border-stroke bg-transparent pl-9 pr-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            />
          </div>
          <select
            aria-label="Filter by class"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-9 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          >
            <option value="">All Classes</option>
            {(classes as Class[]).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => exportApi.students()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Student
          </Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" role="status" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <GraduationCap className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm text-body">
              {search || classFilter ? "No students match your filters." : "No students found."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Class</Th>
                <Th>Status</Th>
                <Th>Lifecycle</Th>
                <Th>Joined</Th>
                <Th>Actions</Th>
              </tr>
            </TableHead>
            <TableBody>
              {filtered.map((s: AuthUser) => {
                const className = (classes as Class[]).find(
                  (c) => c._id === (typeof s.class === "string" ? s.class : (s.class as unknown as Class)?._id)
                )?.name;
                return (
                  <tr key={s._id} className="hover:bg-whiter transition-colors dark:hover:bg-meta-4">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                          {s.fullName.charAt(0)}
                        </div>
                        <span className="font-medium text-black dark:text-white">{s.fullName}</span>
                      </div>
                    </Td>
                    <Td className="text-body">{s.email}</Td>
                    <Td className="text-body">{className ?? "—"}</Td>
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        {s.isActive && (
                        <Badge variant={s.approved ? "success" : "warning"}>
                          {s.approved ? "Approved" : "Pending"}
                        </Badge>
                        )}
                        {!s.isActive && (
                          <Badge variant="danger">Suspended</Badge>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <LifecycleStatusBadge status={s.lifecycleStatus} />
                    </Td>
                    <Td className="text-xs text-body">
                      {new Date(s.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/students/${s._id}`}>
                          <ActionBtn title="View student" onClick={() => {}}>
                            <Eye className="h-3.5 w-3.5" />
                          </ActionBtn>
                        </Link>
                        <ActionBtn title="Edit student" onClick={() => openEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn title="Update lifecycle status" onClick={() => openLifecycle(s)}>
                          <Activity className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn title="Reset password" onClick={() => openReset(s)} danger>
                          <KeyRound className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          title={s.isActive ? "Suspend account" : "Unsuspend account"}
                          onClick={() => { setSuspendTarget(s); setSuspendError(""); }}
                          danger={s.isActive}
                        >
                          {s.isActive
                            ? <ShieldOff className="h-3.5 w-3.5" />
                            : <PlayCircle className="h-3.5 w-3.5 text-meta-3" />
                          }
                        </ActionBtn>
                        <ActionBtn title="Delete account" onClick={() => { setDeleteTarget(s); setDeleteError(""); }} danger>
                          <Trash2 className="h-3.5 w-3.5" />
                        </ActionBtn>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── Create modal ────────────────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={closeCreate} title="Add Student">
        {tempPassword ? (
          <PasswordReveal
            label="Student created successfully!"
            note="Share this with the student. They should change it on first login."
            password={tempPassword}
            copied={pwCopied}
            onCopy={() => { navigator.clipboard.writeText(tempPassword); setPwCopied(true); setTimeout(() => setPwCopied(false), 2000); }}
            onDone={closeCreate}
          />
        ) : (
          <form onSubmit={handleCreate(onCreateSubmit)} className="space-y-5">
            <StudentFormFields register={regCreate} errors={createErrors} classes={classes as Class[]} />
            {createError && <ErrorMsg msg={createError} />}
            <p className="text-xs text-body">A temporary password will be auto-generated for first login.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={closeCreate}>Cancel</Button>
              <Button type="submit" isLoading={createMutation.isPending}>Create Student</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Edit modal ──────────────────────────────────────────────────────── */}
      <Modal open={editTarget !== null} onClose={closeEdit} title="Edit Student">
        <form onSubmit={handleEdit(onEditSubmit)} className="space-y-5">
          <StudentFormFields register={regEdit} errors={editErrors} classes={classes as Class[]} />
          {editError && <ErrorMsg msg={editError} />}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={closeEdit}>Cancel</Button>
            <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* ── Reset password modal ─────────────────────────────────────────────── */}
      <Modal open={resetTarget !== null} onClose={closeReset} title="Reset Password">
        {resetDone ? (
          <PasswordReveal
            label={`Password reset for ${resetTarget?.fullName}`}
            note="Share this new password with the student so they can log in."
            password={newPassword}
            copied={resetCopied}
            onCopy={copyReset}
            onDone={closeReset}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-body">
              Set a new password for{" "}
              <span className="font-semibold text-black dark:text-white">{resetTarget?.fullName}</span>.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-black dark:text-white">New Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-9 w-full rounded border border-stroke bg-transparent px-3 pr-9 font-mono text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-body hover:text-black dark:hover:text-white"
                  >
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setNewPassword(generatePassword())}
                  title="Generate random password"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <PasswordStrength password={newPassword} />
            </div>

            {resetError && <ErrorMsg msg={resetError} />}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={closeReset}>Cancel</Button>
              <Button
                isLoading={resetMutation.isPending}
                onClick={() => resetTarget && resetMutation.mutate({ userId: resetTarget._id, password: newPassword })}
                disabled={newPassword.length < 6}
              >
                Reset Password
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Suspend / Unsuspend modal ────────────────────────────────────────── */}
      <Modal
        open={suspendTarget !== null}
        onClose={() => { setSuspendTarget(null); setSuspendError(""); }}
        title={suspendTarget?.isActive ? "Suspend Account" : "Unsuspend Account"}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${suspendTarget?.isActive ? "bg-meta-1/10" : "bg-meta-3/10"}`}>
              {suspendTarget?.isActive
                ? <ShieldAlert className="h-5 w-5 text-meta-1" />
                : <PlayCircle className="h-5 w-5 text-meta-3" />
              }
            </div>
            <p className="text-sm text-body">
              {suspendTarget?.isActive ? (
                <>Suspending <span className="font-semibold text-black dark:text-white">{suspendTarget?.fullName}</span> will prevent them from logging in. You can unsuspend at any time.</>
              ) : (
                <>Unsuspending <span className="font-semibold text-black dark:text-white">{suspendTarget?.fullName}</span> will restore their access to the platform.</>
              )}
            </p>
          </div>
          {suspendError && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{suspendError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setSuspendTarget(null); setSuspendError(""); }}>Cancel</Button>
            <Button
              variant={suspendTarget?.isActive ? "danger" : undefined}
              isLoading={suspendMutation.isPending}
              onClick={() => suspendTarget && suspendMutation.mutate(suspendTarget._id)}
            >
              {suspendTarget?.isActive ? "Suspend" : "Unsuspend"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => { setDeleteTarget(null); setDeleteError(""); }}
        title="Delete Student"
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            Permanently delete <span className="font-semibold text-black dark:text-white">{deleteTarget?.fullName}</span>? This cannot be undone and will remove all their data.
          </p>
          {deleteError && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{deleteError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setDeleteTarget(null); setDeleteError(""); }}>Cancel</Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Lifecycle modal ──────────────────────────────────────────────────── */}
      <Modal
        open={lifecycleTarget !== null}
        onClose={closeLifecycle}
        title="Update Lifecycle Status"
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            Update the lifecycle status for{" "}
            <span className="font-semibold text-black dark:text-white">{lifecycleTarget?.fullName}</span>.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Status</label>
            <select
              value={lifecycleStatus}
              onChange={(e) => setLifecycleStatus(e.target.value)}
              className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
            >
              <option value="active">Active</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">
              Note <span className="font-normal text-body">(optional)</span>
            </label>
            <textarea
              value={lifecycleNote}
              onChange={(e) => setLifecycleNote(e.target.value)}
              placeholder="Add a note about this status change…"
              rows={3}
              className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white resize-none"
            />
          </div>

          {lifecycleError && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{lifecycleError}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={closeLifecycle}>Cancel</Button>
            <Button
              isLoading={lifecycleMutation.isPending}
              onClick={() =>
                lifecycleTarget &&
                lifecycleMutation.mutate({
                  studentId: lifecycleTarget._id,
                  payload: { lifecycleStatus, lifecycleNote: lifecycleNote || undefined },
                })
              }
            >
              Save Status
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Shared form fields ───────────────────────────────────────────────────────

function StudentFormFields({
  register,
  errors,
  classes,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  classes: Class[];
}) {
  return (
    <>
      <div>
        <SectionLabel>Basic Info</SectionLabel>
        <div className="space-y-3">
          <Input label="Full Name *" placeholder="Jane Doe" error={errors.fullName?.message} {...register("fullName")} />
          <Input label="Email *" type="email" placeholder="jane@school.edu" error={errors.email?.message} {...register("email")} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Class *</label>
            <select
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              {...register("classId")}
            >
              <option value="">Select a class</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            {errors.classId && <p className="text-xs text-meta-1">{errors.classId.message}</p>}
          </div>
        </div>
      </div>

      <div>
        <SectionLabel optional>Student Profile</SectionLabel>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Registration No." placeholder="STU-001" {...register("registrationNumber")} />
            <Input label="Admission Date" type="date" {...register("dateOfAdmission")} />
            <Input label="Date of Birth" type="date" {...register("dateOfBirth")} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField label="Gender" name="gender" register={register} options={["male", "female", "other"]} />
            <SelectField label="Blood Group" name="bloodGroup" register={register} options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Phone" placeholder="+234 801 234 5678" {...register("mobileNumber")} />
            <Input label="Religion" placeholder="Christianity" {...register("religion")} />
          </div>
          <Input label="Address" placeholder="123 Main St, Lagos" {...register("address")} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Previous School" placeholder="St. Mary's Academy" {...register("previousSchool")} />
            <Input label="Family Type" placeholder="Nuclear / Extended" {...register("familyType")} />
          </div>
          <Input label="Medical Info" placeholder="Any allergies or conditions" {...register("medicalInfo")} />
        </div>
      </div>

      <div>
        <SectionLabel optional>Guardian Info</SectionLabel>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Guardian Name" placeholder="John Doe" {...register("guardianName")} />
            <Input label="Guardian Phone" placeholder="+234 801 234 5678" {...register("guardianPhone")} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Guardian Email" type="email" placeholder="john@example.com" error={errors.guardianEmail?.message} {...register("guardianEmail")} />
            <Input label="Relationship" placeholder="Father" {...register("guardianRelationship")} />
          </div>
          <Input label="Guardian Occupation" placeholder="Engineer" {...register("guardianOccupation")} />
        </div>
      </div>
    </>
  );
}

// ─── Reusable sub-components ──────────────────────────────────────────────────

// ─── Lifecycle status badge ───────────────────────────────────────────────────

type LifecycleStatusValue = "active" | "graduated" | "transferred" | "withdrawn" | undefined;

function LifecycleStatusBadge({ status }: { status: LifecycleStatusValue }) {
  if (!status || status === "active") {
    return <Badge variant="success">Active</Badge>;
  }
  if (status === "graduated") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        Graduated
      </span>
    );
  }
  if (status === "transferred") {
    return <Badge variant="warning">Transferred</Badge>;
  }
  return <Badge variant="danger">Withdrawn</Badge>;
}

function PasswordReveal({
  label, note, password, copied, onCopy, onDone,
}: {
  label: string; note: string; password: string;
  copied: boolean; onCopy: () => void; onDone: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-md bg-meta-3/10 px-3 py-2 text-sm text-meta-3">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-black dark:text-white">Password</p>
        <p className="mb-2 text-xs text-body">{note}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded border border-stroke bg-whiter px-3 py-2 font-mono text-sm font-bold tracking-widest text-black dark:border-strokedark dark:bg-meta-4 dark:text-white">
            {password}
          </code>
          <Button size="sm" variant="secondary" onClick={onCopy}>
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-meta-3" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const capped = Math.min(score, 4);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-meta-1", "bg-yellow-400", "bg-primary", "bg-meta-3"];
  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${capped >= i ? colors[capped] : "bg-stroke dark:bg-strokedark"}`} />
        ))}
      </div>
      <p className="text-xs text-body">{labels[capped]}</p>
    </div>
  );
}

function ActionBtn({ children, title, onClick, danger }: {
  children: React.ReactNode; title: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded p-1.5 text-body transition-colors ${danger ? "hover:bg-meta-1/10 hover:text-meta-1" : "hover:bg-meta-2 hover:text-primary dark:hover:bg-meta-4"}`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">
      {children} {optional && <span className="font-normal normal-case">(optional)</span>}
    </p>
  );
}

function SelectField({ label, name, register, options }: {
  label: string; name: string; register: (name: string) => object; options: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-black dark:text-white">{label}</label>
      <select
        className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
        {...register(name)}
      >
        <option value="">Select</option>
        {options.map((o) => <option key={o} value={o} className="capitalize">{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{msg}</p>;
}

function apiMsg(e: unknown, fallback: string) {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function buildStudentProfile(v: CreateForm | EditForm) {
  const p: Record<string, unknown> = {};
  if (v.registrationNumber) p.registrationNumber = v.registrationNumber;
  if (v.dateOfAdmission) p.dateOfAdmission = v.dateOfAdmission;
  if (v.dateOfBirth) p.dateOfBirth = v.dateOfBirth;
  if (v.gender) p.gender = v.gender;
  if (v.mobileNumber) p.mobileNumber = v.mobileNumber;
  if (v.address) p.address = v.address;
  if (v.bloodGroup) p.bloodGroup = v.bloodGroup;
  if (v.religion) p.religion = v.religion;
  if (v.previousSchool) p.previousSchool = v.previousSchool;
  if (v.familyType) p.familyType = v.familyType;
  if (v.medicalInfo) p.medicalInfo = v.medicalInfo;
  return p;
}

function buildGuardian(v: CreateForm | EditForm) {
  if (!v.guardianName && !v.guardianPhone) return undefined;
  return {
    guardianName: v.guardianName || undefined,
    guardianPhone: v.guardianPhone || undefined,
    guardianEmail: v.guardianEmail || undefined,
    guardianRelationship: v.guardianRelationship || undefined,
    guardianOccupation: v.guardianOccupation || undefined,
  };
}
