"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { errMsg } from "@/lib/utils/errMsg";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adminApi } from "@/lib/api/admin";
import { uploadApi } from "@/lib/api/upload";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Flag,
  Target,
  ImageIcon,
  CheckCircle2,
  Upload,
  Loader2,
} from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Institute name is required"),
  address: z.string().min(1, "Address is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  targetLine: z.string().min(1, "Tagline is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().optional(),
  country: z.string().optional(),
  logo: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function InstitutePage() {
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");

  const { data: institute, isLoading } = useQuery({
    queryKey: ["my-institute"],
    queryFn: adminApi.getMyInstitute,
  });

  const isEditing = !!institute;

  const createMutation = useMutation({
    mutationFn: adminApi.createInstitute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-institute"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: adminApi.updateInstitute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-institute"] });
    },
  });

  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      address: "",
      phoneNumber: "",
      targetLine: "",
      email: "",
      website: "",
      country: "",
      logo: "",
    },
  });

  // Live-watch all fields for preview
  const watched = useWatch({ control });

  useEffect(() => {
    if (institute) {
      reset({
        name: institute.name ?? "",
        address: institute.address ?? "",
        phoneNumber: institute.phoneNumber ?? "",
        targetLine: institute.targetLine ?? "",
        email: institute.email ?? "",
        website: institute.website ?? "",
        country: institute.country ?? "",
        logo: institute.logo ?? "",
      });
    }
  }, [institute, reset]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary"
          role="status"
          aria-label="Loading institute"
        />
      </div>
    );
  }

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── Left: Live Preview ──────────────────────────────── */}
      <div className="space-y-6">
        <PreviewCard watched={watched} />
      </div>

      {/* ── Right: Form ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-black dark:text-white">
            {isEditing ? "Edit Institute" : "Create Institute"}
          </h2>
          <p className="mt-0.5 text-xs text-body">
            {isEditing
              ? "Update your institute details. Changes reflect in the preview instantly."
              : "Set up your institute. Fill in the details and see a live preview on the left."}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Institute Name *"
              placeholder="Oxford Academy"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Tagline *"
              placeholder="Excellence in education since 1990"
              error={errors.targetLine?.message}
              {...register("targetLine")}
            />
            <Input
              label="Address *"
              placeholder="123 University Ave, Freetown"
              error={errors.address?.message}
              {...register("address")}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Phone *"
                placeholder="+232 76 123 456"
                error={errors.phoneNumber?.message}
                {...register("phoneNumber")}
              />
              <Input
                label="Email"
                type="email"
                placeholder="info@academy.edu"
                error={errors.email?.message}
                {...register("email")}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Website"
                placeholder="https://academy.edu"
                {...register("website")}
              />
              <Input
                label="Country"
                placeholder="Sierra Leone"
                {...register("country")}
              />
            </div>

            {/* Logo upload */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-black dark:text-white">
                Institute Logo
              </label>
              <div className="flex items-center gap-3">
                {/* Preview */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-stroke bg-whiter dark:border-strokedark dark:bg-meta-4 overflow-hidden">
                  {watched.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={watched.logo}
                      alt="Logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-body" aria-hidden="true" />
                  )}
                </div>
                {/* Upload button */}
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex items-center gap-2 rounded-md border border-stroke bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-whiter disabled:opacity-50 dark:border-strokedark dark:bg-meta-4 dark:text-white dark:hover:bg-boxdark"
                  >
                    {logoUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="h-4 w-4" aria-hidden="true" />
                    )}
                    {logoUploading ? "Uploading…" : watched.logo ? "Change logo" : "Upload logo"}
                  </button>
                  <p className="text-[10px] text-body">PNG, JPG or WebP · max 5 MB</p>
                  {logoError && (
                    <p className="text-[10px] text-meta-1">{logoError}</p>
                  )}
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoError("");
                  setLogoUploading(true);
                  try {
                    const { logoUrl } = await uploadApi.instituteLogo(file);
                    setValue("logo", logoUrl, { shouldDirty: true });
                  } catch (err: unknown) {
                    const msg =
                      (err as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message ?? "Upload failed. Please try again.";
                    setLogoError(msg);
                  } finally {
                    setLogoUploading(false);
                    e.target.value = "";
                  }
                }}
              />
            </div>

            {mutation.isSuccess && (
              <div className="flex items-center gap-2 rounded-md bg-meta-3/10 px-3 py-2 text-xs text-meta-3">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Institute {isEditing ? "updated" : "created"} successfully.
              </div>
            )}

            {mutation.isError && (
              <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">
                {errMsg(mutation.error, `Failed to ${isEditing ? "update" : "create"} institute`)}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!isDirty}
                  onClick={() => {
                    if (institute) {
                      reset({
                        name: institute.name ?? "",
                        address: institute.address ?? "",
                        phoneNumber: institute.phoneNumber ?? "",
                        targetLine: institute.targetLine ?? "",
                        email: institute.email ?? "",
                        website: institute.website ?? "",
                        country: institute.country ?? "",
                        logo: institute.logo ?? "",
                      });
                    }
                  }}
                >
                  Discard
                </Button>
              )}
              <Button
                type="submit"
                isLoading={mutation.isPending}
                disabled={isEditing && !isDirty}
              >
                {isEditing ? "Save Changes" : "Create Institute"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Preview Card ──────────────────────────────────────────────────────────────

function PreviewCard({ watched }: { watched: Partial<FormValues> }) {
  const hasLogo = !!watched.logo;

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-body">
          Live Preview
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header / Brand */}
        <div className="flex items-start gap-4">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={watched.logo}
              alt="Institute logo"
              className="h-16 w-16 shrink-0 rounded-lg border border-stroke object-cover dark:border-strokedark"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-meta-2 dark:bg-meta-4">
              <Building2
                className="h-8 w-8 text-primary"
                aria-hidden="true"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-black dark:text-white truncate">
              {watched.name || "Institute Name"}
            </h3>
            {watched.targetLine && (
              <p className="mt-0.5 text-sm italic text-body">
                &ldquo;{watched.targetLine}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stroke dark:border-strokedark" />

        {/* Detail rows */}
        <div className="space-y-3">
          <PreviewRow
            icon={MapPin}
            label="Address"
            value={watched.address}
            placeholder="No address provided"
          />
          <PreviewRow
            icon={Phone}
            label="Phone"
            value={watched.phoneNumber}
            placeholder="No phone number"
          />
          <PreviewRow
            icon={Mail}
            label="Email"
            value={watched.email}
            placeholder="No email"
          />
          <PreviewRow
            icon={Globe}
            label="Website"
            value={watched.website}
            placeholder="No website"
          />
          <PreviewRow
            icon={Flag}
            label="Country"
            value={watched.country}
            placeholder="Not specified"
          />
          <PreviewRow
            icon={Target}
            label="Tagline"
            value={watched.targetLine}
            placeholder="No tagline"
          />
        </div>

        {/* Visual card footer */}
        <div className="rounded-md border border-stroke bg-whiter px-4 py-3 dark:border-strokedark dark:bg-meta-4">
          <div className="flex items-center gap-3">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={watched.logo}
                alt=""
                className="h-8 w-8 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                <ImageIcon
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-black dark:text-white">
                {watched.name || "Institute Name"}
              </p>
              <p className="truncate text-[10px] text-body">
                {[watched.address, watched.country]
                  .filter(Boolean)
                  .join(", ") || "Address, Country"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewRow({
  icon: Icon,
  label,
  value,
  placeholder,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  placeholder: string;
}) {
  const hasValue = !!value;
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-meta-2 dark:bg-meta-4">
        <Icon
          className={[
            "h-4 w-4",
            hasValue ? "text-primary" : "text-body",
          ].join(" ")}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-[10px] uppercase tracking-wide text-body">
          {label}
        </p>
        <p
          className={[
            "truncate text-sm",
            hasValue
              ? "font-medium text-black dark:text-white"
              : "italic text-body",
          ].join(" ")}
        >
          {value || placeholder}
        </p>
      </div>
    </div>
  );
}
