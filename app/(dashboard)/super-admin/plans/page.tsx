"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { planApi } from "@/lib/api/plan";
import { apiClient } from "@/lib/api/client";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { CreditCard, Pencil, Building2 } from "lucide-react";
import type { Plan } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";

// ─── Schema ───────────────────────────────────────────────────────────────────

const limitsSchema = z.object({
  maxStudents: z.coerce.number().min(1),
  maxLecturers: z.coerce.number().min(1),
  maxClasses: z.coerce.number().min(1),
  price: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
});
type LimitsFormValues = z.infer<typeof limitsSchema>;

// ─── Edit Plan Limits Modal ───────────────────────────────────────────────────

function EditPlanModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<LimitsFormValues>({
    resolver: zodResolver(limitsSchema) as Resolver<LimitsFormValues>,
    defaultValues: {
      maxStudents: plan.limits?.maxStudents,
      maxLecturers: plan.limits?.maxLecturers,
      maxClasses: plan.limits?.maxClasses,
      price: plan.price ?? 0,
      description: plan.description ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (v: LimitsFormValues) => planApi.updateLimits(plan._id, {
      limits: { maxStudents: v.maxStudents, maxLecturers: v.maxLecturers, maxClasses: v.maxClasses },
      price: v.price,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      onClose();
    },
    onError: (e: unknown) => setServerError(errMsg(e, "Failed to update plan.")),
  });

  return (
    <Modal open onClose={onClose} title={`Edit Plan — ${plan.name}`}>
      <form onSubmit={handleSubmit((v) => { setServerError(""); mutation.mutate(v); })} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Max Students" type="number" error={errors.maxStudents?.message} {...register("maxStudents")} />
          <Input label="Max Lecturers" type="number" error={errors.maxLecturers?.message} {...register("maxLecturers")} />
          <Input label="Max Classes" type="number" error={errors.maxClasses?.message} {...register("maxClasses")} />
          <Input label="Price ($)" type="number" error={errors.price?.message} {...register("price")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">Description</label>
          <textarea
            rows={2}
            className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            {...register("description")}
          />
        </div>
        {serverError && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{serverError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Assign Plan Modal ────────────────────────────────────────────────────────

function AssignPlanModal({ plans, onClose }: { plans: Plan[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [instituteId, setInstituteId] = useState("");
  const [planName, setPlanName] = useState(plans[0]?.name ?? "");
  const [serverError, setServerError] = useState("");

  const { data: institutesData } = useQuery({
    queryKey: ["institutes-list"],
    queryFn: async () => {
      const { data } = await apiClient.get("/super-admin/monitor/institutes");
      return (data.data ?? []) as Array<{ institute: { id: string; name: string } }>;
    },
  });
  const institutes = institutesData ?? [];

  const mutation = useMutation({
    mutationFn: () => planApi.assignToInstitute({ instituteId, planName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      onClose();
    },
    onError: (e: unknown) => setServerError(errMsg(e, "Failed to assign plan.")),
  });

  return (
    <Modal open onClose={onClose} title="Assign Plan to Institute">
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">Institute</label>
          <select
            value={instituteId}
            onChange={(e) => setInstituteId(e.target.value)}
            className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          >
            <option value="">— Select institute —</option>
            {institutes.map(({ institute: inst }) => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black dark:text-white">Plan</label>
          <select
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          >
            {plans.map((p) => (
              <option key={p._id} value={p.name}>{p.displayName ?? p.name}</option>
            ))}
          </select>
        </div>
        {serverError && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{serverError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { setServerError(""); mutation.mutate(); }} isLoading={mutation.isPending} disabled={!instituteId || !planName}>
            Assign Plan
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: planApi.getAll,
  });
  const plans: Plan[] = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-body">{plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
        <Button onClick={() => setShowAssign(true)} disabled={plans.length === 0}>
          <Building2 className="h-4 w-4" aria-hidden="true" />
          Assign to Institute
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                <CreditCard className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-black dark:text-white">No plans configured.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <tr>
                    <Th>Plan Name</Th>
                    <Th>Max Students</Th>
                    <Th>Max Lecturers</Th>
                    <Th>Max Classes</Th>
                    <Th>Price</Th>
                    <Th>Actions</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {plans.map((p) => (
                    <tr key={p._id}>
                      <Td>
                        <div>
                          <p className="font-medium text-black dark:text-white">{p.displayName ?? p.name}</p>
                          {p.description && <p className="text-xs text-body">{p.description}</p>}
                        </div>
                      </Td>
                      <Td>{p.limits?.maxStudents ?? "—"}</Td>
                      <Td>{p.limits?.maxLecturers ?? "—"}</Td>
                      <Td>{p.limits?.maxClasses ?? "—"}</Td>
                      <Td>{p.price != null ? `$${p.price}` : "—"}</Td>
                      <Td>
                        <button
                          onClick={() => setEditTarget(p)}
                          className="rounded p-1.5 text-body hover:bg-stroke hover:text-black transition-colors dark:hover:bg-meta-4 dark:hover:text-white"
                          aria-label="Edit plan"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editTarget && <EditPlanModal plan={editTarget} onClose={() => setEditTarget(null)} />}
      {showAssign && <AssignPlanModal plans={plans} onClose={() => setShowAssign(false)} />}
    </div>
  );
}
