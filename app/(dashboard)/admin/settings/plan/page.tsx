"use client";

import { useQuery } from "@tanstack/react-query";
import { planApi } from "@/lib/api/plan";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreditCard, Users, GraduationCap, School } from "lucide-react";

export default function MyPlanPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-plan"],
    queryFn: planApi.getMyPlan,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
          <CreditCard className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-black dark:text-white">No plan assigned.</p>
        <p className="text-xs text-body">Contact your super admin to assign a plan to your institute.</p>
      </div>
    );
  }

  const plan = data.plan;

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-black dark:text-white">Current Plan</h2>
            </div>
            <Badge variant="success">{plan.name.toLocaleUpperCase()}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plan.description && (
              <p className="text-sm text-body">{plan.description}</p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-stroke p-4 dark:border-strokedark">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-xs font-medium text-body">Students</span>
                </div>
                <p className="text-xl font-bold text-black dark:text-white">{plan.limits?.maxStudents}</p>
                <p className="text-xs text-body">max allowed</p>
              </div>
              <div className="rounded-md border border-stroke p-4 dark:border-strokedark">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-xs font-medium text-body">Lecturers</span>
                </div>
                <p className="text-xl font-bold text-black dark:text-white">{plan.limits?.maxLecturers}</p>
                <p className="text-xs text-body">max allowed</p>
              </div>
              <div className="rounded-md border border-stroke p-4 dark:border-strokedark">
                <div className="flex items-center gap-2 mb-2">
                  <School className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-xs font-medium text-body">Classes</span>
                </div>
                <p className="text-xl font-bold text-black dark:text-white">{plan.limits?.maxClasses}</p>
                <p className="text-xs text-body">max allowed</p>
              </div>
            </div>

            {plan.price != null && (
              <div className="border-t border-stroke pt-4 dark:border-strokedark">
                <p className="text-sm text-body">
                  Plan price: <span className="font-semibold text-black dark:text-white">Nle {plan.price}</span>
                </p>
              </div>
            )}

            {data.assignedAt && (
              <p className="text-xs text-body">
                Assigned on {new Date(data.assignedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
