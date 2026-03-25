"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import type { Assignment, Subject } from "@/lib/types";

export default function AssignmentsPage() {
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: adminApi.getAssignments,
  });

  const getSubjectName = (subject: string | Subject) =>
    typeof subject === "object" ? subject.name : subject;

  return (
    <Card>
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        </div>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <Th>Title</Th>
              <Th>Subject</Th>
              <Th>Due Date</Th>
              <Th>Created</Th>
            </tr>
          </TableHead>
          <TableBody>
            {assignments.length === 0 ? (
              <tr>
                <Td colSpan={4} className="py-10 text-center text-slate-400">
                  No assignments yet.
                </Td>
              </tr>
            ) : (
              assignments.map((a: Assignment) => (
                <tr key={a._id} className="hover:bg-slate-50 transition-colors">
                  <Td className="font-medium text-slate-900">{a.title}</Td>
                  <Td className="text-slate-500">{getSubjectName(a.subject)}</Td>
                  <Td className="text-slate-500 text-xs">
                    {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "—"}
                  </Td>
                  <Td className="text-slate-400 text-xs">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </Td>
                </tr>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
