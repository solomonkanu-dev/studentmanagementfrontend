"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/api/attendance";
import { classApi } from "@/lib/api/class";
import { subjectApi } from "@/lib/api/subject";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { errMsg } from "@/lib/utils/errMsg";
import {
  Table,
  TableHead,
  TableBody,
  Th,
  Td,
} from "@/components/ui/Table";
import {
  CalendarCheck,
  GraduationCap,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  QrCode,
  ScanLine,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { Class, Subject, AuthUser, QRSessionStudent } from "@/lib/types";

type StudentStatus = "present" | "absent";
type TabMode = "manual" | "qr";

// ─── QR Scanner Component ─────────────────────────────────────────────────────

// How long (ms) to ignore re-scans of the same QR token
const TOKEN_COOLDOWN_MS = 5000;

type ScanResult = { type: "success" | "error" | "duplicate"; name: string } | null;

function QRScannerView({ classId, className }: { classId: string; className: string }) {
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerInstanceRef = useRef<any>(null);
  // Lock: true while an API call is in flight — drops all new decode callbacks
  const scanLockRef = useRef(false);
  // Per-token cooldown: token → timestamp of last successful scan
  const lastScannedRef = useRef<Map<string, number>>(new Map());

  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [scanLog, setScanLog] = useState<{ name: string; time: string; duplicate: boolean }[]>([]);
  const [finalized, setFinalized] = useState(false);
  const queryClient = useQueryClient();

  // Auto-dismiss feedback after 3 seconds
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(t);
  }, [feedback]);

  // Auto-clear scan overlay after 2 seconds
  useEffect(() => {
    if (!scanResult) return;
    const t = setTimeout(() => setScanResult(null), 2000);
    return () => clearTimeout(t);
  }, [scanResult]);

  const { data: session } = useQuery({
    queryKey: ["qr-session", classId],
    queryFn: () => attendanceApi.getQRSession(classId),
    refetchInterval: 8000,
  });

  const finalizeMutation = useMutation({
    mutationFn: () => attendanceApi.finalizeQR({ classId }),
    onSuccess: (data) => {
      setFinalized(true);
      setFeedback({ type: "success", message: `Finalized — ${data.present} present, ${data.absent} absent` });
      queryClient.invalidateQueries({ queryKey: ["qr-session", classId] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (err: unknown) => {
      setFeedback({ type: "error", message: errMsg(err, "Finalize failed") });
    },
  });

  useEffect(() => {
    const CONTAINER_ID = "qr-reader";
    let destroyed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let html5Qrcode: any = null;

    const container = document.getElementById(CONTAINER_ID);
    if (container) container.innerHTML = "";

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (destroyed) return;

      html5Qrcode = new Html5Qrcode(CONTAINER_ID);
      scannerInstanceRef.current = html5Qrcode;

      Html5Qrcode.getCameras()
        .then((cameras: { id: string; label: string }[]) => {
          if (destroyed || !cameras.length) return;

          const cam =
            cameras.find((c) => /back|rear|environment/i.test(c.label)) ??
            cameras[cameras.length - 1];

          return html5Qrcode.start(
            { deviceId: { exact: cam.id } },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (decodedText: string) => {
              // ── Lock: drop if another scan is in flight ──
              if (scanLockRef.current) return;

              // ── Per-token cooldown ──
              const now = Date.now();
              const lastScan = lastScannedRef.current.get(decodedText) ?? 0;
              if (now - lastScan < TOKEN_COOLDOWN_MS) return;

              scanLockRef.current = true;
              lastScannedRef.current.set(decodedText, now);

              try {
                const result = await attendanceApi.scanQR({ qrToken: decodedText, classId });
                const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                if (result.alreadyPresent) {
                  setFeedback({ type: "info", message: `${result.student.fullName} is already present` });
                  setScanResult({ type: "duplicate", name: result.student.fullName });
                  setScanLog((prev) => [{ name: result.student.fullName, time, duplicate: true }, ...prev]);
                } else {
                  setFeedback({ type: "success", message: `✓ ${result.student.fullName} marked present` });
                  setScanResult({ type: "success", name: result.student.fullName });
                  setScanLog((prev) => [{ name: result.student.fullName, time, duplicate: false }, ...prev]);
                  queryClient.invalidateQueries({ queryKey: ["qr-session", classId] });
                }
              } catch (err: unknown) {
                setScanResult({ type: "error", name: "" });
                setFeedback({ type: "error", message: errMsg(err, "Scan failed") });
                // On error reset cooldown so the same token can be retried
                lastScannedRef.current.delete(decodedText);
              } finally {
                scanLockRef.current = false;
              }
            },
            () => {}
          );
        })
        .catch(() => {
          setFeedback({ type: "error", message: "Could not access camera. Check browser permissions." });
        });
    });

    return () => {
      destroyed = true;
      const instance = scannerInstanceRef.current;
      if (instance) {
        instance
          .stop()
          .catch(() => {})
          .finally(() => {
            instance.clear();
            const el = document.getElementById(CONTAINER_ID);
            if (el) el.innerHTML = "";
            scannerInstanceRef.current = null;
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const presentCount = session?.students.filter((s) => s.status === "present").length ?? 0;
  const absentCount = session?.students.filter((s) => s.status === null).length ?? 0;

  const scannerBorderClass =
    scanResult?.type === "success" ? "border-meta-3 border-2" :
    scanResult?.type === "duplicate" ? "border-yellow-400 border-2" :
    scanResult?.type === "error" ? "border-meta-1 border-2" :
    "border-stroke dark:border-strokedark";

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-stroke bg-meta-3/10 p-3 text-center dark:border-strokedark">
          <p className="text-xl font-bold text-meta-3">{presentCount}</p>
          <p className="text-xs text-body">Scanned</p>
        </div>
        <div className="rounded-lg border border-stroke bg-meta-1/10 p-3 text-center dark:border-strokedark">
          <p className="text-xl font-bold text-meta-1">{absentCount}</p>
          <p className="text-xs text-body">Not yet</p>
        </div>
        <div className="rounded-lg border border-stroke p-3 text-center dark:border-strokedark">
          <p className="text-xl font-bold text-black dark:text-white">{session?.students.length ?? 0}</p>
          <p className="text-xs text-body">Total</p>
        </div>
      </div>

      {/* Feedback banner — auto-dismisses after 3s */}
      {feedback && (
        <div
          className={[
            "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium",
            feedback.type === "success" ? "bg-meta-3/15 text-meta-3" :
            feedback.type === "error" ? "bg-meta-1/15 text-meta-1" :
            "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
          ].join(" ")}
        >
          {feedback.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> :
           feedback.type === "error" ? <XCircle className="h-4 w-4 shrink-0" /> :
           <AlertCircle className="h-4 w-4 shrink-0" />}
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Camera scanner */}
        <div>
          <p className="mb-2 text-xs font-medium text-body">Point camera at student card</p>
          {/* Border color changes on each scan result */}
          <div className={`relative overflow-hidden rounded-xl border transition-colors duration-300 ${scannerBorderClass}`}>
            <div id="qr-reader" ref={scannerRef} />
            {/* Scan result overlay — fades out automatically */}
            {scanResult && (
              <div
                className={[
                  "absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-opacity-80 transition-opacity",
                  scanResult.type === "success" ? "bg-meta-3/80" :
                  scanResult.type === "duplicate" ? "bg-yellow-500/80" :
                  "bg-meta-1/80",
                ].join(" ")}
              >
                {scanResult.type === "success" && <CheckCircle className="h-10 w-10 text-white" />}
                {scanResult.type === "duplicate" && <AlertCircle className="h-10 w-10 text-white" />}
                {scanResult.type === "error" && <XCircle className="h-10 w-10 text-white" />}
                {scanResult.name && (
                  <p className="text-sm font-bold text-white text-center px-4">
                    {scanResult.type === "duplicate" ? "Already present" : scanResult.type === "success" ? "Marked present" : "Scan failed"}
                  </p>
                )}
                {scanResult.name && (
                  <p className="text-xs text-white/90 text-center px-4">{scanResult.name}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side: scan log + student list */}
        <div className="space-y-4">
          {/* Recent scans */}
          {scanLog.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-body">Recent scans</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {scanLog.map((entry, i) => (
                  <div
                    key={i}
                    className={[
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                      entry.duplicate ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-meta-3/10",
                    ].join(" ")}
                  >
                    <span className={["flex items-center gap-2 font-medium", entry.duplicate ? "text-yellow-700 dark:text-yellow-400" : "text-meta-3"].join(" ")}>
                      {entry.duplicate
                        ? <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        : <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                      {entry.name}
                      {entry.duplicate && <span className="text-[10px] font-normal opacity-75">(already present)</span>}
                    </span>
                    <span className="text-xs text-body">{entry.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full class status */}
          {session && (
            <div>
              <p className="mb-2 text-xs font-medium text-body">Class: {className}</p>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {session.students.map((s: QRSessionStudent) => (
                  <div
                    key={s._id}
                    className={[
                      "flex items-center justify-between rounded px-3 py-2 text-sm border",
                      s.status === "present"
                        ? "border-meta-3/30 bg-meta-3/5 dark:border-meta-3/20"
                        : "border-stroke dark:border-strokedark",
                    ].join(" ")}
                  >
                    <span className="text-black dark:text-white">{s.fullName}</span>
                    {s.status === "present" ? (
                      <span className="flex items-center gap-1 text-xs text-meta-3">
                        <CheckCircle className="h-3 w-3" /> Present
                      </span>
                    ) : s.status === "absent" ? (
                      <span className="flex items-center gap-1 text-xs text-meta-1">
                        <XCircle className="h-3 w-3" /> Absent
                      </span>
                    ) : (
                      <span className="text-xs text-body">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Finalize button */}
          {!finalized && (
            <Button
              onClick={() => finalizeMutation.mutate()}
              isLoading={finalizeMutation.isPending}
              className="w-full"
              variant="secondary"
            >
              <CalendarCheck className="h-4 w-4" />
              Finalize & Mark Absent
            </Button>
          )}
          {finalized && (
            <div className="flex items-center gap-2 rounded-lg bg-meta-3/10 px-3 py-2 text-sm text-meta-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Attendance finalized for today.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LecturerAttendancePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabMode>("manual");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [markDate, setMarkDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [statuses, setStatuses] = useState<Record<string, StudentStatus>>({});
  const [formError, setFormError] = useState("");

  // ── Data fetching ────────────────────────────────────────────────────────────

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["lecturer-classes"],
    queryFn: classApi.getForLecturer,
  });

  const { data: allSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["lecturer-subjects"],
    queryFn: subjectApi.getForLecturer,
  });

  const classSubjects = useMemo(
    () =>
      (allSubjects as Subject[]).filter((s) => {
        const classId =
          typeof s.class === "string" ? s.class : (s.class as Class)._id;
        return classId === selectedClass;
      }),
    [allSubjects, selectedClass]
  );

  const {
    data: attendanceData,
    isLoading: studentsLoading,
    isError: studentsError,
  } = useQuery({
    queryKey: ["attendance-students", selectedClass, selectedSubject],
    queryFn: () =>
      attendanceApi.getStudentsForAttendance(selectedClass, selectedSubject),
    enabled: !!selectedClass && !!selectedSubject && tab === "manual",
  });

  const students = attendanceData?.students ?? [];

  // Fetch already-saved attendance for the selected class + date
  const { data: existingAttendance } = useQuery({
    queryKey: ["attendance-existing", selectedClass, selectedSubject, markDate],
    queryFn: () => attendanceApi.getSubjectAttendance({ classId: selectedClass, date: markDate }),
    enabled: !!selectedClass && !!selectedSubject && tab === "manual",
  });

  // Pre-populate statuses from saved records whenever the query result changes
  useEffect(() => {
    const docs = Array.isArray(existingAttendance) ? existingAttendance : existingAttendance ? [existingAttendance] : [];
    const initial: Record<string, StudentStatus> = {};
    docs.forEach((doc: { records?: { student: { _id: string } | string; status: string }[] }) => {
      (doc.records ?? []).forEach((r) => {
        const id = typeof r.student === "string" ? r.student : r.student._id;
        initial[id] = r.status as StudentStatus;
      });
    });
    setStatuses(initial);
  }, [existingAttendance]);

  const stats = useMemo(() => {
    const vals = Object.values(statuses);
    return {
      total: students.length,
      present: vals.filter((v) => v === "present").length,
      absent: vals.filter((v) => v === "absent").length,
      unmarked: students.length - vals.length,
    };
  }, [statuses, students]);

  const setAll = (status: StudentStatus) => {
    const next: Record<string, StudentStatus> = {};
    (students as AuthUser[]).forEach((s) => {
      next[s._id] = status;
    });
    setStatuses(next);
  };

  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-existing", selectedClass, selectedSubject, markDate] });
      setFormError("");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to mark attendance. Please try again.";
      setFormError(msg);
    },
  });

  const submitAttendance = () => {
    if (!selectedClass || !selectedSubject || !markDate) return;
    setFormError("");
    const records = Object.entries(statuses).map(([studentId, status]) => ({
      studentId,
      status,
    }));
    if (records.length === 0) return;
    markMutation.mutate({
      classId: selectedClass,
      subjectId: selectedSubject,
      date: markDate,
      records,
    });
  };

  const selectedClassName = (classes as Class[]).find((c) => c._id === selectedClass)?.name ?? "";

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={selectedClass && tab === "manual" ? stats.total : "—"} icon={GraduationCap} />
        <StatCard label="Present" value={selectedClass && tab === "manual" ? stats.present : "—"} icon={UserCheck} />
        <StatCard label="Absent" value={selectedClass && tab === "manual" ? stats.absent : "—"} icon={UserX} />
        <StatCard label="Unmarked" value={selectedClass && tab === "manual" ? stats.unmarked : "—"} icon={Clock} />
      </div>

      <Card>
        <CardHeader>
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-stroke p-1 w-fit dark:border-strokedark">
            <button
              type="button"
              onClick={() => setTab("manual")}
              className={[
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "manual"
                  ? "bg-primary text-white"
                  : "text-body hover:text-black dark:hover:text-white",
              ].join(" ")}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              Manual
            </button>
            <button
              type="button"
              onClick={() => setTab("qr")}
              className={[
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "qr"
                  ? "bg-primary text-white"
                  : "text-body hover:text-black dark:hover:text-white",
              ].join(" ")}
            >
              <QrCode className="h-3.5 w-3.5" />
              QR Scanner
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Shared class selector */}
          <div className="mb-6 flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <label className="text-sm font-medium text-black dark:text-white">Class</label>
              {classesLoading ? (
                <div className="h-9 w-full animate-pulse rounded border border-stroke bg-stroke dark:border-strokedark dark:bg-strokedark" />
              ) : (
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSubject("");
                    setStatuses({});
                    setFormError("");
                  }}
                  className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                >
                  <option value="">Select a class</option>
                  {(classes as Class[]).map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Subject + Date — manual only */}
            {tab === "manual" && (
              <>
                <div className="flex flex-col gap-1.5 min-w-[180px]">
                  <label className="text-sm font-medium text-black dark:text-white">Subject</label>
                  {subjectsLoading ? (
                    <div className="h-9 w-full animate-pulse rounded border border-stroke bg-stroke dark:border-strokedark dark:bg-strokedark" />
                  ) : (
                    <select
                      value={selectedSubject}
                      onChange={(e) => { setSelectedSubject(e.target.value); setStatuses({}); setFormError(""); }}
                      disabled={!selectedClass}
                      className="h-9 w-full rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                    >
                      <option value="">
                        {selectedClass ? (classSubjects.length === 0 ? "No subjects" : "Select subject") : "Select class first"}
                      </option>
                      {classSubjects.map((s) => (
                        <option key={s._id} value={s._id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-black dark:text-white">Date</label>
                  <input
                    type="date"
                    value={markDate}
                    onChange={(e) => setMarkDate(e.target.value)}
                    className="h-9 rounded border border-stroke bg-transparent px-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                  />
                </div>
                {selectedClass && selectedSubject && students.length > 0 && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setAll("present")}>
                      <UserCheck className="h-3.5 w-3.5" /> All Present
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAll("absent")}>
                      <UserX className="h-3.5 w-3.5" /> All Absent
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── QR Tab Content ── */}
          {tab === "qr" && (
            <>
              {!selectedClass ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <ScanLine className="h-8 w-8 text-body" />
                  <p className="text-sm text-body">Select a class above to start scanning.</p>
                </div>
              ) : (
                <QRScannerView key={selectedClass} classId={selectedClass} className={selectedClassName} />
              )}
            </>
          )}

          {/* ── Manual Tab Content ── */}
          {tab === "manual" && (
            <>
              {!selectedClass || !selectedSubject ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <CalendarCheck className="h-8 w-8 text-body" />
                  <p className="text-sm text-body">Select a class and subject above to begin marking attendance.</p>
                </div>
              ) : studentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-stroke border-t-primary" />
                </div>
              ) : studentsError ? (
                <p className="py-12 text-center text-sm text-meta-1">Failed to load students. Please try again.</p>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <GraduationCap className="h-8 w-8 text-body" />
                  <p className="text-sm text-body">No students found in this class.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHead>
                      <tr>
                        <Th>Student</Th>
                        <Th>Email</Th>
                        <Th>Status</Th>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {(students as AuthUser[]).map((s) => {
                        const current = statuses[s._id];
                        return (
                          <tr key={s._id} className="hover:bg-whiter transition-colors dark:hover:bg-meta-4">
                            <Td>
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-meta-2 text-sm font-bold uppercase text-primary dark:bg-meta-4 dark:text-white">
                                  {s.fullName.charAt(0)}
                                </div>
                                <span className="font-medium text-black dark:text-white">{s.fullName}</span>
                              </div>
                            </Td>
                            <Td className="text-body">{s.email}</Td>
                            <Td>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setStatuses((prev) => ({ ...prev, [s._id]: "present" }))}
                                  className={["rounded-md px-3 py-1.5 text-xs font-medium transition-colors", current === "present" ? "bg-meta-3 text-white" : "border border-stroke text-body hover:bg-meta-3/10 hover:text-meta-3 dark:border-strokedark"].join(" ")}
                                >Present</button>
                                <button
                                  type="button"
                                  onClick={() => setStatuses((prev) => ({ ...prev, [s._id]: "absent" }))}
                                  className={["rounded-md px-3 py-1.5 text-xs font-medium transition-colors", current === "absent" ? "bg-meta-1 text-white" : "border border-stroke text-body hover:bg-meta-1/10 hover:text-meta-1 dark:border-strokedark"].join(" ")}
                                >Absent</button>
                              </div>
                            </Td>
                          </tr>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {markMutation.isSuccess && (
                    <div className="mt-4 flex items-center gap-2 rounded-md bg-meta-3/10 px-3 py-2 text-xs text-meta-3">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Attendance recorded successfully.
                    </div>
                  )}
                  {formError && (
                    <p className="mt-4 rounded-md bg-meta-1/10 px-3 py-2 text-xs text-meta-1">{formError}</p>
                  )}
                  <div className="mt-4 flex justify-end">
                    <Button onClick={submitAttendance} isLoading={markMutation.isPending} disabled={Object.keys(statuses).length === 0}>
                      <CalendarCheck className="h-4 w-4" /> Submit Attendance
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
