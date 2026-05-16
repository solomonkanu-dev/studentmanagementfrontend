"use client";

import { ModuleGuard } from "@/components/ui/ModuleGuard";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feesApi } from "@/lib/api/fees";
import { adminApi } from "@/lib/api/admin";
import { termApi } from "@/lib/api/term";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableBody, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Plus, Trash2, Users, User, Building2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { exportApi } from "@/lib/api/export";
import type { FeeStructure, AuthUser, Class, AcademicTerm } from "@/lib/types";
import { StudentPaymentsTab } from "@/components/admin/fees/StudentPaymentsTab";
import { CreateStructureModal } from "@/components/admin/fees/CreateStructureModal";
import { AssignClassModal } from "@/components/admin/fees/AssignClassModal";
import { AssignAllStudentsModal } from "@/components/admin/fees/AssignAllStudentsModal";
import { AssignStudentModal } from "@/components/admin/fees/AssignStudentModal";
import { termLabel, categoryLabel } from "@/components/admin/fees/shared";

// ─── Main page ────────────────────────────────────────────────────────────────

function FeesPageInner() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"structures" | "payments">("structures");
  const [showCreate, setShowCreate] = useState(false);
  const [showAssignClass, setShowAssignClass] = useState(false);
  const [showAssignAll, setShowAssignAll] = useState(false);
  const [showAssignStudent, setShowAssignStudent] = useState(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [termFilter, setTermFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [structuresPage, setStructuresPage] = useState(1);

  const { data: structures = [], isLoading } = useQuery({
    queryKey: ["fee-structures"],
    queryFn: feesApi.getStructures,
  });

  const { data: terms = [] } = useQuery({
    queryKey: ["academic-terms"],
    queryFn: termApi.getAll,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["admin-classes"],
    queryFn: adminApi.getClasses,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-students"],
    queryFn: adminApi.getStudents,
  });

  const deleteMutation = useMutation({
    mutationFn: feesApi.deleteStructure,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fee-structures"] }),
  });

  const allStructures = structures as FeeStructure[];
  const uniqueYears = [...new Set((terms as AcademicTerm[]).map((t) => t.academicYear))].sort().reverse();

  const displayedStructures = allStructures
    .filter((s) => (showUnassignedOnly ? !s.isAssigned : true))
    .filter((s) => {
      if (!termFilter) return true;
      if (termFilter === "__none__") return !s.termId;
      const id = typeof s.termId === "object" && s.termId ? s.termId._id : s.termId;
      return id === termFilter;
    })
    .filter((s) => {
      if (!yearFilter) return true;
      const termObj = typeof s.termId === "object" && s.termId ? s.termId : null;
      return termObj?.academicYear === yearFilter;
    });

  const STRUCTURES_PAGE_SIZE = 10;
  const structuresTotalPages = Math.max(1, Math.ceil(displayedStructures.length / STRUCTURES_PAGE_SIZE));
  const structuresSafePage = Math.min(structuresPage, structuresTotalPages);
  const paginatedStructures = displayedStructures.slice(
    (structuresSafePage - 1) * STRUCTURES_PAGE_SIZE,
    structuresSafePage * STRUCTURES_PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-stroke dark:border-strokedark">
        <button
          onClick={() => setActiveTab("structures")}
          className={`px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "structures"
              ? "border-b-2 border-primary text-primary"
              : "text-body hover:text-black dark:hover:text-white"
          }`}
        >
          Fee Structures
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === "payments"
              ? "border-b-2 border-primary text-primary"
              : "text-body hover:text-black dark:hover:text-white"
          }`}
        >
          Student Payments
        </button>
      </div>

      {activeTab === "structures" && (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-sm text-body">
                {displayedStructures.length}{showUnassignedOnly ? "" : ` of ${allStructures.length}`} fee structure{displayedStructures.length !== 1 ? "s" : ""}
                {showUnassignedOnly && <span className="ml-1 text-xs">(unassigned)</span>}
              </p>
              <button
                onClick={() => { setShowUnassignedOnly((v) => !v); setStructuresPage(1); }}
                className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                  showUnassignedOnly
                    ? "border-primary bg-primary text-white"
                    : "border-stroke text-body hover:border-primary hover:text-primary dark:border-strokedark"
                }`}
              >
                {showUnassignedOnly ? "Show All" : "Unassigned Only"}
              </button>
              <select
                value={termFilter}
                onChange={(e) => { setTermFilter(e.target.value); setStructuresPage(1); }}
                className="h-8 rounded border border-stroke bg-transparent px-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
              >
                <option value="">All terms</option>
                {(terms as AcademicTerm[])
                  .sort((a, b) => b.academicYear.localeCompare(a.academicYear))
                  .map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} — {t.academicYear}
                    </option>
                  ))}
                <option value="__none__">No term assigned</option>
              </select>
              {uniqueYears.length > 0 && (
                <select
                  value={yearFilter}
                  onChange={(e) => { setYearFilter(e.target.value); setTermFilter(""); setStructuresPage(1); }}
                  className="h-8 rounded border border-stroke bg-transparent px-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white"
                >
                  <option value="">All years</option>
                  {uniqueYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setShowAssignClass(true)}>
                <Building2 className="h-4 w-4" aria-hidden="true" /> Assign to Class
              </Button>
              <Button variant="secondary" onClick={() => setShowAssignAll(true)}>
                <Users className="h-4 w-4" aria-hidden="true" /> Assign to All Students
              </Button>
              <Button variant="secondary" onClick={() => setShowAssignStudent(true)}>
                <User className="h-4 w-4" aria-hidden="true" /> Assign to Student
              </Button>
              <Button variant="ghost" onClick={() => exportApi.feeCollection()}>
                <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
              </Button>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" /> New Structure
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            ) : (
              <Table>
                <TableHead>
                  <tr>
                    <Th>Category</Th>
                    <Th>Particulars</Th>
                    <Th>Total</Th>
                    <Th>Term</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th>Actions</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {displayedStructures.length === 0 ? (
                    <tr>
                      <Td colSpan={7} className="py-10 text-center text-body">
                        {showUnassignedOnly ? "All fee structures have been assigned." : "No fee structures yet."}
                      </Td>
                    </tr>
                  ) : (
                    paginatedStructures.map((f) => (
                      <tr key={f._id} className="hover:bg-meta-2 transition-colors dark:hover:bg-meta-4">
                        <Td>
                          <Badge variant={f.category === "all" ? "info" : f.category === "class" ? "warning" : "default"}>
                            {categoryLabel(f)}
                          </Badge>
                        </Td>
                        <Td className="text-body text-xs">
                          {f.particulars.map((p) => `${p.label} (Nle${p.amount})`).join(", ")}
                        </Td>
                        <Td>
                          <span className="font-semibold text-black dark:text-white">
                            Nle{f.totalAmount.toLocaleString()}
                          </span>
                        </Td>
                        <Td className="text-body text-xs">{termLabel(f)}</Td>
                        <Td>
                          {f.isAssigned === true ? (
                            <Badge variant="success">Assigned</Badge>
                          ) : f.isAssigned === false ? (
                            <Badge variant="warning">Unassigned</Badge>
                          ) : null}
                        </Td>
                        <Td className="text-body text-xs">
                          {new Date(f.createdAt).toLocaleDateString()}
                        </Td>
                        <Td>
                          <button
                            onClick={() => deleteMutation.mutate(f._id)}
                            className="rounded p-1 text-body hover:text-meta-1 hover:bg-meta-1/10 transition-colors"
                            aria-label="Delete fee structure"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </Td>
                      </tr>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
            {displayedStructures.length > STRUCTURES_PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-stroke px-5 py-3 dark:border-strokedark">
                <p className="text-xs text-body">
                  {(structuresSafePage - 1) * STRUCTURES_PAGE_SIZE + 1}–{Math.min(structuresSafePage * STRUCTURES_PAGE_SIZE, displayedStructures.length)} of {displayedStructures.length} structures
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setStructuresPage((p) => Math.max(1, p - 1))}
                    disabled={structuresSafePage === 1}
                    className="rounded p-1.5 text-body transition-colors hover:bg-meta-2 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-meta-4"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-xs text-black dark:text-white">{structuresSafePage} / {structuresTotalPages}</span>
                  <button
                    type="button"
                    onClick={() => setStructuresPage((p) => Math.min(structuresTotalPages, p + 1))}
                    disabled={structuresSafePage === structuresTotalPages}
                    className="rounded p-1.5 text-body transition-colors hover:bg-meta-2 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-meta-4"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Modals */}
          <CreateStructureModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            classes={classes as Class[]}
            students={students as AuthUser[]}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["fee-structures"] })}
          />
          <AssignClassModal
            open={showAssignClass}
            onClose={() => setShowAssignClass(false)}
            classes={classes as Class[]}
            structures={structures as FeeStructure[]}
            onAssigned={() => queryClient.invalidateQueries({ queryKey: ["fee-structures"] })}
          />
          <AssignAllStudentsModal
            open={showAssignAll}
            onClose={() => setShowAssignAll(false)}
            students={students as AuthUser[]}
            onAssigned={() => queryClient.invalidateQueries({ queryKey: ["fee-structures"] })}
          />
          <AssignStudentModal
            open={showAssignStudent}
            onClose={() => setShowAssignStudent(false)}
            students={students as AuthUser[]}
            onAssigned={() => queryClient.invalidateQueries({ queryKey: ["fee-structures"] })}
          />
        </>
      )}

      {activeTab === "payments" && (
        <StudentPaymentsTab classes={classes as Class[]} />
      )}
    </div>
  );
}

export default function FeesPage() {
  return <ModuleGuard moduleKey="fees"><FeesPageInner /></ModuleGuard>;
}
