"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { classApi } from "@/lib/api/class";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/utils/errMsg";
import {
  GraduationCap,
  Building2,
  Users,
  School,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import type { SchoolType } from "@/lib/types";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const instituteSchema = z.object({
  name:        z.string().min(2, "School name is required"),
  address:     z.string().min(5, "Address is required"),
  phoneNumber: z.string().min(5, "Phone number is required"),
  targetLine:  z.string().min(3, "Tagline / motto is required"),
  email:       z.string().email("Must be a valid email").or(z.literal("")).optional(),
  website:     z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  country:     z.string().optional(),
});
type InstituteForm = z.infer<typeof instituteSchema>;

const lecturerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email:    z.string().email("Valid email is required"),
  password: z.string().min(6, "Min 6 characters"),
});
type LecturerForm = z.infer<typeof lecturerSchema>;

const classSchema = z.object({
  name:       z.string().min(1, "Name is required"),
  lecturerId: z.string().min(1, "Select a lecturer"),
});
type ClassForm = z.infer<typeof classSchema>;

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "School Type",      icon: Sparkles },
  { id: 2, title: "School Profile",   icon: Building2 },
  { id: 3, title: "First Teacher",    icon: Users },
  { id: 4, title: "First Class",      icon: School },
  { id: 5, title: "All Set!",         icon: CheckCircle },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-black dark:text-white">{label}</label>
      {hint && <p className="text-xs text-body">{hint}</p>}
      {children}
      {error && <p className="text-xs text-meta-1">{error}</p>}
    </div>
  );
}

