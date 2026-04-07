"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { accountApi } from "@/lib/api/account";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Landmark, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import type { InvoiceAccount } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  bankAddress: z.string().min(1, "Bank address is required"),
  bankNo: z.string().min(1, "Account number is required"),
  bankLogo: z.string().optional(),
  accountHolderName: z.string().optional(),
  routingNumber: z.string().optional(),
  swiftCode: z.string().optional(),
  instructions: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoiceAccountsPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<InvoiceAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceAccount | null>(null);
  const [formError, setFormError] = useState("");

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["invoice-accounts"],
    queryFn: accountApi.getAll,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoice-accounts"] });

  const createMutation = useMutation({
    mutationFn: accountApi.create,
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (err: unknown) => setFormError(errMsg(err, "Failed to create account")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      accountApi.update(id, payload),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (err: unknown) => setFormError(errMsg(err, "Failed to update account")),
  });

  const toggleMutation = useMutation({
    mutationFn: accountApi.toggleStatus,
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: accountApi.remove,
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function openCreate() {
    setEditing(null);
    reset({ bankName: "", bankAddress: "", bankNo: "", bankLogo: "", accountHolderName: "", routingNumber: "", swiftCode: "", instructions: "" });
    setFormError("");
    setMode("create");
  }

  function openEdit(acc: InvoiceAccount) {
    setEditing(acc);
    reset({
      bankName: acc.bankName,
      bankAddress: acc.bankAddress,
      bankNo: acc.bankNo,
      bankLogo: acc.bankLogo ?? "",
      accountHolderName: acc.accountHolderName ?? "",
      routingNumber: acc.routingNumber ?? "",
      swiftCode: acc.swiftCode ?? "",
      instructions: acc.instructions ?? "",
    });
    setFormError("");
    setMode("edit");
  }

  function closeModal() {
    setMode(null);
    setEditing(null);
    reset();
    setFormError("");
  }

  function onSubmit(values: FormValues) {
    // strip empty optional strings
    const payload: Record<string, unknown> = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== "")
    );
    if (mode === "create") {
      createMutation.mutate(payload);
    } else if (editing) {
      updateMutation.mutate({ id: editing._id, payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="rounded-sm border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary dark:border-primary/30 dark:bg-primary/10">
        These accounts appear on fee invoices generated for students. Toggle <strong>Active</strong> to
        control which accounts are shown.
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Invoice Accounts</h2>
            {(accounts as InvoiceAccount[]).length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                {(accounts as InvoiceAccount[]).length}
              </span>
            )}
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Account
          </Button>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            </div>
          ) : (accounts as InvoiceAccount[]).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Landmark className="h-10 w-10 text-body" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-black dark:text-white">No accounts configured</p>
                <p className="mt-0.5 text-xs text-body">Add a bank account to display on student invoices.</p>
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                Add Account
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-stroke dark:divide-strokedark">
              {(accounts as InvoiceAccount[]).map((acc) => (
                <li key={acc._id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                      {acc.bankLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={acc.bankLogo} alt={acc.bankName} className="h-6 w-6 rounded-full object-contain" />
                      ) : (
                        <Landmark className="h-4 w-4 text-primary" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-black dark:text-white">{acc.bankName}</p>
                        <Badge variant={acc.isActive ? "success" : "default"}>
                          {acc.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {acc.accountHolderName && (
                        <p className="mt-0.5 text-xs text-body">{acc.accountHolderName}</p>
                      )}
                      <p className="mt-0.5 font-mono text-xs text-black dark:text-white">{acc.bankNo}</p>
                      {acc.bankAddress && (
                        <p className="mt-0.5 text-xs text-body">{acc.bankAddress}</p>
                      )}
                      {(acc.swiftCode || acc.routingNumber) && (
                        <p className="mt-0.5 text-xs text-body">
                          {acc.swiftCode && <span>SWIFT: {acc.swiftCode}</span>}
                          {acc.swiftCode && acc.routingNumber && <span className="mx-1.5">·</span>}
                          {acc.routingNumber && <span>Routing: {acc.routingNumber}</span>}
                        </p>
                      )}
                      {acc.instructions && (
                        <p className="mt-1 text-xs text-body italic">{acc.instructions}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => toggleMutation.mutate(acc._id)}
                      disabled={toggleMutation.isPending}
                      className="rounded p-1.5 text-body transition-colors hover:bg-meta-2 hover:text-primary dark:hover:bg-meta-4"
                      title={acc.isActive ? "Deactivate" : "Activate"}
                    >
                      {acc.isActive
                        ? <ToggleRight className="h-4 w-4 text-meta-3" aria-hidden="true" />
                        : <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                      }
                    </button>
                    <button
                      onClick={() => openEdit(acc)}
                      className="rounded p-1.5 text-body transition-colors hover:bg-meta-2 hover:text-primary dark:hover:bg-meta-4"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(acc)}
                      className="rounded p-1.5 text-body transition-colors hover:bg-meta-1/10 hover:text-meta-1"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit modal */}
      <Modal
        open={mode !== null}
        onClose={closeModal}
        title={mode === "create" ? "Add Invoice Account" : "Edit Account"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Bank / Institution Name *"
              placeholder="e.g. First National Bank"
              error={errors.bankName?.message}
              {...register("bankName")}
            />
            <Input
              label="Account Number *"
              placeholder="e.g. 1234567890"
              error={errors.bankNo?.message}
              {...register("bankNo")}
            />
          </div>
          <Input
            label="Bank Address *"
            placeholder="e.g. 123 Main St, City"
            error={errors.bankAddress?.message}
            {...register("bankAddress")}
          />
          <Input
            label="Account Holder Name"
            placeholder="e.g. Springfield Academy"
            {...register("accountHolderName")}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="SWIFT / BIC Code"
              placeholder="e.g. FNBAZA22"
              {...register("swiftCode")}
            />
            <Input
              label="Routing Number"
              placeholder="e.g. 021000021"
              {...register("routingNumber")}
            />
          </div>
          <Input
            label="Bank Logo URL"
            placeholder="https://..."
            {...register("bankLogo")}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black dark:text-white">
              Payment Instructions
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Use student ID as reference when making payment"
              className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white resize-none"
              {...register("instructions")}
            />
          </div>
          {formError && (
            <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" isLoading={isPending}>
              {mode === "create" ? "Add Account" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Remove Account"
      >
        <p className="text-sm text-body">
          Remove{" "}
          <span className="font-semibold text-black dark:text-white">
            {deleteTarget?.bankName} — {deleteTarget?.bankNo}
          </span>{" "}
          from invoice accounts?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
          >
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}
