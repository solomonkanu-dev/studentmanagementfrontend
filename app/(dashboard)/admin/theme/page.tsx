"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Trash2 } from "lucide-react";
import type { Theme } from "@/lib/types";

export default function ThemePage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", primaryColor: "", secondaryColor: "" });
  const [formError, setFormError] = useState("");

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ["themes"],
    queryFn: async () => {
      const { data } = await apiClient.get("/theme");
      return data.data ?? data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { data } = await apiClient.post("/theme", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["themes"] });
      setShowCreate(false);
      setForm({ name: "", primaryColor: "", secondaryColor: "" });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed";
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/theme/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["themes"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Theme
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
          </div>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Name</Th>
                <Th>Primary Color</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </TableHead>
            <TableBody>
              {themes.length === 0 ? (
                <tr><Td colSpan={4} className="py-10 text-center text-slate-400">No themes yet.</Td></tr>
              ) : (
                themes.map((t: Theme) => (
                  <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                    <Td className="font-medium text-slate-900">{t.name}</Td>
                    <Td>
                      {t.primary ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="h-4 w-4 rounded-full border border-slate-200"
                            style={{ backgroundColor: t.primary }}
                          />
                          <span className="font-mono text-xs text-slate-500">{t.primary}</span>
                        </div>
                      ) : "—"}
                    </Td>
                    <Td>
                      <Badge variant={t.isActive ? "success" : "default"}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Td>
                    <Td>
                      <button
                        onClick={() => deleteMutation.mutate(t._id)}
                        className="rounded p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormError(""); }} title="Create Theme">
        <div className="space-y-4">
          <Input label="Theme Name" placeholder="Default" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor || "#1e293b"}
                onChange={(e) => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                className="h-9 w-12 cursor-pointer rounded-md border border-slate-200"
              />
              <span className="font-mono text-xs text-slate-500">{form.primaryColor || "—"}</span>
            </div>
          </div>
          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button isLoading={createMutation.isPending} onClick={() => { setFormError(""); createMutation.mutate(form); }}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
