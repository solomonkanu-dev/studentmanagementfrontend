"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { SchoolProfileCard } from "@/components/institute/SchoolProfileCard";
import { Building2 } from "lucide-react";

export default function StudentSchoolPage() {
  const { data: institute, isLoading } = useQuery({
    queryKey: ["institute-profile"],
    queryFn: adminApi.getInstituteProfile,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!institute) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 className="mb-3 h-10 w-10 text-body" aria-hidden="true" />
        <p className="text-sm text-body">No school profile has been set up yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <SchoolProfileCard institute={institute} />
    </div>
  );
}
