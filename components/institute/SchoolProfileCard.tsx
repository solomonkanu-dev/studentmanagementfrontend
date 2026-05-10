"use client";

import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Flag,
  Target,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { Institute } from "@/lib/types";

export function SchoolProfileCard({ institute }: { institute: Institute }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          {institute.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={institute.logo}
              alt={institute.name}
              className="h-16 w-16 shrink-0 rounded-lg border border-stroke object-cover dark:border-strokedark"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-meta-2 dark:bg-meta-4">
              <Building2 className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-black dark:text-white">
              {institute.name}
            </h2>
            {institute.targetLine && (
              <p className="mt-0.5 text-sm italic text-body">
                &ldquo;{institute.targetLine}&rdquo;
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="border-t border-stroke dark:border-strokedark" />

        {institute.mission && (
          <div className="rounded-md border border-stroke bg-whiter px-4 py-3 dark:border-strokedark dark:bg-meta-4">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-body">
                  Our Mission
                </p>
                <p className="mt-1 text-sm text-black dark:text-white">{institute.mission}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow icon={MapPin} label="Address" value={institute.address} />
          <InfoRow icon={Phone} label="Phone" value={institute.phoneNumber} />
          {institute.email && (
            <InfoRow icon={Mail} label="Email" value={institute.email} />
          )}
          {institute.website && (
            <InfoRow icon={Globe} label="Website" value={institute.website} />
          )}
          {institute.country && (
            <InfoRow icon={Flag} label="Country" value={institute.country} />
          )}
          {institute.founded && (
            <InfoRow icon={CalendarDays} label="Founded" value={institute.founded} />
          )}
          {institute.targetLine && (
            <InfoRow icon={Target} label="Tagline" value={institute.targetLine} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-meta-2 dark:bg-meta-4">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-[10px] uppercase tracking-wide text-body">{label}</p>
        <p className="truncate text-sm font-medium text-black dark:text-white">{value}</p>
      </div>
    </div>
  );
}
