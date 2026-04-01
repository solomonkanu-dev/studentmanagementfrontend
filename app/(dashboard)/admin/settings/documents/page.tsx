"use client";

import { useState, useEffect } from "react";
import {
  PDFViewer,
  PDFDownloadLink,
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  type DocumentProps,
} from "@react-pdf/renderer";
import {
  DEFAULT_TEMPLATES,
  type DocTemplates,
  type DocStudent,
  type DocInstitute,
} from "@/components/documents/DocumentsPanel";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import {
  FileText,
  Award,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  Save,
  Download,
  Eye,
} from "lucide-react";

// ─── Re-use helpers from DocumentsPanel ──────────────────────────────────────
// (small inline copies to avoid duplicate imports)

function today() {
  return new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}
function academicYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

const SAMPLE_STUDENT: DocStudent = {
  _id: "000000000001",
  fullName: "Sample Student",
  email: "sample.student@school.edu",
  class: { _id: "c1", name: "JSS 3A" },
  studentProfile: {
    registrationNumber: "SCH/2024/001",
    admissionDate: "2024-09-01",
    gender: "Male",
  },
  createdAt: "2024-09-01T00:00:00.000Z",
  promotionHistory: [
    {
      fromClass: { _id: "c0", name: "JSS 2A" },
      toClass: { _id: "c1", name: "JSS 3A" },
      promotedAt: "2024-08-20T00:00:00.000Z",
    },
  ],
};

const STORAGE_KEY = "sms_doc_templates";

