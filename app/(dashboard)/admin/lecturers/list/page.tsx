"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adminApi } from "@/lib/api/admin";
import { classApi } from "@/lib/api/class";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  Copy,
  CheckCircle2,
  Pencil,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldOff,
  PlayCircle,
  Trash2,
  ShieldAlert,
  Download,
} from "lucide-react";
import { exportApi } from "@/lib/api/export";
import type { AuthUser, Class } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePassword(): string {
  const chars =
    "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => chars[b % chars.length])
    .join("");
}

function passwordStrength(p: string): { level: number; label: string } {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[@#$!%^&*]/.test(p)) score++;
  if (score <= 1) return { level: 1, label: "Weak" };
  if (score === 2) return { level: 2, label: "Fair" };
  if (score === 3) return { level: 3, label: "Good" };
  return { level: 4, label: "Strong" };
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const schema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email"),
  employeeId: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  position: z.string().optional(),
  dateOfJoining: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  bloodGroup: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({
  children,
  note,
}: {
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">
      {children}
      {note && <span className="ml-1 font-normal">{note}</span>}
    </p>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">
      {msg}
    </p>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        variant === "danger"
          ? "text-meta-1 hover:bg-meta-1/10"
          : "text-body hover:bg-meta-2 hover:text-primary dark:hover:bg-meta-4"
      }`}
    >
      {icon}
    </button>
  );
}

function PasswordReveal({
  password,
  label,
  onDone,
}: {
  password: string;
  label: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-meta-3/30 bg-meta-3/10 p-4">
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-meta-3" aria-hidden="true" />
          <p className="text-sm font-semibold text-meta-3">{label}</p>
        </div>
        <p className="mb-3 text-xs text-body">
          Share this temporary password with the teacher. They should change it
          on first login.
        </p>
        <div className="flex items-center gap-2 rounded border border-stroke bg-white px-3 py-2 dark:border-strokedark dark:bg-boxdark">
          <code className="flex-1 font-mono text-sm font-bold tracking-widest text-black dark:text-white">
            {password}
          </code>
          <Button size="sm" variant="secondary" onClick={copy}>
            {copied ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-meta-3" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const { level, label } = passwordStrength(password);
  const colors = ["", "bg-meta-1", "bg-yellow-400", "bg-yellow-300", "bg-meta-3"];
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= level ? colors[level] : "bg-stroke dark:bg-strokedark"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-body">{label}</p>
    </div>
  );
}

// ─── Lecturer form fields ─────────────────────────────────────────────────────

function LecturerFormFields({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<FormValues>>["register"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
}) {
  return (
    <>
      {/* Basic info */}
      <div>
        <SectionLabel>Basic Info</SectionLabel>
        <div className="space-y-3">
          <Input
            label="Full Name *"
            placeholder="Dr. Jane Doe"
            error={errors.fullName?.message}
            {...register("fullName")}
          />
          <Input
            label="Email *"
            type="email"
            placeholder="teacher@school.edu"
            error={errors.email?.message}
            {...register("email")}
          />
        </div>
      </div>

      {/* Professional details */}
      <div>
        <SectionLabel>Professional Details</SectionLabel>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Department *"
              placeholder="Computer Science"
              error={errors.department?.message}
              {...register("department")}
            />
            <Input
              label="Position"
              placeholder="Senior Teacher"
              {...register("position")}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Employee ID"
              placeholder="EMP-001"
              {...register("employeeId")}
            />
            <Input
              label="Date of Joining"
              type="date"
              {...register("dateOfJoining")}
            />
          </div>
        </div>
      </div>

      {/* Personal details */}
      <div>
        <SectionLabel note="(optional)">Personal Details</SectionLabel>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Date of Birth"
              type="date"
              {...register("dateOfBirth")}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-black dark:text-white">
                Gender
              </label>
              <select
                className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                {...register("gender")}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-black dark:text-white">
                Marital Status
              </label>
              <select
                className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                {...register("maritalStatus")}
              >
                <option value="">Select</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-black dark:text-white">
                Blood Group
              </label>
              <select
                className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                {...register("bloodGroup")}
              >
                <option value="">Select</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label="Phone"
            placeholder="+232 76 123 456"
            {...register("phoneNumber")}
          />
          <Input
            label="Address"
            placeholder="123 University Rd, Freetown"
            {...register("address")}
          />
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LecturersListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createTempPassword, setCreateTempPassword] = useState("");

  // Edit modal state
  const [editTarget, setEditTarget] = useState<AuthUser | null>(null);
  const [editError, setEditError] = useState("");

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState<AuthUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  // Suspend / delete
  const [suspendTarget, setSuspendTarget] = useState<AuthUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [suspendError, setSuspendError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // ── Queries ──
  const { data: lecturers = [], isLoading } = useQuery({
    queryKey: ["admin-lecturers"],
    queryFn: adminApi.getLecturers,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classApi.getAll,
  });

  // ── Create form ──
  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    setValue: setCreateValue,
    formState: { errors: createErrors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function nextEmployeeId(list: AuthUser[]) {
    const nums = list.flatMap((l) => {
      const id = l.lecturerProfile?.employeeId ?? "";
      const m = id.match(/(\d+)$/);
      return m ? [parseInt(m[1], 10)] : [];
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `EMP-${String(max + 1).padStart(3, "0")}`;
  }

  function openCreate() {
    setShowCreate(true);
    setCreateValue("employeeId", nextEmployeeId(lecturers));
  }

  // ── Edit form ──
  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: adminApi.createLecturer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-lecturers"] });
      resetCreate();
      if ((data as unknown as Record<string, unknown>)?.tempPassword) {
        setCreateTempPassword((data as unknown as Record<string, unknown>).tempPassword as string);
      } else {
        setShowCreate(false);
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create lecturer";
      setCreateError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateLecturer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lecturers"] });
      closeEdit();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update lecturer";
      setEditError(msg);
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      adminApi.resetPassword(id, { password }),
    onSuccess: () => {
      setResetSuccess(true);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to reset password";
      setResetError(msg);
    },
  });

  const invalidateLecturers = () => queryClient.invalidateQueries({ queryKey: ["admin-lecturers"] });

  const suspendMutation = useMutation({
    mutationFn: (userId: string) =>
      (lecturers as AuthUser[]).find((l) => l._id === userId)?.isActive
        ? adminApi.suspendUser(userId)
        : adminApi.unsuspendUser(userId),
    onSuccess: () => { invalidateLecturers(); setSuspendTarget(null); setSuspendError(""); },
    onError: (err: unknown) => setSuspendError(
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update account status"
    ),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => { invalidateLecturers(); setDeleteTarget(null); setDeleteError(""); },
    onError: (err: unknown) => setDeleteError(
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to delete lecturer"
    ),
  });

  // ── Filtered list ──
  const filtered = lecturers.filter((l: AuthUser) => {
    const matchesSearch =
      l.fullName.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase());
    const lecturerClassId =
      typeof l.class === "string" ? l.class : (l.class as unknown as { _id: string } | null)?._id ?? "";
    const matchesClass = !classFilter || lecturerClassId === classFilter;
    return matchesSearch && matchesClass;
  });

  // ── Submit handlers ──
  function buildPayload(values: FormValues) {
    const {
      fullName, email,
      employeeId, department, position, dateOfJoining,
      dateOfBirth, gender, maritalStatus, bloodGroup,
      phoneNumber, address,
    } = values;

    const lecturerProfile: Record<string, unknown> = { department };
    if (employeeId) lecturerProfile.employeeId = employeeId;
    if (position) lecturerProfile.position = position;
    if (dateOfJoining) lecturerProfile.dateOfJoining = dateOfJoining;
    if (dateOfBirth) lecturerProfile.dateOfBirth = dateOfBirth;
    if (gender) lecturerProfile.gender = gender;
    if (maritalStatus) lecturerProfile.maritalStatus = maritalStatus;
    if (bloodGroup) lecturerProfile.bloodGroup = bloodGroup;
    if (phoneNumber) lecturerProfile.phoneNumber = phoneNumber;
    if (address) lecturerProfile.address = address;

    return { fullName, email, lecturerProfile };
  }

  const onCreateSubmit = (values: FormValues) => {
    setCreateError("");
    createMutation.mutate(buildPayload(values));
  };

  const onEditSubmit = (values: FormValues) => {
    if (!editTarget) return;
    setEditError("");
    updateMutation.mutate({ id: editTarget._id, payload: buildPayload(values) });
  };

  // ── Open / close helpers ──
  const closeCreate = () => {
    setShowCreate(false);
    resetCreate();
    setCreateError("");
    setCreateTempPassword("");
  };

  const openEdit = (l: AuthUser) => {
    const lp = l.lecturerProfile ?? {};
    resetEdit({
      fullName: l.fullName,
      email: l.email,
      department: lp.department ?? "",
      position: lp.position ?? "",
      employeeId: lp.employeeId ?? "",
      dateOfJoining: lp.dateOfJoining ? String(lp.dateOfJoining).slice(0, 10) : "",
      dateOfBirth: lp.dateOfBirth ? String(lp.dateOfBirth).slice(0, 10) : "",
      gender: lp.gender ?? "",
      maritalStatus: lp.maritalStatus ?? "",
      bloodGroup: lp.bloodGroup ?? "",
      phoneNumber: lp.phoneNumber ?? "",
      address: lp.address ?? "",
    });
    setEditTarget(l);
    setEditError("");
  };

  const closeEdit = () => {
    setEditTarget(null);
    resetEdit();
    setEditError("");
  };

  const openReset = (l: AuthUser) => {
    setResetTarget(l);
    setResetPassword(generatePassword());
    setShowResetPw(false);
    setResetError("");
    setResetSuccess(false);
  };

  const closeReset = () => {
    setResetTarget(null);
    setResetPassword("");
    setShowResetPw(false);
    setResetError("");
    setResetSuccess(false);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Search + Filter + Add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label="Search lecturers"
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
          <Button variant="ghost" onClick={() => exportApi.lecturers()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Teacher
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary"
              role="status"
              aria-label="Loading teachers"
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <Users className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm text-body">
              {search || classFilter ? "No teachers match your filters." : "No teachers found."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Department</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th>Actions</Th>
              </tr>
            </TableHead>
            <TableBody>
              {filtered.map((l: AuthUser) => (
                <tr
                  key={l._id}
                  className="hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                        {l.fullName.charAt(0)}
                      </div>
                      <span className="font-medium text-black dark:text-white">
                        {l.fullName}
                      </span>
                    </div>
                  </Td>
                  <Td className="text-body">{l.email}</Td>
                  <Td className="text-body">
                    {l.lecturerProfile?.department ?? "—"}
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-0.5">
                      <Badge variant={l.isActive ? "success" : "danger"}>
                        {l.isActive ? "Active" : "Suspended"}
                      </Badge>
                      {!l.approved && (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </div>
                  </Td>
                  <Td className="text-xs text-body">
                    {new Date(l.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/lecturers/${l._id}`}>
                        <ActionBtn
                          icon={<Eye className="h-3.5 w-3.5" />}
                          label="View teacher"
                          onClick={() => {}}
                        />
                      </Link>
                      <ActionBtn
                        icon={<Pencil className="h-3.5 w-3.5" />}
                        label="Edit teacher"
                        onClick={() => openEdit(l)}
                      />
                      <ActionBtn
                        icon={<KeyRound className="h-3.5 w-3.5" />}
                        label="Reset password"
                        onClick={() => openReset(l)}
                      />
                      <ActionBtn
                        icon={l.isActive
                          ? <ShieldOff className="h-3.5 w-3.5" />
                          : <PlayCircle className="h-3.5 w-3.5 text-meta-3" />
                        }
                        label={l.isActive ? "Suspend account" : "Unsuspend account"}
                        onClick={() => { setSuspendTarget(l); setSuspendError(""); }}
                        variant={l.isActive ? "danger" : "default"}
                      />
                      <ActionBtn
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        label="Delete account"
                        onClick={() => { setDeleteTarget(l); setDeleteError(""); }}
                        variant="danger"
                      />
                    </div>
                  </Td>
                </tr>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── Create Modal ── */}
      <Modal open={showCreate} onClose={closeCreate} title="Add Teacher">
        <form onSubmit={handleCreate(onCreateSubmit)} className="space-y-5">
          <LecturerFormFields register={regCreate} errors={createErrors} />

          {createTempPassword ? (
            <PasswordReveal
              password={createTempPassword}
              label="Lecturer created successfully"
              onDone={closeCreate}
            />
          ) : (
            <>
              <p className="text-xs text-body">
                A temporary password will be auto-generated for the lecturer&apos;s
                first login.
              </p>
              {createError && <ErrorMsg msg={createError} />}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={closeCreate}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createMutation.isPending}>
                  Create Lecturer
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        open={!!editTarget}
        onClose={closeEdit}
        title={`Edit — ${editTarget?.fullName ?? ""}`}
      >
        <form onSubmit={handleEdit(onEditSubmit)} className="space-y-5">
          <LecturerFormFields register={regEdit} errors={editErrors} />

          {editError && <ErrorMsg msg={editError} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal
        open={!!resetTarget}
        onClose={closeReset}
        title={`Reset Password — ${resetTarget?.fullName ?? ""}`}
      >
        {resetSuccess ? (
          <PasswordReveal
            password={resetPassword}
            label="Password reset successfully"
            onDone={closeReset}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-body">
              Generate or type a new password for this lecturer. Share it with
              them securely.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-black dark:text-white">
                New Password
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showResetPw ? "text" : "password"}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="h-9 w-full rounded border border-stroke bg-transparent pl-3 pr-9 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-body"
                    aria-label={showResetPw ? "Hide password" : "Show password"}
                  >
                    {showResetPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setResetPassword(generatePassword())}
                  aria-label="Generate new password"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <PasswordStrengthBar password={resetPassword} />
            </div>

            {resetError && <ErrorMsg msg={resetError} />}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={closeReset}>
                Cancel
              </Button>
              <Button
                type="button"
                isLoading={resetMutation.isPending}
                onClick={() => {
                  if (!resetTarget || !resetPassword) return;
                  setResetError("");
                  resetMutation.mutate({
                    id: resetTarget._id,
                    password: resetPassword,
                  });
                }}
              >
                Reset Password
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Suspend / Unsuspend Modal ── */}
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

      {/* ── Delete Modal ── */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => { setDeleteTarget(null); setDeleteError(""); }}
        title="Delete Lecturer"
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
    </div>
  );
}
