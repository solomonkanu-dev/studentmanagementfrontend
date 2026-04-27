"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminApi } from "@/lib/api/admin";
import { generatePassword } from "@/lib/utils/password";
import { classApi } from "@/lib/api/class";
import { exportApi } from "@/lib/api/export";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { errMsg } from "@/lib/utils/errMsg";
import {
  Plus, Search, GraduationCap, Copy, CheckCircle2,
  Pencil, KeyRound, Eye, EyeOff, RefreshCw,
  ShieldOff, PlayCircle, Trash2, ShieldAlert, Download, Activity, Archive,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import type { AuthUser, Class } from "@/lib/types";
import type { UseFormRegister, FieldErrors, Path } from "react-hook-form";
import {
  studentSchema, type StudentForm,
  buildStudentProfile, buildGuardian, nextRegistrationNumber,
} from "./_schemas";

const PAGE_SIZE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentsListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal open state — each stores the target student (or boolean for create)
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<AuthUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AuthUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AuthUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [lifecycleTarget, setLifecycleTarget] = useState<AuthUser | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AuthUser | null>(null);

  const { data: students = [], isLoading, isError } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classApi.getAll,
  });

  const invalidateStudents = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-students"] });

  const filtered = (students as AuthUser[]).filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const studentClassId =
      typeof s.class === "string"
        ? s.class
        : (s.class as { _id: string } | undefined)?._id ?? "";
    const matchesClass = !classFilter || studentClassId === classFilter;
    return matchesSearch && matchesClass;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleClassFilterChange(value: string) {
    setClassFilter(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search students"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 w-full rounded border border-stroke bg-transparent pl-9 pr-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            />
          </div>
          <select
            aria-label="Filter by class"
            value={classFilter}
            onChange={(e) => handleClassFilterChange(e.target.value)}
            className="h-9 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          >
            <option value="">All Classes</option>
            {(classes as Class[]).map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => exportApi.students()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Student
          </Button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" role="status" />
          </div>
        ) : isError ? (
          <p className="py-12 text-center text-sm text-meta-1">
            Failed to load students. Please refresh the page.
          </p>
        ) : paginated.length === 0 ? (
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
              {paginated.map((s: AuthUser) => {
                const className = (classes as Class[]).find(
                  (c) =>
                    c._id ===
                    (typeof s.class === "string"
                      ? s.class
                      : (s.class as { _id: string } | undefined)?._id)
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
                        {!s.isActive && <Badge variant="danger">Suspended</Badge>}
                      </div>
                    </Td>
                    <Td>
                      <LifecycleStatusBadge status={s.lifecycleStatus} />
                    </Td>
                    <Td className="text-xs text-body">
                      {new Date(s.createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/students/${s._id}`}>
                          <ActionBtn title="View student" onClick={() => {}}>
                            <Eye className="h-3.5 w-3.5" />
                          </ActionBtn>
                        </Link>
                        <ActionBtn title="Edit student" onClick={() => setEditTarget(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn title="Update lifecycle status" onClick={() => setLifecycleTarget(s)}>
                          <Activity className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn title="Reset password" onClick={() => setResetTarget(s)} danger>
                          <KeyRound className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          title={s.isActive ? "Suspend account" : "Unsuspend account"}
                          onClick={() => setSuspendTarget(s)}
                          danger={s.isActive}
                        >
                          {s.isActive
                            ? <ShieldOff className="h-3.5 w-3.5" />
                            : <PlayCircle className="h-3.5 w-3.5 text-meta-3" />
                          }
                        </ActionBtn>
                        <ActionBtn title="Delete account" onClick={() => setDeleteTarget(s)} danger>
                          <Trash2 className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          title="Archive student"
                          onClick={() => setArchiveTarget(s)}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </ActionBtn>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        )}
        {filtered.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-stroke px-4 py-3 dark:border-strokedark">
            <p className="text-xs text-body">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} students
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded p-1.5 text-body transition-colors hover:bg-meta-2 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-meta-4"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs text-black dark:text-white">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded p-1.5 text-body transition-colors hover:bg-meta-2 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-meta-4"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <CreateStudentModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        students={students as AuthUser[]}
        classes={classes as Class[]}
        onSuccess={() => {
          invalidateStudents();
          queryClient.invalidateQueries({ queryKey: ["classes"] });
        }}
      />
      <EditStudentModal
        target={editTarget}
        onClose={() => setEditTarget(null)}
        classes={classes as Class[]}
        onSuccess={invalidateStudents}
      />
      <ResetPasswordModal
        target={resetTarget}
        onClose={() => setResetTarget(null)}
      />
      <SuspendModal
        target={suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onSuccess={invalidateStudents}
      />
      <DeleteModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={invalidateStudents}
      />
      <ArchiveModal
        target={archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onSuccess={invalidateStudents}
      />
      <LifecycleModal
        target={lifecycleTarget}
        onClose={() => setLifecycleTarget(null)}
        onSuccess={invalidateStudents}
      />
    </div>
  );
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateStudentModal({
  open,
  onClose,
  students,
  classes,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  students: AuthUser[];
  classes: Class[];
  onSuccess: () => void;
}) {
  const [tempPassword, setTempPassword] = useState("");
  const [pwCopied, setPwCopied] = useState(false);
  const [createError, setCreateError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StudentForm>({ resolver: zodResolver(studentSchema) });

  const mutation = useMutation({
    mutationFn: adminApi.createStudent,
    onSuccess: (data) => {
      onSuccess();
      reset();
      const d = data as unknown as Record<string, unknown>;
      if (d.tempPassword) setTempPassword(d.tempPassword as string);
      else handleClose();
    },
    onError: (e: unknown) => setCreateError(errMsg(e, "Failed to create student")),
  });

  // Pre-fill registration number when modal opens
  useEffect(() => {
    if (open) {
      setValue("registrationNumber", nextRegistrationNumber(students));
      setTempPassword("");
      setCreateError("");
      setPwCopied(false);
    }
  }, [open, students, setValue]);

  function handleClose() {
    onClose();
    reset();
    setTempPassword("");
    setCreateError("");
    setPwCopied(false);
  }

  function onSubmit(v: StudentForm) {
    setCreateError("");
    setTempPassword("");
    const studentProfile = buildStudentProfile(v);
    const guardian = buildGuardian(v);
    if (guardian) studentProfile.guardian = guardian;
    mutation.mutate({
      fullName: v.fullName,
      email: v.email,
      classId: v.classId,
      ...(Object.keys(studentProfile).length > 0 ? { studentProfile } : {}),
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Student">
      {tempPassword ? (
        <PasswordReveal
          label="Student created successfully!"
          note="Share this with the student. They should change it on first login."
          password={tempPassword}
          copied={pwCopied}
          onCopy={() => {
            navigator.clipboard.writeText(tempPassword);
            setPwCopied(true);
            setTimeout(() => setPwCopied(false), 2000);
          }}
          onDone={handleClose}
        />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <StudentFormFields register={register} errors={errors} classes={classes} />
          {createError && <ErrorMsg msg={createError} />}
          <p className="text-xs text-body">
            A temporary password will be auto-generated for first login.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              Create Student
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditStudentModal({
  target,
  onClose,
  classes,
  onSuccess,
}: {
  target: AuthUser | null;
  onClose: () => void;
  classes: Class[];
  onSuccess: () => void;
}) {
  const [editError, setEditError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentForm>({ resolver: zodResolver(studentSchema) });

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateStudent(id, payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (e: unknown) => setEditError(errMsg(e, "Failed to update student")),
  });

  // Populate form when target changes
  useEffect(() => {
    if (!target) { reset(); setEditError(""); return; }
    setEditError("");
    const p = target.studentProfile ?? {};
    const g = (p as Record<string, unknown>).guardian as Record<string, string> | undefined;
    reset({
      fullName: target.fullName,
      email: target.email,
      classId:
        typeof target.class === "string"
          ? target.class
          : (target.class as { _id: string } | undefined)?._id ?? "",
      registrationNumber: (p as Record<string, string>).registrationNumber ?? "",
      dateOfAdmission: (p as Record<string, string>).dateOfAdmission
        ? (p as Record<string, string>).dateOfAdmission.slice(0, 10)
        : "",
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
  }, [target, reset]);

  function onSubmit(v: StudentForm) {
    if (!target) return;
    setEditError("");
    const studentProfile = buildStudentProfile(v);
    const guardian = buildGuardian(v);
    if (guardian) studentProfile.guardian = guardian;
    mutation.mutate({
      id: target._id,
      payload: {
        fullName: v.fullName,
        email: v.email,
        classId: v.classId,
        ...(Object.keys(studentProfile).length > 0 ? { studentProfile } : {}),
      },
    });
  }

  return (
    <Modal open={target !== null} onClose={onClose} title="Edit Student">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <StudentFormFields register={register} errors={errors} classes={classes} />
        {editError && <ErrorMsg msg={editError} />}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Reset password modal ─────────────────────────────────────────────────────

function ResetPasswordModal({
  target,
  onClose,
}: {
  target: AuthUser | null;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [resetCopied, setResetCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      adminApi.resetPassword(userId, { password }),
    onSuccess: () => setResetDone(true),
    onError: (e: unknown) => setResetError(errMsg(e, "Failed to reset password")),
  });

  // Reset state when a new target is selected
  useEffect(() => {
    if (target) {
      setNewPassword(generatePassword());
      setResetError("");
      setResetDone(false);
      setResetCopied(false);
      setShowPwd(false);
    }
  }, [target]);

  function handleClose() {
    onClose();
    setNewPassword("");
    setResetError("");
    setResetDone(false);
    setResetCopied(false);
  }

  function copyPassword() {
    navigator.clipboard.writeText(newPassword);
    setResetCopied(true);
    setTimeout(() => setResetCopied(false), 2000);
  }

  return (
    <Modal open={target !== null} onClose={handleClose} title="Reset Password">
      {resetDone ? (
        <PasswordReveal
          label={`Password reset for ${target?.fullName}`}
          note="Share this new password with the student so they can log in."
          password={newPassword}
          copied={resetCopied}
          onCopy={copyPassword}
          onDone={handleClose}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-body">
            Set a new password for{" "}
            <span className="font-semibold text-black dark:text-white">{target?.fullName}</span>.
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
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              isLoading={mutation.isPending}
              onClick={() =>
                target && mutation.mutate({ userId: target._id, password: newPassword })
              }
              disabled={newPassword.length < 6}
            >
              Reset Password
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Suspend / Unsuspend modal ────────────────────────────────────────────────

function SuspendModal({
  target,
  onClose,
  onSuccess,
}: {
  target: AuthUser | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [suspendError, setSuspendError] = useState("");

  const mutation = useMutation({
    mutationFn: (userId: string) =>
      target?.isActive ? adminApi.suspendUser(userId) : adminApi.unsuspendUser(userId),
    onSuccess: () => { onSuccess(); onClose(); setSuspendError(""); },
    onError: (e: unknown) => setSuspendError(errMsg(e, "Failed to update account status")),
  });

  function handleClose() { onClose(); setSuspendError(""); }

  return (
    <Modal
      open={target !== null}
      onClose={handleClose}
      title={target?.isActive ? "Suspend Account" : "Unsuspend Account"}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              target?.isActive ? "bg-meta-1/10" : "bg-meta-3/10"
            }`}
          >
            {target?.isActive
              ? <ShieldAlert className="h-5 w-5 text-meta-1" />
              : <PlayCircle className="h-5 w-5 text-meta-3" />
            }
          </div>
          <p className="text-sm text-body">
            {target?.isActive ? (
              <>
                Suspending{" "}
                <span className="font-semibold text-black dark:text-white">{target.fullName}</span>{" "}
                will prevent them from logging in. You can unsuspend at any time.
              </>
            ) : (
              <>
                Unsuspending{" "}
                <span className="font-semibold text-black dark:text-white">{target?.fullName}</span>{" "}
                will restore their access to the platform.
              </>
            )}
          </p>
        </div>
        {suspendError && <ErrorMsg msg={suspendError} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            variant={target?.isActive ? "danger" : undefined}
            isLoading={mutation.isPending}
            onClick={() => target && mutation.mutate(target._id)}
          >
            {target?.isActive ? "Suspend" : "Unsuspend"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteModal({
  target,
  onClose,
  onSuccess,
}: {
  target: AuthUser | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [deleteError, setDeleteError] = useState("");

  const mutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => { onSuccess(); onClose(); setDeleteError(""); },
    onError: (e: unknown) => setDeleteError(errMsg(e, "Failed to delete student")),
  });

  function handleClose() { onClose(); setDeleteError(""); }

  return (
    <Modal open={target !== null} onClose={handleClose} title="Delete Student">
      <div className="space-y-4">
        <p className="text-sm text-body">
          Permanently delete{" "}
          <span className="font-semibold text-black dark:text-white">{target?.fullName}</span>? This
          cannot be undone and will remove all their data.
        </p>
        {deleteError && <ErrorMsg msg={deleteError} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            variant="danger"
            isLoading={mutation.isPending}
            onClick={() => target && mutation.mutate(target._id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Archive modal ────────────────────────────────────────────────────────────

function ArchiveModal({
  target,
  onClose,
  onSuccess,
}: {
  target: AuthUser | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [archiveNote, setArchiveNote] = useState("");
  const [archiveError, setArchiveError] = useState("");

  const mutation = useMutation({
    mutationFn: ({ userId, note }: { userId: string; note: string }) =>
      adminApi.archiveUser(userId, note),
    onSuccess: () => { onSuccess(); onClose(); setArchiveNote(""); setArchiveError(""); },
    onError: (e: unknown) => setArchiveError(errMsg(e, "Failed to archive student")),
  });

  function handleClose() { onClose(); setArchiveNote(""); setArchiveError(""); }

  return (
    <Modal open={target !== null} onClose={handleClose} title="Archive Student">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-900/20">
            <Archive className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <p className="text-sm text-body">
            Archiving{" "}
            <span className="font-semibold text-black dark:text-white">{target?.fullName}</span>{" "}
            will remove them from active lists. Their fees, results, and records are preserved
            and can be viewed in the Archive section. You can restore them at any time.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">
            Note <span className="font-normal text-body">(optional)</span>
          </label>
          <textarea
            value={archiveNote}
            onChange={(e) => setArchiveNote(e.target.value)}
            placeholder="e.g. Graduated June 2025, transferred to another school…"
            rows={2}
            className="w-full resize-none rounded-md border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
          />
        </div>
        {archiveError && <ErrorMsg msg={archiveError} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            isLoading={mutation.isPending}
            onClick={() => target && mutation.mutate({ userId: target._id, note: archiveNote })}
          >
            Archive Student
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Lifecycle modal ──────────────────────────────────────────────────────────

function LifecycleModal({
  target,
  onClose,
  onSuccess,
}: {
  target: AuthUser | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [lifecycleStatus, setLifecycleStatus] = useState("active");
  const [lifecycleNote, setLifecycleNote] = useState("");
  const [lifecycleError, setLifecycleError] = useState("");

  const mutation = useMutation({
    mutationFn: ({
      studentId,
      payload,
    }: {
      studentId: string;
      payload: { lifecycleStatus: string; lifecycleNote?: string };
    }) => adminApi.updateStudentLifecycle(studentId, payload),
    onSuccess: () => { onSuccess(); onClose(); setLifecycleError(""); },
    onError: (e: unknown) => setLifecycleError(errMsg(e, "Failed to update lifecycle status")),
  });

  // Sync form to the selected student
  useEffect(() => {
    if (target) {
      setLifecycleStatus(target.lifecycleStatus ?? "active");
      setLifecycleNote(target.lifecycleNote ?? "");
      setLifecycleError("");
    }
  }, [target]);

  function handleClose() { onClose(); setLifecycleError(""); }

  return (
    <Modal open={target !== null} onClose={handleClose} title="Update Lifecycle Status">
      <div className="space-y-4">
        <p className="text-sm text-body">
          Update the lifecycle status for{" "}
          <span className="font-semibold text-black dark:text-white">{target?.fullName}</span>.
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
            className="w-full resize-none rounded-md border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
          />
        </div>
        {lifecycleError && <ErrorMsg msg={lifecycleError} />}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            isLoading={mutation.isPending}
            onClick={() =>
              target &&
              mutation.mutate({
                studentId: target._id,
                payload: { lifecycleStatus, lifecycleNote: lifecycleNote || undefined },
              })
            }
          >
            Save Status
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Shared form fields ───────────────────────────────────────────────────────

function StudentFormFields({
  register,
  errors,
  classes,
}: {
  register: UseFormRegister<StudentForm>;
  errors: FieldErrors<StudentForm>;
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
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
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
            <Input label="Phone" placeholder="+232 76 123 456" {...register("mobileNumber")} />
            <Input label="Religion" placeholder="Christianity" {...register("religion")} />
          </div>
          <Input label="Address" placeholder="123 Main St, Freetown" {...register("address")} />
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
            <Input label="Guardian Phone" placeholder="+232 76 123 456" {...register("guardianPhone")} />
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

// ─── Reusable UI sub-components ───────────────────────────────────────────────

type LifecycleStatusValue = "active" | "graduated" | "transferred" | "withdrawn" | undefined;

function LifecycleStatusBadge({ status }: { status: LifecycleStatusValue }) {
  if (!status || status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "graduated") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        Graduated
      </span>
    );
  }
  if (status === "transferred") return <Badge variant="warning">Transferred</Badge>;
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
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              capped >= i ? colors[capped] : "bg-stroke dark:bg-strokedark"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-body">{labels[capped]}</p>
    </div>
  );
}

function ActionBtn({
  children, title, onClick, danger,
}: {
  children: React.ReactNode; title: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded p-1.5 text-body transition-colors ${
        danger
          ? "hover:bg-meta-1/10 hover:text-meta-1"
          : "hover:bg-meta-2 hover:text-primary dark:hover:bg-meta-4"
      }`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">
      {children}{" "}
      {optional && <span className="font-normal normal-case">(optional)</span>}
    </p>
  );
}

function SelectField({
  label, name, register, options,
}: {
  label: string;
  name: Path<StudentForm>;
  register: UseFormRegister<StudentForm>;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-black dark:text-white">{label}</label>
      <select
        className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
        {...register(name)}
      >
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o} value={o} className="capitalize">
            {o.charAt(0).toUpperCase() + o.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{msg}</p>;
}
