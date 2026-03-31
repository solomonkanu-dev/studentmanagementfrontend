"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function SuspendedPage() {
  const { logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-whiten dark:bg-boxdark-2 px-4">
      <div className="w-full max-w-md rounded-xl border border-stroke bg-white p-8 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="mb-6 flex justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
            <svg
              className="h-8 w-8 text-danger"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </span>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-black dark:text-white">
          Account Suspended
        </h1>

        <p className="mb-2 text-body dark:text-bodydark">
          Your account has been suspended by the administrator.
        </p>

        <p className="mb-8 text-sm text-body dark:text-bodydark">
          Please contact your institution&apos;s administrator to resolve this
          issue and regain access.
        </p>

        <button
          onClick={handleLogout}
          className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
