"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { classApi } from "@/lib/api/class";
import { adminApi } from "@/lib/api/admin";
import { subjectApi } from "@/lib/api/subject";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { Class, Subject, Result, AuthUser } from "@/lib/types";

export default function ResultsPage() {
  const [selectedClass, setSelectedClass] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [formError, setFormError] = useState("");
  const [markForm, setMarkForm] = useState({ studentId: "", subjectId: "", classId: "", marks: "" });

  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: classApi.getAll });
  const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: subjectApi.getAll });
  const { data: students = [] } = useQuery({ queryKey: ["admin-students"], queryFn: adminApi.getStudents });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["results-class", selectedClass],
    queryFn: () => adminApi.getResultsByClass(selectedClass),
    enabled: !!selectedClass,
  });

  const assignMutation = useMutation({
    mutationFn: adminApi.assignMarks,
    onSuccess: () => { setShowAssign(false); setMarkForm({ studentId: "", subjectId: "", classId: selectedClass, marks: "" }); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed";
      setFormError(msg);
    },
  });

  const getStudentName = (student: string | AuthUser) =>
    typeof student === "object" ? student.fullName : "—";
  const getSubjectName = (subject: string | Subject) =>
    typeof subject === "object" ? subject.name : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Filter by Class:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
          >
            <option value="">Select a class</option>
            {(classes as Class[]).map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <Button onClick={() => { setShowAssign(true); setMarkForm(f => ({ ...f, classId: selectedClass })); }}>
          Assign Marks
        </Button>
      </div>

      <Card>
        {!selectedClass ? (
          <CardContent>
            <p className="py-8 text-center text-sm text-slate-400">Select a class to view results.</p>
          </CardContent>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
          </div>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <Th>Student</Th>
                <Th>Subject</Th>
                <Th>Marks</Th>
                <Th>Grade</Th>
              </tr>
            </TableHead>
            <TableBody>
              {results.length === 0 ? (
                <tr><Td colSpan={4} className="py-10 text-center text-slate-400">No results found.</Td></tr>
              ) : (
                results.map((r: Result) => (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <Td className="font-medium text-slate-900">{getStudentName(r.student)}</Td>
                    <Td className="text-slate-500">{getSubjectName(r.subject)}</Td>
                    <Td className="font-semibold text-slate-900">{r.marksObtained}</Td>
                    <Td className="text-slate-500">{r.grade ?? "—"}</Td>
                  </tr>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal open={showAssign} onClose={() => { setShowAssign(false); setFormError(""); }} title="Assign Marks">
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Student</label>
            <select
              value={markForm.studentId}
              onChange={(e) => setMarkForm(f => ({ ...f, studentId: e.target.value }))}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
            >
              <option value="">Select student</option>
              {(students as AuthUser[]).map((s) => (
                <option key={s._id} value={s._id}>{s.fullName}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <select
              value={markForm.subjectId}
              onChange={(e) => setMarkForm(f => ({ ...f, subjectId: e.target.value }))}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
            >
              <option value="">Select subject</option>
              {(subjects as Subject[]).map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Marks"
            type="number"
            placeholder="85"
            value={markForm.marks}
            onChange={(e) => setMarkForm(f => ({ ...f, marks: e.target.value }))}
          />
          {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button
              isLoading={assignMutation.isPending}
              onClick={() => {
                setFormError("");
                assignMutation.mutate({
                  studentId: markForm.studentId,
                  subjectId: markForm.subjectId,
                  classId: markForm.classId,
                  marks: Number(markForm.marks),
                });
              }}
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
