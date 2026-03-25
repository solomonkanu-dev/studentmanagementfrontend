"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { themeApi } from "@/lib/api/theme";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Palette,
  Zap,
} from "lucide-react";
import type { Theme } from "@/lib/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const hexRule = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g. #3c50e0)");

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  primary: hexRule,
  secondary: hexRule,
  accent: hexRule,
  success: hexRule,
  danger: hexRule,
  warning: hexRule,
  info: hexRule,
  dark: hexRule,
  light: hexRule,
  fontFamily: z.string().min(1, "Font family is required"),
  fontSize: z.coerce.number().min(10).max(20),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: Partial<FormValues> = {
  primary: "#3c50e0",
  secondary: "#80caee",
  accent: "#ffc107",
  success: "#10b981",
  danger: "#dc3545",
  warning: "#ffc107",
  info: "#17a2b8",
  dark: "#343a40",
  light: "#f8f9fa",
  fontFamily: "Satoshi, sans-serif",
  fontSize: 14,
};

// ─── Color swatch row ─────────────────────────────────────────────────────────

const COLOR_FIELDS: { key: keyof FormValues; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "success", label: "Success" },
  { key: "danger", label: "Danger" },
  { key: "warning", label: "Warning" },
  { key: "info", label: "Info" },
  { key: "dark", label: "Dark" },
  { key: "light", label: "Light" },
];