function TextInput({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-black outline-none transition-colors focus:border-primary dark:bg-meta-4 dark:text-white ${
        error ? "border-meta-1" : "border-stroke dark:border-strokedark"
      }`}
    />
  );
}

function StepBar({ current, skipStep2 }: { current: number; skipStep2?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done    = current > s.id || (skipStep2 && s.id === 2 && current >= 3);
        const active  = current === s.id;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                  done
                    ? "border-primary bg-primary text-white"
                    : active
                    ? "border-primary bg-white text-primary shadow-md shadow-primary/20 dark:bg-boxdark"
                    : "border-stroke bg-white text-body dark:border-strokedark dark:bg-boxdark"
                }`}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : s.id}
              </div>
              <span className={`hidden text-[10px] font-medium sm:block ${active ? "text-primary" : "text-body"}`}>
                {s.title}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mb-4 h-0.5 w-8 sm:w-16 transition-colors ${done ? "bg-primary" : "bg-stroke dark:bg-strokedark"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 — School Type ─────────────────────────────────────────────────────

function StepSchoolType({
  selected,
  onSelect,
  onNext,
  skipProfile,
}: {
  selected: SchoolType | null;
  onSelect: (t: SchoolType) => void;
  onNext: () => void;
  skipProfile?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-black dark:text-white">What type of school is this?</h2>
        <p className="mt-2 text-sm text-body">
          {skipProfile
            ? "Your school profile is already set up. Just confirm the school type to continue."
            : "This determines the terminology used throughout the system."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {([
          {
            type: "primary" as SchoolType,
            emoji: "🏫",
            title: "Primary School",
            sub: "Uses Class 1, Class 2 …",
            items: ["Class 1 – Class 6", "Pupil terminology", "Class teacher system"],
          },
          {
            type: "secondary" as SchoolType,
            emoji: "🎓",
            title: "Secondary School",
            sub: "Uses Form 1, Form 2 …",
            items: ["Form 1 – Form 6 / JSS / SSS", "Student terminology", "Subject teachers"],
          },
        ] as const).map(({ type, emoji, title, sub, items }) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={`flex flex-col items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
              selected === type
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-stroke bg-white hover:border-primary/40 dark:border-strokedark dark:bg-boxdark"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{emoji}</span>
              <div>
                <p className="font-bold text-black dark:text-white">{title}</p>
                <p className="text-xs text-body">{sub}</p>
              </div>
              {selected === type && (
                <CheckCircle className="ml-auto h-5 w-5 text-primary" />
              )}
            </div>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-body">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                  {item}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <strong>Selected:</strong> Throughout this system, "class" will be shown as{" "}
          <strong>"{selected === "primary" ? "Class" : "Form"}"</strong> everywhere.
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!selected}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Step 2 — Institute Profile ───────────────────────────────────────────────

function StepInstituteProfile({
  schoolType,
  onNext,
  onBack,
  setCreatedInstitute,
}: {
  schoolType: SchoolType;
  onNext: () => void;
  onBack: () => void;
  setCreatedInstitute: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { updateUser, user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InstituteForm>({
    resolver: zodResolver(instituteSchema) as Resolver<InstituteForm>,
  });

  const mutation = useMutation({
    mutationFn: (values: InstituteForm) =>
      adminApi.createInstitute({ ...values, schoolType }),
    onSuccess: (institute) => {
      setCreatedInstitute(institute._id);
      qc.invalidateQueries({ queryKey: ["admin-institute"] });
      // Update cached user so the new institute is reflected
      updateUser({
        institute: {
          _id: institute._id,
          name: institute.name,
          schoolType: institute.schoolType ?? schoolType,
          onboardingCompleted: false,
        },
      });
      onNext();
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-black dark:text-white">Set up your school profile</h2>
        <p className="mt-2 text-sm text-body">This information appears on documents and emails.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="School Name *" error={errors.name?.message}>
          <TextInput {...register("name")} placeholder="Freetown Model College" error={errors.name?.message} />
        </Field>
        <Field label="Phone Number *" error={errors.phoneNumber?.message}>
          <TextInput {...register("phoneNumber")} placeholder="+232 76 000 000" error={errors.phoneNumber?.message} />
        </Field>
        <Field label="Address *" error={errors.address?.message}>
          <TextInput {...register("address")} placeholder="12 Education Drive, Wilberforce, Freetown" error={errors.address?.message} />
        </Field>
        <Field label="Tagline / Motto *" hint="Appears on official documents" error={errors.targetLine?.message}>
          <TextInput {...register("targetLine")} placeholder="Excellence in Education" error={errors.targetLine?.message} />
        </Field>
        <Field label="School Email" error={errors.email?.message}>
          <TextInput {...register("email")} type="email" placeholder="info@school.edu.sl" error={errors.email?.message} />
        </Field>
        <Field label="Website" error={errors.website?.message}>
          <TextInput {...register("website")} placeholder="https://school.edu.sl" error={errors.website?.message} />
        </Field>
        <Field label="Country" error={errors.country?.message}>
          <TextInput {...register("country")} placeholder="Sierra Leone" error={errors.country?.message} />
        </Field>
      </div>

      {mutation.isError && (
        <p className="rounded-xl bg-meta-1/10 px-4 py-2.5 text-xs text-meta-1">
          {errMsg(mutation.error, "Failed to create school profile") }
        </p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-stroke px-5 py-3 text-sm font-medium text-body transition-colors hover:border-primary hover:text-primary dark:border-strokedark">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : <><span>Save & Continue</span> <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </form>
  );
}

// ─── Step 3 — Create Lecturer ─────────────────────────────────────────────────

function StepCreateLecturer({
  schoolType,
  onNext,
  onBack,
  setCreatedLecturerId,
}: {
  schoolType: SchoolType;
  onNext: () => void;
  onBack: () => void;
  setCreatedLecturerId: (id: string) => void;
}) {
  const qc = useQueryClient();
  const classLabel = schoolType === "primary" ? "class" : "form";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LecturerForm>({
    resolver: zodResolver(lecturerSchema) as Resolver<LecturerForm>,
  });

  const mutation = useMutation({
    mutationFn: (values: LecturerForm) => adminApi.createLecturer(values),
    onSuccess: (lecturer) => {
      setCreatedLecturerId(lecturer._id);
      qc.invalidateQueries({ queryKey: ["admin-lecturers"] });
      onNext();
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-black dark:text-white">Add your first teacher</h2>
        <p className="mt-2 text-sm text-body max-w-md mx-auto">
          A teacher must exist before you can create a {classLabel}. They will be assigned as the {classLabel} teacher.
        </p>
      </div>

      {/* Why this order */}
      <div className="rounded-xl border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4">
        <p className="text-xs font-semibold text-black dark:text-white mb-2">Why this order?</p>
        <div className="flex flex-col gap-2 text-xs text-body">
          {[
            { n: "1", label: "Teacher", desc: "Created first — every class needs a teacher assigned" },
            { n: "2", label: `${classLabel.charAt(0).toUpperCase() + classLabel.slice(1)}`, desc: "Requires a teacher — can't be created without one" },
            { n: "3", label: "Student", desc: "Assigned to a class — needs the class to exist first" },
          ].map(({ n, label, desc }) => (
            <div key={n} className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{n}</span>
              <span><strong className="text-black dark:text-white">{label}</strong> — {desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name *" error={errors.fullName?.message}>
          <TextInput {...register("fullName")} placeholder="Mr. Mohamed Kamara" error={errors.fullName?.message} />
        </Field>
        <Field label="Email *" error={errors.email?.message}>
          <TextInput {...register("email")} type="email" placeholder="teacher@school.edu.sl" error={errors.email?.message} />
        </Field>
        <Field label="Password *" hint="They can change this after first login" error={errors.password?.message}>
          <TextInput {...register("password")} type="password" placeholder="••••••••" error={errors.password?.message} />
        </Field>
      </div>

      {mutation.isError && (
        <p className="rounded-xl bg-meta-1/10 px-4 py-2.5 text-xs text-meta-1">
          {errMsg(mutation.error, "Failed to create teacher") }
        </p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-stroke px-5 py-3 text-sm font-medium text-body transition-colors hover:border-primary hover:text-primary dark:border-strokedark">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Creating…" : <><span>Create Teacher & Continue</span> <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
      <button type="button" onClick={onNext} className="w-full text-center text-xs text-body underline hover:text-primary">
        Skip — I'll add teachers later
      </button>
    </form>
  );
}

// ─── Step 4 — Create Class/Form ───────────────────────────────────────────────

function StepCreateClass({
  schoolType,
  createdLecturerId,
  onNext,
  onBack,
}: {
  schoolType: SchoolType;
  createdLecturerId: string | null;
  onNext: () => void;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const classLabel = schoolType === "primary" ? "Class" : "Form";
  const placeholderName = schoolType === "primary" ? "Primary 1" : "Form 1 / JSS 1";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClassForm>({
    resolver: zodResolver(classSchema) as Resolver<ClassForm>,
    defaultValues: { lecturerId: createdLecturerId ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ClassForm) => classApi.create(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-classes"] });
      onNext();
    },
  });

  const canProceed = !!createdLecturerId;

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-black dark:text-white">Create your first {classLabel}</h2>
        <p className="mt-2 text-sm text-body max-w-md mx-auto">
          Now that you have a lecturer, you can create a {classLabel.toLowerCase()} and assign them as teacher.
        </p>
      </div>

      {!canProceed && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800/40 dark:bg-yellow-900/20 dark:text-yellow-400">
          You skipped adding a teacher. You can still create a {classLabel.toLowerCase()} if you have the teacher&apos;s ID, or skip this step too.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${classLabel} Name *`} error={errors.name?.message}>
          <TextInput {...register("name")} placeholder={placeholderName} error={errors.name?.message} />
        </Field>
        <Field label="Assign Lecturer *" error={errors.lecturerId?.message}>
          <TextInput
            {...register("lecturerId")}
            placeholder="Lecturer ID"
            error={errors.lecturerId?.message}
            readOnly={!!createdLecturerId}
            className={createdLecturerId ? "bg-gray-50 dark:bg-meta-4 cursor-default" : ""}
          />
          {createdLecturerId && (
            <p className="text-xs text-meta-3 mt-0.5">✓ Using the lecturer you just created</p>
          )}
        </Field>
      </div>

      {mutation.isError && (
        <p className="rounded-xl bg-meta-1/10 px-4 py-2.5 text-xs text-meta-1">
          {errMsg(mutation.error, `Failed to create ${classLabel.toLowerCase()}`)}
        </p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-stroke px-5 py-3 text-sm font-medium text-body transition-colors hover:border-primary hover:text-primary dark:border-strokedark">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Creating…" : <><span>Create {classLabel} & Continue</span> <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
      <button type="button" onClick={onNext} className="w-full text-center text-xs text-body underline hover:text-primary">
        Skip — I'll add {classLabel.toLowerCase()}s later
      </button>
    </form>
  );
}

// ─── Step 5 — Done ────────────────────────────────────────────────────────────

function StepDone({
  schoolType,
  onGoToDashboard,
}: {
  schoolType: SchoolType;
  onGoToDashboard: () => void;
}) {
  const classLabel = schoolType === "primary" ? "Class" : "Form";

  const nextSteps = [
    { icon: Users,    label: "Add more lecturers",                href: "/admin/lecturers/list" },
    { icon: School,   label: `Add more ${classLabel.toLowerCase()}s`, href: "/admin/classes/list" },
    { icon: GraduationCap, label: "Enrol students",               href: "/admin/students/list" },
    { icon: BookOpen, label: "Create subjects",                   href: "/admin/subjects/list" },
  ];

  return (
    <div className="space-y-6 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-meta-3/10">
          <CheckCircle className="h-10 w-10 text-meta-3" />
        </div>
        <h2 className="text-2xl font-bold text-black dark:text-white">You're all set! 🎉</h2>
        <p className="mt-2 text-sm text-body max-w-sm mx-auto">
          Your school is set up and ready. Here's what to do next to get fully operational.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-left">
        {nextSteps.map(({ icon: Icon, label, href }) => (
          <a
            key={label}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-stroke bg-white p-4 transition-all hover:border-primary hover:shadow-sm dark:border-strokedark dark:bg-boxdark"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-black dark:text-white">{label}</span>
            <ChevronRight className="ml-auto h-4 w-4 text-body" />
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={onGoToDashboard}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-90"
      >
        Go to Dashboard <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main onboarding page ─────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { updateUser } = useAuth();
  const qc = useQueryClient();

  // Fetch institute from API — more reliable than relying on the user object in localStorage
  const { data: fetchedInstitute, isLoading: instituteLoading } = useQuery({
    queryKey: ["admin-institute"],
    queryFn: adminApi.getMyInstitute,
  });
  const hasExistingInstitute = !!fetchedInstitute?._id;

  const [step, setStep] = useState(1);
  const [schoolType, setSchoolType] = useState<SchoolType | null>(null);
  const [createdLecturerId, setCreatedLecturerId] = useState<string | null>(null);
  const [, setCreatedInstituteId] = useState<string | null>(null);

  // Pre-fill schoolType once we know the institute
  useEffect(() => {
    if (fetchedInstitute?.schoolType) {
      setSchoolType(fetchedInstitute.schoolType);
    }
  }, [fetchedInstitute]);

  const completeMutation = useMutation({
    mutationFn: () => adminApi.updateInstitute({ onboardingCompleted: true } as never),
    onSuccess: (institute) => {
      qc.invalidateQueries({ queryKey: ["admin-institute"] });
      const inst = institute ?? fetchedInstitute;
      if (inst) {
        updateUser({
          institute: {
            _id: inst._id,
            name: inst.name,
            schoolType: inst.schoolType ?? (schoolType ?? "secondary"),
            onboardingCompleted: true,
          },
        });
      }
      router.replace("/admin");
    },
  });

  const handleGoToDashboard = () => completeMutation.mutate();

  if (instituteLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-whiten dark:bg-boxdark-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-whiten dark:bg-boxdark-2 flex flex-col items-center justify-start px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-black dark:text-white">
          Student<span className="text-primary">MS</span>
          <span className="ml-2 text-sm font-normal text-body">Setup Wizard</span>
        </span>
      </div>

      <div className="w-full max-w-2xl">
        <StepBar current={step} skipStep2={hasExistingInstitute} />

        <div className="rounded-2xl border border-stroke bg-white p-8 shadow-sm dark:border-strokedark dark:bg-boxdark">
          {step === 1 && (
            <StepSchoolType
              selected={schoolType}
              onSelect={setSchoolType}
              onNext={() => setStep(hasExistingInstitute ? 3 : 2)}
              skipProfile={hasExistingInstitute}
            />
          )}
          {step === 2 && (
            <StepInstituteProfile
              schoolType={schoolType ?? "secondary"}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
              setCreatedInstitute={setCreatedInstituteId}
            />
          )}
          {step === 3 && (
            <StepCreateLecturer
              schoolType={schoolType ?? "secondary"}
              onNext={() => setStep(4)}
              onBack={() => setStep(hasExistingInstitute ? 1 : 2)}
              setCreatedLecturerId={setCreatedLecturerId}
            />
          )}
          {step === 4 && (
            <StepCreateClass
              schoolType={schoolType ?? "secondary"}
              createdLecturerId={createdLecturerId}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <StepDone
              schoolType={schoolType ?? "secondary"}
              onGoToDashboard={handleGoToDashboard}
            />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-body">
          Step {step} of {STEPS.length} — You can always change these settings later.
        </p>
      </div>
    </div>
  );
}
