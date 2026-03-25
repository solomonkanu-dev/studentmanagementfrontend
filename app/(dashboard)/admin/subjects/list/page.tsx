"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { subjectApi } from "@/lib/api/subject";
import { classApi } from "@/lib/api/class";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Plus, Search, BookOpen } from "lucide-react";
import type { Subject, Class, AuthUser } from "@/lib/types";

const createSchema = z.object({
  name: z.string().min(1, "Required"),
  classId: z.string().min(1, "Select a class"),
  lecturerId: z.string().min(1, "Select a lecturer"),
  totalMarks: z.coerce.number().min(1).optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function SubjectsListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: subjectApi.getAll,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: classApi.getAll,
  });

  const { data: lecturers = [] } = useQuery({
    queryKey: ["admin-lecturers"],
    queryFn: adminApi.getLecturers,
  });

  const createMutation = useMutation({
    mutationFn: subjectApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setShowCreate(false);
      reset();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create subject";
      setFormError(msg);
    },
  });

  const assignMutation = useMutation({
    mutationFn: subjectApi.assignLecturer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setShowAssign(false);
      resetAssign();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to assign lecturer";
      setFormError(msg);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema) as Resolver<CreateForm>,
  });

  const {
    register: regAssign,
    handleSubmit: handleAssign,
    reset: resetAssign,
    formState: { errors: assignErrors },
  } = useForm<{ subjectId: string; lecturerId: string }>({
    resolver: zodResolver(z.object({
      subjectId: z.string().min(1),
      lecturerId: z.string().min(1),
    })),
  });

  const filtered = subjects.filter((s: Subject) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const getClassName = (classField: string | Class) =>
    typeof classField === "object" ? classField.name : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs w-full">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body"
            aria-hidden="true"
          />
          <input
            type="text"
            aria-label="Search subjects"
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded border border-stroke bg-transparent pl-9 pr-3 text-sm text-black placeholder:text-body outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowAssign(true)}>
            Assign Lecturer
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Subject
          </Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary"
              role="status"
              aria-label="Loading subjects"
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <BookOpen className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm text-body">
              {search ? "No subjects match your search." : "No subjects found."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Subject</Th>
                <Th>Code</Th>
                <Th>Class</Th>
                <Th>Created</Th>
              </tr>
            </TableHead>
            <TableBody>
              {filtered.map((s: Subject) => (
                <tr
                  key={s._id}
                  className="hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                >
                  <Td className="font-medium text-black dark:text-white">{s.name}</Td>
                  <Td className="font-mono text-xs text-body">{s.code ?? "—"}</Td>
                  <Td className="text-body">{getClassName(s.class)}</Td>
                  <Td className="text-xs text-body">
                    {new Date(s.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Td>
                </tr>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset(); setFormError(""); }}
        title="Create Subject"
      >
        <form
          onSubmit={handleSubmit((values) => {
            setFormError("");
            createMutation.mutate(values);
          })}
          className="space-y-4"
        >
          <Input label="Subject Name" placeholder="Mathematics" error={errors.name?.message} {...register("name")} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Class</label>
            <select
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              {...register("classId")}
            >
              <option value="">Select a class</option>
              {(classes as Class[]).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {errors.classId && <p className="text-xs text-meta-1">{errors.classId.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Lecturer</label>
            <select
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              {...register("lecturerId")}
            >
              <option value="">Select a lecturer</option>
              {(lecturers as AuthUser[]).map((l) => (
                <option key={l._id} value={l._id}>{l.fullName}</option>
              ))}
            </select>
            {errors.lecturerId && <p className="text-xs text-meta-1">{errors.lecturerId.message}</p>}
          </div>
          <Input label="Total Marks (optional)" type="number" placeholder="100" {...register("totalMarks")} />
          {formError && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showAssign}
        onClose={() => { setShowAssign(false); resetAssign(); setFormError(""); }}
        title="Assign Lecturer to Subject"
      >
        <form
          onSubmit={handleAssign((values) => {
            setFormError("");
            assignMutation.mutate(values);
          })}
          className="space-y-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Subject</label>
            <select
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              {...regAssign("subjectId")}
            >
              <option value="">Select a subject</option>
              {(subjects as Subject[]).map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
            {assignErrors.subjectId && <p className="text-xs text-meta-1">{assignErrors.subjectId.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-black dark:text-white">Lecturer</label>
            <select
              className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              {...regAssign("lecturerId")}
            >
              <option value="">Select a lecturer</option>
              {(lecturers as AuthUser[]).map((l) => (
                <option key={l._id} value={l._id}>{l.fullName}</option>
              ))}
            </select>
            {assignErrors.lecturerId && <p className="text-xs text-meta-1">{assignErrors.lecturerId.message}</p>}
          </div>
          {formError && <p className="rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button type="submit" isLoading={assignMutation.isPending}>Assign</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
