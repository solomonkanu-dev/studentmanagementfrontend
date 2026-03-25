"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { subjectApi } from "@/lib/api/subject";
import CardDataStats from "@/components/ui/CardDataStats";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import {
  BookOpen,
  UserCheck,
  UserX,
  ArrowRight,
} from "lucide-react";
import type { Subject, Class } from "@/lib/types";

export default function SubjectsOverview() {
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: subjectApi.getAll,
  });

  const total = subjects.length;
  const assigned = subjects.filter(
    (s: Subject) => s.lecturer != null
  ).length;
  const unassigned = total - assigned;

  const getClassName = (classField: string | Class) =>
    typeof classField === "object" ? classField.name : "—";

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardDataStats
          title="Total Subjects"
          total={String(total)}
          rate=""
          levelUp
        >
          <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Lecturer Assigned"
          total={String(assigned)}
          rate=""
          levelUp
        >
          <UserCheck className="h-6 w-6 text-meta-3" aria-hidden="true" />
        </CardDataStats>
        <CardDataStats
          title="Unassigned"
          total={String(unassigned)}
          rate=""
          levelUp={false}
        >
          <UserX className="h-6 w-6 text-meta-1" aria-hidden="true" />
        </CardDataStats>
      </div>

      {/* Subject table with assignment status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black dark:text-white">
              All Subjects
            </h2>
            <Link
              href="/admin/subjects/list"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Manage subjects
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {subjects.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <BookOpen className="h-8 w-8 text-body" aria-hidden="true" />
              <p className="text-sm text-body">No subjects created yet.</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th>Subject</Th>
                  <Th>Code</Th>
                  <Th>Class</Th>
                  <Th>Lecturer</Th>
                </tr>
              </TableHead>
              <TableBody>
                {subjects.map((s: Subject) => (
                  <tr
                    key={s._id}
                    className="hover:bg-whiter transition-colors dark:hover:bg-meta-4"
                  >
                    <Td className="font-medium text-black dark:text-white">
                      {s.name}
                    </Td>
                    <Td className="font-mono text-xs text-body">
                      {s.code ?? "—"}
                    </Td>
                    <Td className="text-body">{getClassName(s.class)}</Td>
                    <Td>
                      {s.lecturer ? (
                        <Badge variant="success">Assigned</Badge>
                      ) : (
                        <Badge variant="warning">Unassigned</Badge>
                      )}
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
