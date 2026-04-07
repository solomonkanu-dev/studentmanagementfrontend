"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemConfigApi } from "@/lib/api/systemConfig";
import { superAdminApi } from "@/lib/api/superAdmin";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Shield, AlertTriangle, Globe, Building2 } from "lucide-react";
import type { PendingAdmin } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";

// ─── Toggle Global Maintenance ────────────────────────────────────────────────

function GlobalMaintenanceCard() {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-status"],
    queryFn: systemConfigApi.getMaintenance,
  });

  const isGlobal = data?.globalMaintenance ?? false;

  const mutation = useMutation({
    mutationFn: () => systemConfigApi.toggleGlobalMaintenance({ enabled: !isGlobal, message: message || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-status"] });
      setConfirmOpen(false);
      setMessage("");
    },
    onError: (e: unknown) => setError(errMsg(e, "Failed to update maintenance status.")),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Global Maintenance</h2>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={isGlobal ? "danger" : "success"}>
                    {isGlobal ? "MAINTENANCE ON" : "System Online"}
                  </Badge>
                </div>
                <p className="text-xs text-body">
                  {isGlobal
                    ? "All institutes are currently in maintenance mode."
                    : "All institutes are accessible normally."}
                </p>
              </div>
              <Button
                variant={isGlobal ? "ghost" : "danger"}
                size="sm"
                onClick={() => setConfirmOpen(true)}
              >
                {isGlobal ? "Disable Maintenance" : "Enable Maintenance"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {confirmOpen && (
        <Modal
          open
          onClose={() => setConfirmOpen(false)}
          title={isGlobal ? "Disable Global Maintenance?" : "Enable Global Maintenance?"}
        >
          <div className="space-y-4">
            {!isGlobal && (
              <>
                <div className="flex items-start gap-3 rounded-md bg-meta-1/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-meta-1" aria-hidden="true" />
                  <p className="text-sm text-meta-1">
                    This will put ALL institutes into maintenance mode. Users will not be able to access the system.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-black dark:text-white">Maintenance Message (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. System upgrade in progress…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                  />
                </div>
              </>
            )}
            {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button
                variant={isGlobal ? "secondary" : "danger"}
                onClick={() => { setError(""); mutation.mutate(); }}
                isLoading={mutation.isPending}
              >
                {isGlobal ? "Disable" : "Enable Maintenance"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Per-Institute Maintenance ────────────────────────────────────────────────

function InstituteMaintenanceCard() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<{ adminId: string; name: string; enabled: boolean } | null>(null);
  const [instMessage, setInstMessage] = useState("");
  const [error, setError] = useState("");

  const { data: allAdmins = [], isLoading } = useQuery({
    queryKey: ["all-admins"],
    queryFn: superAdminApi.getAllAdmins,
  });

  const approved = (allAdmins as PendingAdmin[]).filter((a) => a.approved);

  const mutation = useMutation({
    mutationFn: () =>
      systemConfigApi.toggleInstituteMaintenance({
        instituteId: target!.adminId,
        enabled: target!.enabled,
        message: instMessage || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-admins"] });
      setTarget(null);
      setInstMessage("");
    },
    onError: (e: unknown) => setError(errMsg(e, "Failed to update institute maintenance.")),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Per-Institute Maintenance</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
            </div>
          ) : approved.length === 0 ? (
            <p className="px-5 py-6 text-sm text-body">No approved institutes.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <tr>
                    <Th>Admin / Institute</Th>
                    <Th>Status</Th>
                    <Th>Action</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {approved.map((a) => (
                    <tr key={a._id}>
                      <Td>
                        <div>
                          <p className="font-medium text-black dark:text-white">{a.fullName}</p>
                          <p className="text-xs text-body">{a.email}</p>
                        </div>
                      </Td>
                      <Td>
                        <Badge variant="success">Online</Badge>
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setTarget({ adminId: a._id, name: a.fullName, enabled: true }); setError(""); }}
                        >
                          Set Maintenance
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {target && (
        <Modal open onClose={() => setTarget(null)} title={`Maintenance — ${target.name}`}>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-black dark:text-white">Maintenance Message (optional)</label>
              <input
                type="text"
                placeholder="e.g. Scheduled downtime…"
                value={instMessage}
                onChange={(e) => setInstMessage(e.target.value)}
                className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              />
            </div>
            {error && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => { setError(""); mutation.mutate(); }} isLoading={mutation.isPending}>
                Enable Maintenance
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SystemConfigPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
        <p className="text-sm text-body">Manage system-wide and per-institute maintenance windows.</p>
      </div>
      <GlobalMaintenanceCard />
      <InstituteMaintenanceCard />
    </div>
  );
}