function useDocTemplates(): [DocTemplates, (t: DocTemplates) => void, () => void] {
  const [templates, setTemplates] = useState<DocTemplates>(DEFAULT_TEMPLATES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setTemplates({ ...DEFAULT_TEMPLATES, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const save = (t: DocTemplates) => {
    setTemplates(t);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    } catch {}
  };

  const reset = () => {
    setTemplates(DEFAULT_TEMPLATES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return [templates, save, reset];
}

// ─── Minimal PDF rebuilds (same as DocumentsPanel, trimmed for settings page) ─

const C = {
  primary: "#3C50E0", dark: "#1A202C", medium: "#4A5568", light: "#718096",
  border: "#E2E8F0", lightBg: "#F7FAFC", white: "#FFFFFF", success: "#0BA259",
};

const S = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", backgroundColor: C.white, fontSize: 10, color: C.dark },
  hRow: { flexDirection: "row", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: `2px solid ${C.primary}` },
  logoBox: { width: 54, height: 54, borderRadius: 4, marginRight: 12, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  logoTxt: { color: C.white, fontSize: 22, fontFamily: "Helvetica-Bold" },
  iName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 2 },
  iSub: { fontSize: 8, color: C.light },
  titleBlock: { marginBottom: 20, alignItems: "center" },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 },
  refLine: { fontSize: 8, color: C.light },
  sec: { marginBottom: 14 },
  secHd: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${C.border}` },
  iRow: { flexDirection: "row", marginBottom: 6 },
  iLbl: { width: 160, fontSize: 9, color: C.light, fontFamily: "Helvetica-Bold" },
  iVal: { flex: 1, fontSize: 9, color: C.dark },
  body: { fontSize: 10, color: C.medium, lineHeight: 1.7, marginBottom: 8 },
  sigBlock: { marginTop: 32, flexDirection: "row", justifyContent: "space-between" },
  sigBox: { alignItems: "center", width: 140 },
  sigLine: { borderTop: `1px solid ${C.dark}`, width: 120, marginBottom: 4 },
  sigTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.dark, textAlign: "center" },
  sigSub: { fontSize: 8, color: C.light, textAlign: "center" },
  stamp: { marginTop: 14, padding: 10, backgroundColor: C.lightBg, borderRadius: 4, alignItems: "center" },
  stampTxt: { fontSize: 8, color: C.medium, textAlign: "center", lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48 },
  footerLine: { borderTop: `1px solid ${C.border}`, marginBottom: 5 },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerTxt: { fontSize: 8, color: C.light },
  // ID card styles
  idWrapper: { margin: 48 },
  idNote: { fontSize: 8, color: C.light, marginBottom: 8 },
  idCard: { width: 252, height: 160, borderRadius: 8, overflow: "hidden", backgroundColor: C.white, border: `1px solid ${C.border}` },
  idTop: { backgroundColor: C.primary, height: 38, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6 },
  idTopName: { color: C.white, fontSize: 9, fontFamily: "Helvetica-Bold", flex: 1 },
  idTopLbl: { color: "rgba(255,255,255,0.75)", fontSize: 7 },
  idBody: { flex: 1, flexDirection: "row", padding: 10 },
  idAvatar: { width: 46, height: 58, borderRadius: 4, backgroundColor: C.lightBg, border: `1px solid ${C.border}`, alignItems: "center", justifyContent: "center", marginRight: 10 },
  idAvatarTxt: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.primary },
  idInfo: { flex: 1, justifyContent: "center" },
  idName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 5 },
  idRow: { flexDirection: "row", marginBottom: 2 },
  idLbl: { fontSize: 7, color: C.light, width: 60 },
  idVal: { fontSize: 7, color: C.dark, flex: 1 },
  idBot: { backgroundColor: C.lightBg, height: 22, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderTop: `1px solid ${C.border}` },
  idDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success, marginRight: 5 },
  idBotTxt: { fontSize: 7, color: C.light },
  idReturn: { fontSize: 8, color: C.light, marginTop: 8 },
});

function PdfH({ inst }: { inst: DocInstitute }) {
  return (
    <View style={S.hRow}>
      <View style={S.logoBox}><Text style={S.logoTxt}>{inst.name.charAt(0)}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={S.iName}>{inst.name}</Text>
        <Text style={S.iSub}>{[inst.address, inst.phoneNumber, inst.email].filter(Boolean).join("  |  ")}</Text>
      </View>
    </View>
  );
}
function PdfF({ inst, label }: { inst: DocInstitute; label: string }) {
  return (
    <View style={S.footer} fixed>
      <View style={S.footerLine} />
      <View style={S.footerRow}>
        <Text style={S.footerTxt}>{inst.name}  —  {label}</Text>
        <Text style={S.footerTxt}>Generated: {today()}</Text>
      </View>
    </View>
  );
}

function buildDoc(tab: DocTabKey, t: DocTemplates, inst: DocInstitute): React.ReactElement<DocumentProps> {
  const s = SAMPLE_STUDENT;
  const regNo = s.studentProfile?.registrationNumber ?? "SCH/2024/001";
  const className = "JSS 3A";

  if (tab === "admissionLetter") {
    return (
      <Document title="Admission Letter" author={inst.name}>
        <Page size="A4" style={S.page}>
          <PdfH inst={inst} />
          <View style={S.titleBlock}>
            <Text style={S.docTitle}>Admission Letter</Text>
            <Text style={S.refLine}>Ref: ADM/{new Date().getFullYear()}/{regNo}  |  Date: {today()}</Text>
          </View>
          <View style={S.sec}>
            <Text style={S.body}>Dear {s.fullName},</Text>
            <Text style={S.body}>{t.admissionLetter.bodyParagraph1}</Text>
          </View>
          <View style={S.sec}>
            <Text style={S.secHd}>Student Details</Text>
            <View style={S.iRow}><Text style={S.iLbl}>Full Name</Text><Text style={S.iVal}>{s.fullName}</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Registration Number</Text><Text style={S.iVal}>{regNo}</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Class Assigned</Text><Text style={S.iVal}>{className}</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Date of Admission</Text><Text style={S.iVal}>1 September 2024</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Academic Year</Text><Text style={S.iVal}>{academicYear()}</Text></View>
          </View>
          <View style={S.sec}>
            <Text style={S.secHd}>Important Information</Text>
            <Text style={S.body}>{t.admissionLetter.bodyParagraph2}</Text>
          </View>
          <View style={S.sigBlock}>
            <View style={S.sigBox}><View style={S.sigLine} /><Text style={S.sigTitle}>{t.admissionLetter.principalTitle}</Text><Text style={S.sigSub}>{inst.name}</Text></View>
            <View style={S.sigBox}><View style={S.sigLine} /><Text style={S.sigTitle}>{t.admissionLetter.adminTitle}</Text><Text style={S.sigSub}>{t.admissionLetter.adminDept}</Text></View>
          </View>
          <PdfF inst={inst} label="Admission Letter" />
        </Page>
      </Document>
    ) as unknown as React.ReactElement<DocumentProps>;
  }

  if (tab === "transferCert") {
    return (
      <Document title="Transfer Certificate" author={inst.name}>
        <Page size="A4" style={S.page}>
          <PdfH inst={inst} />
          <View style={S.titleBlock}>
            <Text style={S.docTitle}>Transfer / Leaving Certificate</Text>
            <Text style={S.refLine}>Serial No: TC/{new Date().getFullYear()}/{regNo}  |  Date: {today()}</Text>
          </View>
          <View style={S.sec}><Text style={S.body}>To Whom It May Concern,</Text><Text style={S.body}>{t.transferCert.bodyParagraph1}</Text></View>
          <View style={S.sec}>
            <Text style={S.secHd}>Student Particulars</Text>
            <View style={S.iRow}><Text style={S.iLbl}>Full Name</Text><Text style={S.iVal}>{s.fullName}</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Registration Number</Text><Text style={S.iVal}>{regNo}</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Last Class Attended</Text><Text style={S.iVal}>{className}</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>All Classes Attended</Text><Text style={S.iVal}>JSS 2A, JSS 3A</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Date of Leaving</Text><Text style={S.iVal}>{today()}</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Reason for Leaving</Text><Text style={S.iVal}>Completion of Study</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Character &amp; Conduct</Text><Text style={S.iVal}>{t.transferCert.conductRating}</Text></View>
          </View>
          <View style={[S.stamp, { borderLeft: `3px solid ${C.success}` }]}>
            <Text style={[S.stampTxt, { fontFamily: "Helvetica-Bold", color: C.success, marginBottom: 2 }]}>CERTIFIED TRUE</Text>
            <Text style={S.stampTxt}>{t.transferCert.certifiedText}</Text>
          </View>
          <View style={S.sigBlock}>
            <View style={S.sigBox}><View style={S.sigLine} /><Text style={S.sigTitle}>{t.transferCert.principalTitle}</Text><Text style={S.sigSub}>{inst.name}</Text></View>
            <View style={S.sigBox}><View style={S.sigLine} /><Text style={S.sigTitle}>{t.transferCert.teacherTitle}</Text><Text style={S.sigSub}>Academic Department</Text></View>
          </View>
          <PdfF inst={inst} label="Transfer / Leaving Certificate" />
        </Page>
      </Document>
    ) as unknown as React.ReactElement<DocumentProps>;
  }

  if (tab === "attestation") {
    return (
      <Document title="Attestation Letter" author={inst.name}>
        <Page size="A4" style={S.page}>
          <PdfH inst={inst} />
          <View style={S.titleBlock}>
            <Text style={S.docTitle}>Attestation / Enrollment Letter</Text>
            <Text style={S.refLine}>Ref: ATT/{new Date().getFullYear()}/{regNo}  |  Date: {today()}</Text>
          </View>
          <View style={S.sec}><Text style={S.body}>To Whom It May Concern,</Text><Text style={S.body}>{t.attestation.bodyParagraph1}</Text></View>
          <View style={S.sec}>
            <Text style={S.secHd}>Student Particulars</Text>
            <View style={S.iRow}><Text style={S.iLbl}>Full Name</Text><Text style={S.iVal}>{s.fullName}</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Registration Number</Text><Text style={S.iVal}>{regNo}</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Class / Programme</Text><Text style={S.iVal}>{className}</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Academic Year</Text><Text style={S.iVal}>{academicYear()}</Text></View>
            <View style={S.iRow}><Text style={S.iLbl}>Enrollment Status</Text><Text style={S.iVal}>Currently Enrolled</Text></View>
          </View>
          <View style={S.sec}><Text style={S.body}>{t.attestation.bodyParagraph2}</Text></View>
          <View style={S.stamp}><Text style={S.stampTxt}>Official Document  •  {inst.name}  •  Issued: {today()}</Text></View>
          <View style={S.sigBlock}>
            <View style={S.sigBox}><View style={S.sigLine} /><Text style={S.sigTitle}>{t.attestation.principalTitle}</Text><Text style={S.sigSub}>{inst.name}</Text></View>
            <View style={S.sigBox}><View style={S.sigLine} /><Text style={S.sigTitle}>{t.attestation.officerTitle}</Text><Text style={S.sigSub}>{t.attestation.officerDept}</Text></View>
          </View>
          <PdfF inst={inst} label="Attestation Letter" />
        </Page>
      </Document>
    ) as unknown as React.ReactElement<DocumentProps>;
  }

  // ID Card
  return (
    <Document title="Student ID Card" author={inst.name}>
      <Page size="A4" style={{ padding: 0, backgroundColor: C.white, fontFamily: "Helvetica" }}>
        <View style={S.idWrapper}>
          <Text style={S.idNote}>Student Identity Card — {inst.name}</Text>
          <View style={S.idCard}>
            <View style={S.idTop}>
              <Text style={S.idTopName}>{inst.name}</Text>
              <Text style={S.idTopLbl}>STUDENT ID</Text>
            </View>
            <View style={S.idBody}>
              <View style={S.idAvatar}><Text style={S.idAvatarTxt}>S</Text></View>
              <View style={S.idInfo}>
                <Text style={S.idName}>{s.fullName}</Text>
                <View style={S.idRow}><Text style={S.idLbl}>Reg No:</Text><Text style={[S.idVal, { fontFamily: "Helvetica-Bold" }]}>{regNo}</Text></View>
                <View style={S.idRow}><Text style={S.idLbl}>Class:</Text><Text style={S.idVal}>{className}</Text></View>
                <View style={S.idRow}><Text style={S.idLbl}>Acad. Year:</Text><Text style={S.idVal}>{academicYear()}</Text></View>
                <View style={S.idRow}><Text style={S.idLbl}>Email:</Text><Text style={S.idVal}>{s.email}</Text></View>
              </View>
            </View>
            <View style={S.idBot}>
              <View style={S.idDot} />
              <Text style={S.idBotTxt}>{t.idCard.validityPrefix} {academicYear()}</Text>
              <View style={{ flex: 1 }} />
              <Text style={[S.idBotTxt, { fontFamily: "Helvetica-Bold" }]}>STUDENT</Text>
            </View>
          </View>
          <Text style={S.idReturn}>{t.idCard.returnText.replace("{instituteName}", inst.name)}</Text>
        </View>
      </Page>
    </Document>
  ) as unknown as React.ReactElement<DocumentProps>;
}

// ─── Field definitions ────────────────────────────────────────────────────────

type DocTabKey = "admissionLetter" | "transferCert" | "attestation" | "idCard";

const TABS: { key: DocTabKey; label: string; icon: React.ElementType }[] = [
  { key: "admissionLetter", label: "Admission Letter", icon: FileText },
  { key: "transferCert", label: "Transfer Certificate", icon: Award },
  { key: "attestation", label: "Attestation Letter", icon: ShieldCheck },
  { key: "idCard", label: "Student ID Card", icon: CreditCard },
];

const FIELDS: Record<DocTabKey, { key: string; label: string; hint?: string; multiline?: boolean }[]> = {
  admissionLetter: [
    { key: "bodyParagraph1", label: "Welcome Paragraph", hint: "Appears right after 'Dear [Student Name],'", multiline: true },
    { key: "bodyParagraph2", label: "Important Information", hint: "Appears under the Important Information heading", multiline: true },
    { key: "principalTitle", label: "Principal / Head of School Title" },
    { key: "adminTitle", label: "Admin Officer Title" },
    { key: "adminDept", label: "Admin Department Name" },
  ],
  transferCert: [
    { key: "bodyParagraph1", label: "Opening Paragraph", hint: "Appears after 'To Whom It May Concern,'", multiline: true },
    { key: "conductRating", label: "Conduct Rating", hint: "e.g. Good, Excellent, Satisfactory" },
    { key: "certifiedText", label: "Certified True Statement", multiline: true },
    { key: "principalTitle", label: "Principal Title" },
    { key: "teacherTitle", label: "Class Teacher / Co-Signer Title" },
  ],
  attestation: [
    { key: "bodyParagraph1", label: "Main Body Paragraph", hint: "Core attestation statement", multiline: true },
    { key: "bodyParagraph2", label: "Disclaimer Paragraph", multiline: true },
    { key: "principalTitle", label: "Principal Title" },
    { key: "officerTitle", label: "Officer Title" },
    { key: "officerDept", label: "Officer Department" },
  ],
  idCard: [
    { key: "validityPrefix", label: "Validity Text Prefix", hint: "e.g. 'Valid for Academic Year'" },
    { key: "returnText", label: "Return Notice", hint: "Use {instituteName} to insert your school name" },
  ],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentTemplatesPage() {
  const [templates, saveTemplates, resetTemplates] = useDocTemplates();
  const [draft, setDraft] = useState<DocTemplates>(DEFAULT_TEMPLATES);
  const [activeTab, setActiveTab] = useState<DocTabKey>("admissionLetter");
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setMounted(true), []);
  // Sync draft when templates load from localStorage
  useEffect(() => { setDraft(JSON.parse(JSON.stringify(templates))); }, [templates]);

  const { data: institute } = useQuery({
    queryKey: ["admin-institute"],
    queryFn: adminApi.getMyInstitute,
  });

  const inst: DocInstitute = institute
    ? { name: institute.name, address: institute.address, phoneNumber: institute.phoneNumber, email: institute.email, logo: institute.logo, targetLine: institute.targetLine }
    : { name: "Your Institution Name", address: "123 School Street", phoneNumber: "+1 234 567 890" };

  function setField(key: string, value: string) {
    setDraft((prev) => ({
      ...prev,
      [activeTab]: { ...(prev[activeTab] as Record<string, string>), [key]: value },
    }));
  }

  function handleSave() {
    saveTemplates(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    if (!confirm("Reset all document templates to defaults? This cannot be undone.")) return;
    resetTemplates();
    setDraft(JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)));
  }

  const tabSection = draft[activeTab] as Record<string, string>;
  const previewDoc = mounted ? buildDoc(activeTab, draft, inst) : null;
  const downloadFilename = `${activeTab}-template-preview.pdf`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-black dark:text-white">Document Templates</h1>
            <p className="text-sm text-body">Customize the text used in all generated documents</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-xs font-medium text-body transition-colors hover:border-meta-1 hover:text-meta-1 dark:border-strokedark"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className={[
              "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors",
              saved ? "bg-meta-3" : "bg-primary hover:bg-opacity-90",
            ].join(" ")}
          >
            <Save className="h-3.5 w-3.5" />
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Document type tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={[
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium transition-colors",
              activeTab === key
                ? "border-primary bg-primary/10 text-primary"
                : "border-stroke text-body hover:border-primary hover:text-primary dark:border-strokedark",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Editor + Preview split */}
      <div className="flex gap-6" style={{ height: "calc(100vh - 260px)", minHeight: 520 }}>
        {/* Fields panel */}
        <div className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-xl border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-5 py-3 dark:border-strokedark">
            <p className="text-xs font-semibold text-black dark:text-white">Edit Fields</p>
            <p className="mt-0.5 text-[11px] text-body">Changes appear instantly in the preview</p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {FIELDS[activeTab].map(({ key, label, hint, multiline }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium text-black dark:text-white">{label}</label>
                {hint && <p className="mb-1.5 text-[11px] text-body">{hint}</p>}
                {multiline ? (
                  <textarea
                    value={tabSection[key] ?? ""}
                    onChange={(e) => setField(key, e.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-lg border border-stroke bg-transparent px-3 py-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  />
                ) : (
                  <input
                    value={tabSection[key] ?? ""}
                    onChange={(e) => setField(key, e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preview panel */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
          <div className="flex shrink-0 items-center justify-between border-b border-stroke px-5 py-3 dark:border-strokedark">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-body" />
              <p className="text-xs font-semibold text-black dark:text-white">Live Preview</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Sample Data</span>
            </div>
            {mounted && previewDoc && (
              <PDFDownloadLink document={previewDoc} fileName={downloadFilename}>
                {({ loading }) => (
                  <button
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {loading ? "Generating…" : "Download Preview"}
                  </button>
                )}
              </PDFDownloadLink>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            {mounted && previewDoc ? (
              <PDFViewer width="100%" height="100%" style={{ border: "none" }} showToolbar={false}>
                {previewDoc}
              </PDFViewer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-body">
        Templates are saved in your browser. All documents generated for students will use these customized texts.
      </p>
    </div>
  );
}
