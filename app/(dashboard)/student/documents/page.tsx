"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { studentApi } from "@/lib/api/student";
import { DocumentsPanel } from "@/components/documents/DocumentsPanel";
import type { DocStudent, DocInstitute } from "@/components/documents/DocumentsPanel";
import { FolderOpen } from "lucide-react";

export default function StudentDocumentsPage() {
  const { user } = useAuth();

  // Report card contains institute data + populated student class
  const { data: reportCard, isLoading: loadingCard } = useQuery({
    queryKey: ["student-report-card"],
    queryFn: studentApi.getMyReportCard,
    retry: 1,
  });

  // Promotion history contains currentClass with populated name
  const { data: promoHistory, isLoading: loadingPromo } = useQuery({
    queryKey: ["student-promotion-history"],
    queryFn: studentApi.getMyPromotionHistory,
    retry: 1,
  });

  const isLoading = loadingCard && loadingPromo;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  // Resolve class: prefer report card populated class, fall back to promotion history currentClass
  const resolvedClass =
    reportCard?.student.class ??
    promoHistory?.currentClass ??
    null;

  const studentData: DocStudent = {
    _id: user?._id ?? "",
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    class: resolvedClass,
    studentProfile: {
      registrationNumber: reportCard?.student.studentProfile?.registrationNumber,
      admissionDate: reportCard?.student.studentProfile?.admissionDate,
      gender: reportCard?.student.studentProfile?.gender,
    },
    lifecycleStatus: (user as { lifecycleStatus?: string })?.lifecycleStatus,
    createdAt: user?.createdAt ?? new Date().toISOString(),
    promotionHistory: promoHistory?.history?.map((h) => ({
      fromClass: h.fromClass,
      toClass: h.toClass,
      promotedAt: h.promotedAt,
    })),
  };

  const instituteData: DocInstitute | null = reportCard?.institute
    ? {
        name: reportCard.institute.name,
        address: reportCard.institute.address,
        phoneNumber: reportCard.institute.phoneNumber,
        email: reportCard.institute.email,
        logo: reportCard.institute.logo,
        website: reportCard.institute.website,
        targetLine: reportCard.institute.targetLine,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <FolderOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white">My Documents</h1>
          <p className="text-sm text-body">Download your official school documents</p>
        </div>
      </div>

      <DocumentsPanel student={studentData} institute={instituteData} />
    </div>
  );
}