function ColorField({
  label,
  fieldKey,
  register,
  error,
  watch,
}: {
  label: string;
  fieldKey: string;
  register: ReturnType<typeof useForm<FormValues>>["register"];
  error?: string;
  watch: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-black dark:text-white">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={watch}
          onChange={() => {}}
          className="h-9 w-9 cursor-pointer rounded border border-stroke p-0.5 dark:border-strokedark"
          aria-hidden="true"
          tabIndex={-1}
          // Sync color picker → text field via the hidden input
          onInput={(e) => {
            const input = (e.target as HTMLInputElement)
              .closest(".flex")
              ?.querySelector("input[type=text]") as HTMLInputElement | null;
            if (input) {
              input.value = (e.target as HTMLInputElement).value;
              input.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }}
        />
        <input
          type="text"
          placeholder="#000000"
          className="h-9 flex-1 rounded border border-stroke bg-transparent px-3 font-mono text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
          {...register(fieldKey as keyof FormValues)}
        />
      </div>
      {error && <p className="text-xs text-meta-1">{error}</p>}
    </div>
  );
}

// ─── Theme card ───────────────────────────────────────────────────────────────

function ThemeCard({
  theme,
  onEdit,
  onDelete,
  onActivate,
  isActivating,
}: {
  theme: Theme;
  onEdit: () => void;
  onDelete: () => void;
  onActivate: () => void;
  isActivating: boolean;
}) {
  const swatches = [
    theme.primary, theme.secondary, theme.accent,
    theme.success, theme.danger, theme.warning, theme.info,
  ];

  return (
    <div className={[
      "rounded-sm border bg-white shadow-default transition-all dark:bg-boxdark",
      theme.isActive
        ? "border-primary ring-1 ring-primary/20"
        : "border-stroke dark:border-strokedark",
    ].join(" ")}>
      <div className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.primary }}
            >
              <Palette className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-black dark:text-white">
                {theme.name}
              </p>
              {theme.description && (
                <p className="text-xs text-body">{theme.description}</p>
              )}
            </div>
          </div>
          {theme.isActive && (
            <Badge variant="success">Active</Badge>
          )}
        </div>

        {/* Color swatches */}
        <div className="mb-4 flex gap-1.5">
          {swatches.map((color, i) => (
            <div
              key={i}
              title={color}
              className="h-5 flex-1 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Font info */}
        <p className="mb-4 truncate text-xs text-body" title={theme.fontFamily}>
          {theme.fontFamily} · {theme.fontSize}px
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-stroke pt-3 dark:border-strokedark">
          {!theme.isActive && (
            <Button
              size="sm"
              className="flex-1"
              isLoading={isActivating}
              onClick={onActivate}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Activate
            </Button>
          )}
          {theme.isActive && (
            <div className="flex flex-1 items-center gap-1.5 text-xs text-meta-3">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Currently active
            </div>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded text-body hover:bg-meta-2 hover:text-primary transition-colors dark:hover:bg-meta-4"
            aria-label="Edit theme"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {!theme.isActive && (
            <button
              type="button"
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded text-meta-1 hover:bg-meta-1/10 transition-colors"
              aria-label="Delete theme"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Form modal ───────────────────────────────────────────────────────────────

function ThemeFormModal({
  open,
  onClose,
  initial,
  onSubmit,
  isPending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<FormValues>;
  onSubmit: (values: FormValues) => void;
  isPending: boolean;
  error: string;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { ...DEFAULTS, ...initial },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.name ? "Edit Theme" : "New Theme"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Name + description */}
        <div className="space-y-3">
          <Input
            label="Theme Name *"
            placeholder="My Brand Theme"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Description"
            placeholder="A brief description (optional)"
            {...register("description")}
          />
        </div>

        {/* Colors */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">
            Colors
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {COLOR_FIELDS.map(({ key, label }) => (
              <ColorField
                key={key}
                label={label}
                fieldKey={key}
                register={register}
                error={errors[key]?.message}
                watch={String(watch(key) ?? "")}
              />
            ))}
          </div>
        </div>

        {/* Typography */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-body">
            Typography
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Font Family"
              placeholder="Satoshi, sans-serif"
              error={errors.fontFamily?.message}
              {...register("fontFamily")}
            />
            <Input
              label="Font Size (px)"
              type="number"
              placeholder="14"
              error={errors.fontSize?.message}
              {...register("fontSize")}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending}>
            {initial?.name ? "Save Changes" : "Create Theme"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ThemePage() {
  const queryClient = useQueryClient();
  const { refreshTheme } = useTheme();

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Theme | null>(null);
  const [formError, setFormError] = useState("");
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["themes"],
    queryFn: themeApi.getAll,
  });

  const themes: Theme[] = Array.isArray(data) ? data : [];

  const createMutation = useMutation({
    mutationFn: themeApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["themes"] });
      setShowCreate(false);
      setFormError("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to create theme";
      setFormError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      themeApi.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["themes"] });
      await refreshTheme();
      setEditTarget(null);
      setFormError("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to update theme";
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: themeApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["themes"] }),
  });

  const activateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      themeApi.update(id, { isActive: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["themes"] });
      await refreshTheme();
      setActivatingId(null);
    },
    onError: () => setActivatingId(null),
  });

  const handleActivate = (theme: Theme) => {
    setActivatingId(theme._id);
    activateMutation.mutate({ id: theme._id });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-body">
            {themes.length} theme{themes.length !== 1 ? "s" : ""}
            {themes.find((t) => t.isActive) ? " · 1 active" : " · none active"}
          </p>
        </div>
        <Button onClick={() => { setShowCreate(true); setFormError(""); }}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Theme
        </Button>
      </div>

      {/* Themes grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
        </div>
      ) : themes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
            <Palette className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-black dark:text-white">
            No themes yet
          </p>
          <p className="text-xs text-body">
            Create a theme to customise the app colours and typography.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {themes.map((t) => (
            <ThemeCard
              key={t._id}
              theme={t}
              isActivating={activatingId === t._id}
              onEdit={() => { setEditTarget(t); setFormError(""); }}
              onDelete={() => deleteMutation.mutate(t._id)}
              onActivate={() => handleActivate(t)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <ThemeFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(values) => createMutation.mutate(values)}
        isPending={createMutation.isPending}
        error={formError}
      />

      {/* Edit modal */}
      {editTarget && (
        <ThemeFormModal
          open
          onClose={() => setEditTarget(null)}
          initial={editTarget}
          onSubmit={(values) =>
            updateMutation.mutate({ id: editTarget._id, payload: values })
          }
          isPending={updateMutation.isPending}
          error={formError}
        />
      )}
    </div>
  );
}
