"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { usePageTitle } from "@/context/PageTitleContext";

/** Role segments that head every dashboard route — all map to "Dashboard". */
const ROLE_SEGMENTS = new Set(["super-admin", "admin", "lecturer", "student", "parent"]);

/**
 * Intermediate segments that have no page of their own (only nested children).
 * These are rendered as plain text, never as links.
 */
const NON_ROUTABLE = new Set(["settings"]);

/** Explicit labels for segments that title-casing would mangle. */
const SEGMENT_LABELS: Record<string, string> = {
  "academic-calendar": "Academic Calendar",
  "ai-agent": "AI Agent",
  "ai-analytics": "AI Analytics",
  "audit-logs": "Audit Logs",
  "financial-records": "Financial Records",
  "id-cards": "ID Cards",
  "report-card": "Report Card",
  "report-cards": "Report Cards",
  "full-receipt": "Receipt",
  "notification-preferences": "Notification Preferences",
  "rating-traits": "Rating Traits",
  list: "All",
};

/** Generic detail-page labels keyed by the parent collection segment. */
const DETAIL_LABELS: Record<string, string> = {
  students: "Student Details",
  lecturers: "Lecturer Details",
  gallery: "Album",
};

const OBJECT_ID = /^[0-9a-f]{24}$/i;

function isDynamicSegment(segment: string): boolean {
  return OBJECT_ID.test(segment) || /^\d+$/.test(segment);
}

function titleCase(segment: string): string {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelFor(segment: string, parent: string | null): string {
  if (isDynamicSegment(segment)) {
    return (parent && DETAIL_LABELS[parent]) ?? "Details";
  }
  return SEGMENT_LABELS[segment] ?? titleCase(segment);
}

interface Crumb {
  label: string;
  href: string | null;
}

/**
 * Breadcrumb trail derived automatically from the current pathname.
 * Rendered once in the dashboard layout — every protected page gets it for free.
 * The role root is shown as "Dashboard"; the final crumb is the current page
 * and uses the PageTitleContext title when a page sets one (e.g. a student name).
 */
export default function PageBreadcrumb() {
  const pathname = usePathname();
  const { title: contextTitle } = usePageTitle();

  const segments = pathname.split("/").filter(Boolean);

  // Root dashboard pages (e.g. /admin) need no breadcrumb.
  if (segments.length <= 1 || !ROLE_SEGMENTS.has(segments[0])) {
    return null;
  }

  const crumbs: Crumb[] = [];
  const role = segments[0];

  crumbs.push({ label: "Dashboard", href: `/${role}` });

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;
    const parent = segments[i - 1] ?? null;
    const href = `/${segments.slice(0, i + 1).join("/")}`;

    let label = labelFor(segment, parent);
    if (isLast && contextTitle) label = contextTitle;

    crumbs.push({
      label,
      href: isLast || NON_ROUTABLE.has(segment) ? null : href,
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-body"
                  aria-hidden="true"
                />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="flex items-center gap-1 text-body transition-colors hover:text-primary"
                >
                  {index === 0 && <Home className="h-3.5 w-3.5" aria-hidden="true" />}
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast
                      ? "flex items-center gap-1 font-medium text-black dark:text-white"
                      : "flex items-center gap-1 text-body"
                  }
                  aria-current={isLast ? "page" : undefined}
                >
                  {index === 0 && <Home className="h-3.5 w-3.5" aria-hidden="true" />}
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
