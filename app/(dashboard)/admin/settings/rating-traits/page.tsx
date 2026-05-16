"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ratingTraitApi } from "@/lib/api/ratingTrait";
import type { RatingTrait, RatingDomain } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { errMsg } from "@/lib/utils/errMsg";
import { Plus, Pencil, Trash2, Loader2, Smile, Activity, X, Check } from "lucide-react";

const DOMAIN_META: Record<RatingDomain, { label: string; hint: string }> = {
  affective: {
    label: "Affective",
    hint: "Character & behaviour traits rated 1–5 each term (e.g. Punctuality, Honesty).",
  },
  psychomotor: {
    label: "Psychomotor",
    hint: "Practical & physical skills rated 1–5 each term (e.g. Handwriting, Sports).",
  },
};

export default function RatingTraitsPage() {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState<RatingDomain>("affective");

  const { data: traits = [], isLoading } = useQuery({
    queryKey: ["rating-traits", domain],
    queryFn: () => ratingTraitApi.getAll(domain),
  });

  const [newName, setNewName] = useState("");
  const [editTarget, setEditTarget] = useState<RatingTrait | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RatingTrait | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["rating-traits", domain] });

  const createMutation = useMutation({
    mutationFn: () => ratingTraitApi.create({ domain, name: newName.trim() }),
    onSuccess: () => { invalidate(); setNewName(""); setError(""); },
    onError: (e: unknown) => setError(errMsg(e, "Failed to add trait")),
  });

  const updateMutation = useMutation({
    mutationFn: () => ratingTraitApi.update(editTarget!._id, { name: editName.trim() }),
    onSuccess: () => { invalidate(); setEditTarget(null); },
    onError: (e: unknown) => setError(errMsg(e, "Failed to update trait")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => ratingTraitApi.remove(deleteTarget!._id),
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
  });

  const list = traits as RatingTrait[];

  return (
    <div className="space-y-5">
      <div className="rounded-sm border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary dark:border-primary/30 dark:bg-primary/10">
        Define the traits and skills teachers rate each term. These appear in the
        Affective and Psychomotor sections of the traditional report card.
      </div>

      {/* Domain tabs */}
      <div className="flex w-fit rounded-sm border border-stroke dark:border-strokedark overflow-hidden">
        {(["affective", "psychomotor"] as RatingDomain[]).map((d) => (
          <button
            key={d}
            onClick={() => { setDomain(d); setError(""); }}
            className={[
              "flex items-center gap-1.5 px-5 py-2 text-sm font-medium transition-colors",
              domain === d
                ? "bg-primary text-white"
                : "bg-white text-body hover:bg-whiter dark:bg-boxdark dark:text-bodydark dark:hover:bg-meta-4",
            ].join(" ")}
          >
            {d === "affective" ? <Smile className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
            {DOMAIN_META[d].label}
          </button>
        ))}
      </div>

      <p className="text-sm text-body">{DOMAIN_META[domain].hint}</p>

      {/* Add row */}
      <Card>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-black dark:text-white">
                New {DOMAIN_META[domain].label} trait
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) createMutation.mutate(); }}
                placeholder={domain === "affective" ? "e.g. Punctuality" : "e.g. Handwriting"}
                className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
            </div>
            <Button
              size="sm"
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-meta-1">{error}</p>}
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <p className="py-12 text-center text-sm text-body">No {DOMAIN_META[domain].label.toLowerCase()} traits yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {list.map((t) => (
            <div
              key={t._id}
              className="flex items-center justify-between rounded-sm border border-stroke bg-white px-4 py-2.5 dark:border-strokedark dark:bg-boxdark"
            >
              {editTarget?._id === t._id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 flex-1 rounded border border-stroke bg-transparent px-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  />
                  <button onClick={() => updateMutation.mutate()} className="rounded p-1.5 text-meta-3 hover:bg-meta-3/10" title="Save">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditTarget(null)} className="rounded p-1.5 text-body hover:bg-meta-2 dark:hover:bg-meta-4" title="Cancel">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm text-black dark:text-white">{t.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditTarget(t); setEditName(t.name); setError(""); }}
                      className="rounded p-1.5 text-body hover:bg-meta-2 hover:text-primary dark:hover:bg-meta-4"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="rounded p-1.5 text-body hover:bg-meta-1/10 hover:text-meta-1"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete Trait">
        <div className="space-y-4">
          <p className="text-sm text-body">
            Delete <span className="font-semibold text-black dark:text-white">{deleteTarget?.name}</span>?
            Existing ratings for it will no longer appear.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" isLoading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
