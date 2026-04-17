"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Plus, Pencil, Trash2, CheckCircle2, ChevronDown } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { subjectApi } from "@/lib/api/subject";
import { examApi } from "@/lib/api/exam";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import type { AcademicTerm } from "@/lib/api/admin";
import type { Class, Subject, Exam } from "@/lib/types";
import { errMsg } from "@/lib/utils/errMsg";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const selectCls =
  "h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary";

function statusVariant(status: Exam["status"]): "info" | "warning" | "success" {
  if (status === "upcoming")  return "info";
  if (status === "ongoing")   return "warning";
  return "success";
}

function examTypeLabel(type: Exam["examType"]) {
  return { written: "Written", oral: "Oral", practical: "Practical", test: "Class Test" }[type] ?? type;
}

function getSubjectName(s: Exam["subject"]) {
  return typeof s === "object" ? s.name : "—";
}
function getClassName(c: Exam["class"]) {
  return typeof c === "object" ? c.name : "—";
}
function getTermName(t: Exam["term"]) {
  return typeof t === "object" ? `${t.name} (${t.academicYear})` : "—";
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
      <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${w}%` }} />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ClipboardCheck size={40} className="mb-3 text-gray-300 dark:text-gray-600" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

// ─── Exam Schedule Tab ─────────────────────────────────────────────────────────

function ExamScheduleTab() {
  const qc = useQueryClient();

  const [filterTerm, setFilterTerm]   = useState("");
  const [filterClass, setFilterClass] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Exam | null>(null);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", termId: "", classId: "", subjectId: "",
    date: "", startTime: "", endTime: "",
    examType: "written" as Exam["examType"],
    totalMarks: "100", venue: "", instructions: "",
  });

  const { data: terms = [] }   = useQuery({ queryKey: ["admin-terms"],   queryFn: adminApi.getTerms });
  const { data: classes = [] } = useQuery({ queryKey: ["admin-classes"], queryFn: adminApi.getClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"],     queryFn: subjectApi.getAll });

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["admin-exams", filterTerm, filterClass],
    queryFn: () => examApi.getAll({
      termId:  filterTerm  || undefined,
      classId: filterClass || undefined,
    }),
    enabled: !!filterTerm,
  });

  const classSubjects = (subjects as Subject[]).filter((s) => {
    const classId = typeof s.class === "object" ? s.class._id : s.class;
    return classId === form.classId;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", termId: filterTerm, classId: filterClass, subjectId: "", date: "", startTime: "", endTime: "", examType: "written", totalMarks: "100", venue: "", instructions: "" });
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (exam: Exam) => {
    setEditing(exam);
    setForm({
      title: exam.title,
      termId: typeof exam.term === "object" ? exam.term._id : exam.term,
      classId: typeof exam.class === "object" ? exam.class._id : exam.class,
      subjectId: typeof exam.subject === "object" ? exam.subject._id : exam.subject,
      date: exam.date.slice(0, 10),
      startTime: exam.startTime,
      endTime: exam.endTime,
      examType: exam.examType,
      totalMarks: String(exam.totalMarks),
      venue: exam.venue,
      instructions: exam.instructions,
    });
    setFormError("");
    setShowModal(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title, subjectId: form.subjectId, classId: form.classId,
        termId: form.termId, date: form.date, startTime: form.startTime,
        endTime: form.endTime, examType: form.examType,
        totalMarks: Number(form.totalMarks), venue: form.venue, instructions: form.instructions,
      };
      if (editing) return examApi.update(editing._id, payload);
      return examApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-exams"] });
      setShowModal(false);
    },
    onError: (err: unknown) => setFormError(errMsg(err, "Failed to save exam")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => examApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-exams"] }),
  });

  const field = (key: keyof typeof form) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  );

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className={selectCls + " max-w-[200px]"} value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
          <option value="">All Terms</option>
          {(terms as AcademicTerm[]).map((t) => (
            <option key={t._id} value={t._id}>{t.name} ({t.academicYear})</option>
          ))}
        </select>
        <select className={selectCls + " max-w-[200px]"} value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {(classes as Class[]).map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <Button onClick={openCreate} className="ml-auto flex items-center gap-2">
          <Plus size={15} /> Add Exam
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
        {!filterTerm ? (
          <EmptyState message="Select a term above to see the exam schedule." />
        ) : isLoading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : exams.length === 0 ? (
          <EmptyState message="No exams scheduled for the selected filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <tr>
                  <Th>Title</Th>
                  <Th>Subject</Th>
                  <Th>Class</Th>
                  <Th>Date</Th>
                  <Th>Time</Th>
                  <Th>Type</Th>
                  <Th>Venue</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </TableHead>
              <TableBody>
                {(exams as Exam[]).map((exam) => (
                  <tr key={exam._id} className="hover:bg-whiter dark:hover:bg-meta-4 transition-colors">
                    <Td className="font-medium text-black dark:text-white">{exam.title}</Td>
                    <Td>{getSubjectName(exam.subject)}</Td>
                    <Td>{getClassName(exam.class)}</Td>
                    <Td className="whitespace-nowrap">{new Date(exam.date).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}</Td>
                    <Td className="whitespace-nowrap">{exam.startTime} – {exam.endTime}</Td>
                    <Td><Badge variant="default">{examTypeLabel(exam.examType)}</Badge></Td>
                    <Td>{exam.venue || "—"}</Td>
                    <Td><Badge variant={statusVariant(exam.status)}>{exam.status}</Badge></Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(exam)} className="text-gray-400 hover:text-primary transition-colors"><Pencil size={15} /></button>
                        <button
                          onClick={() => setConfirmDeleteId(exam._id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        ><Trash2 size={15} /></button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-boxdark">
            <p className="mb-4 text-sm font-medium text-black dark:text-white">Delete this exam? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => { deleteMutation.mutate(confirmDeleteId); setConfirmDeleteId(null); }}
              >Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal open={showModal} title={editing ? "Edit Exam" : "Add Exam"} onClose={() => setShowModal(false)}>
          <div className="space-y-4 px-5 py-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-black dark:text-white">Title</label>
              <Input value={form.title} onChange={field("title")} placeholder="e.g. Mid-term Mathematics Exam" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-black dark:text-white">Term</label>
                <select className={selectCls} value={form.termId} onChange={field("termId")}>
                  <option value="">Select term</option>
                  {(terms as AcademicTerm[]).map((t) => (
                    <option key={t._id} value={t._id}>{t.name} ({t.academicYear})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-black dark:text-white">Class</label>
                <select className={selectCls} value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value, subjectId: "" }))}>
                  <option value="">Select class</option>
                  {(classes as Class[]).map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black dark:text-white">Subject</label>
              <select className={selectCls} value={form.subjectId} onChange={field("subjectId")}>
                <option value="">Select subject</option>
                {classSubjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
              {form.classId && classSubjects.length === 0 && (
                <p className="mt-1 text-xs text-amber-500">No subjects found for the selected class.</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black dark:text-white">Date</label>
              <Input type="date" value={form.date} onChange={field("date")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-black dark:text-white">Start Time</label>
                <Input type="time" value={form.startTime} onChange={field("startTime")} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-black dark:text-white">End Time</label>
                <Input type="time" value={form.endTime} onChange={field("endTime")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-black dark:text-white">Exam Type</label>
                <select className={selectCls} value={form.examType} onChange={field("examType")}>
                  <option value="written">Written</option>
                  <option value="oral">Oral</option>
                  <option value="practical">Practical</option>
                  <option value="test">Class Test</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-black dark:text-white">Total Marks</label>
                <Input type="number" value={form.totalMarks} onChange={field("totalMarks")} min="1" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black dark:text-white">Venue <span className="text-gray-400">(optional)</span></label>
              <Input value={form.venue} onChange={field("venue")} placeholder="e.g. Hall A, Room 12" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black dark:text-white">Instructions <span className="text-gray-400">(optional)</span></label>
              <textarea
                value={form.instructions}
                onChange={field("instructions")}
                rows={3}
                placeholder="e.g. Bring a calculator. No phones allowed."
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
              />
            </div>
            {formError && <p className="text-xs text-red-500">{formError}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.title || !form.subjectId || !form.classId || !form.termId || !form.date || !form.startTime || !form.endTime}
              >
                {saveMutation.isPending ? "Saving…" : editing ? "Save Changes" : "Create Exam"}
              </Button>
            </div>
          </div>
        </Modal>
    </div>
  );
}

// ─── Publish Results Tab ───────────────────────────────────────────────────────

function PublishResultsTab() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");
  const [termId, setTermId]   = useState("");

  const { data: terms = [] }   = useQuery({ queryKey: ["admin-terms"],   queryFn: adminApi.getTerms });
  const { data: classes = [] } = useQuery({ queryKey: ["admin-classes"], queryFn: adminApi.getClasses });

  const statusQuery = useQuery({
    queryKey: ["publish-status", classId, termId],
    queryFn: () => adminApi.getResultPublishStatus(classId, termId),
    enabled: !!classId && !!termId,
  });

  const publishMutation = useMutation({
    mutationFn: () => adminApi.publishResults(classId, termId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publish-status", classId, termId] }),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => adminApi.unpublishResults(classId, termId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publish-status", classId, termId] }),
  });

  const status = statusQuery.data;
  const allPublished = !!status && status.total > 0 && status.published === status.total;
  const pct = status && status.total > 0 ? Math.round((status.published / status.total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <select className={selectCls + " max-w-[200px]"} value={termId} onChange={(e) => setTermId(e.target.value)}>
          <option value="">Select Term</option>
          {(terms as AcademicTerm[]).map((t) => (
            <option key={t._id} value={t._id}>{t.name} ({t.academicYear})</option>
          ))}
        </select>
        <select className={selectCls + " max-w-[200px]"} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select Class</option>
          {(classes as Class[]).map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Hint when not selected */}
      {(!classId || !termId) && (
        <div className="rounded-xl border border-stroke bg-white p-8 text-center dark:border-strokedark dark:bg-boxdark">
          <ChevronDown size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Select a term and class to manage result visibility.</p>
        </div>
      )}

      {/* Status card */}
      {classId && termId && (
        <div className="rounded-xl border border-stroke bg-white p-6 dark:border-strokedark dark:bg-boxdark">
          {statusQuery.isLoading ? (
            <div className="flex justify-center py-8"><div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : status ? (
            <div className="space-y-5">
              {/* Counts */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-body dark:text-bodydark">Published</p>
                  <p className="mt-1 text-3xl font-bold text-black dark:text-white">
                    {status.published} <span className="text-lg font-normal text-body dark:text-bodydark">/ {status.total}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-body dark:text-bodydark">{pct}% of results are visible to students</p>
                </div>
                {allPublished && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-meta-3">
                    <CheckCircle2 size={18} /> All Published
                  </div>
                )}
              </div>

              <ProgressBar value={status.published} max={status.total} />

              {/* Warning */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
                Once published, students and parents will immediately see these results.
              </div>

              {status.total === 0 && (
                <p className="text-center text-sm text-body dark:text-bodydark">No results have been entered for this class and term yet.</p>
              )}

              {/* Actions */}
              {status.total > 0 && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => publishMutation.mutate()}
                    disabled={allPublished || publishMutation.isPending}
                  >
                    {publishMutation.isPending ? "Publishing…" : allPublished ? "All Published" : "Publish All Results"}
                  </Button>
                  {status.published > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() => unpublishMutation.mutate()}
                      disabled={unpublishMutation.isPending}
                    >
                      {unpublishMutation.isPending ? "Unpublishing…" : "Unpublish Results"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-body">Could not load status.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "schedule", label: "Exam Schedule" },
  { id: "publish",  label: "Publish Results" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AdminExamsPage() {
  const [tab, setTab] = useState<TabId>("schedule");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
          <ClipboardCheck size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">Exams</h1>
          <p className="text-sm text-body dark:text-bodydark">Schedule exams and control result visibility by term</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-hidden rounded-sm border border-stroke dark:border-strokedark">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 px-5 py-2.5 text-sm font-medium transition-colors ${
              tab === id
                ? "bg-primary text-white"
                : "bg-white text-body hover:bg-whiter dark:bg-boxdark dark:text-bodydark dark:hover:bg-meta-4"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "schedule" && <ExamScheduleTab />}
      {tab === "publish"  && <PublishResultsTab />}
    </div>
  );
}
