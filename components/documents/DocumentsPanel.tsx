"use client";

import { useState, useEffect } from "react";
import {
  PDFDownloadLink,
  PDFViewer,
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
  type DocumentProps,
} from "@react-pdf/renderer";
import { FileText, Award, ShieldCheck, CreditCard, Download, Settings, X, RotateCcw, Save } from "lucide-react";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DocStudent {
  _id: string;
  fullName: string;
  email: string;
  class?: { _id: string; name: string } | string | null;
  studentProfile?: {
    registrationNumber?: string;
    admissionDate?: string;
    dateOfAdmission?: string;
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
    mobileNumber?: string;
    address?: string;
    bloodGroup?: string;
  };
  profilePhoto?: string | null;
  lifecycleStatus?: string;
  createdAt: string;
  promotionHistory?: {
    fromClass: { _id: string; name: string } | null;
    toClass: { _id: string; name: string } | null;
    promotedAt: string;
  }[];
}

export interface DocInstitute {
  name: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  logo?: string;
  website?: string;
  targetLine?: string;
}

// ─── Template types ───────────────────────────────────────────────────────────

export interface DocTemplates {
  admissionLetter: {
    bodyParagraph1: string;
    bodyParagraph2: string;
    principalTitle: string;
    adminTitle: string;
    adminDept: string;
  };
  transferCert: {
    bodyParagraph1: string;
    conductRating: string;
    certifiedText: string;
    principalTitle: string;
    teacherTitle: string;
  };
  attestation: {
    bodyParagraph1: string;
    bodyParagraph2: string;
    principalTitle: string;
    officerTitle: string;
    officerDept: string;
  };
  idCard: {
    validityPrefix: string;
    returnText: string;
  };
}

export const DEFAULT_TEMPLATES: DocTemplates = {
  admissionLetter: {
    bodyParagraph1:
      "We are pleased to inform you that your application for admission has been approved. You have been officially enrolled as a student in the academic year stated below. Welcome to our institution — we look forward to supporting your academic journey.",
    bodyParagraph2:
      "Please retain this letter as proof of your admission. You are required to report to the institution on or before the commencement of academic activities. Ensure you have collected your student identity card and completed all required documentation.\n\nFor any enquiries, please contact the admin office using the contact details above.",
    principalTitle: "The Principal",
    adminTitle: "Admin Officer",
    adminDept: "Admissions Department",
  },
  transferCert: {
    bodyParagraph1:
      "This is to certify that the above-named was a bonafide student of this institution. The student has hereby fulfilled the requirements for the issuance of this certificate.",
    conductRating: "Good",
    certifiedText:
      "This certificate is issued in good faith and to the best of our knowledge. No liability is accepted for misuse of this document.",
    principalTitle: "The Principal",
    teacherTitle: "Class Teacher / Admin",
  },
  attestation: {
    bodyParagraph1:
      "This is to certify that the above-named student is/was a registered student of this institution in the class and academic year stated below. This letter is issued upon request to serve as proof of enrollment and for whatever lawful purpose it may serve.",
    bodyParagraph2:
      "The institution bears no responsibility for any misrepresentation of this document by the holder. Any forgery or misuse will be subject to legal action.",
    principalTitle: "The Principal",
    officerTitle: "Admin Officer",
    officerDept: "Academic Records",
  },
  idCard: {
    validityPrefix: "Valid for Academic Year",
    returnText: "This card is the property of the institution. If found, please return to the admin office.",
  },
};

const STORAGE_KEY = "sms_doc_templates";

// ─── Templates hook ───────────────────────────────────────────────────────────

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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch {}
  };

  const reset = () => {
    setTemplates(DEFAULT_TEMPLATES);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return [templates, save, reset];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRegNo(student: DocStudent): string {
  return student.studentProfile?.registrationNumber ?? student._id.slice(-8).toUpperCase();
}

export function getClassName(student: DocStudent): string {
  if (!student.class) return "N/A";
  if (typeof student.class === "object" && student.class !== null) return student.class.name;
  // raw ID — just return it (shouldn't happen with populated data)
  return String(student.class);
}

function getAdmissionDate(student: DocStudent): string {
  const d =
    student.studentProfile?.admissionDate ??
    student.studentProfile?.dateOfAdmission ??
    student.createdAt;
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function today(): string {
  return new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function academicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

// ─── PDF design tokens ────────────────────────────────────────────────────────

const C = {
  primary: "#3C50E0",
  dark: "#1A202C",
  medium: "#4A5568",
  light: "#718096",
  border: "#E2E8F0",
  lightBg: "#F7FAFC",
  white: "#FFFFFF",
  success: "#0BA259",
};

// ─── Shared PDF stylesheet ────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", backgroundColor: C.white, fontSize: 10, color: C.dark },
  // Header
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: `2px solid ${C.primary}` },
  logoBox: { width: 54, height: 54, borderRadius: 4, marginRight: 12, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  logoBoxText: { color: C.white, fontSize: 22, fontFamily: "Helvetica-Bold" },
  logoImg: { width: 54, height: 54, borderRadius: 4, marginRight: 12 },
  instName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 2 },
  instTagline: { fontSize: 9, color: C.light, marginBottom: 1 },
  instContact: { fontSize: 8, color: C.light },
  // Title block
  titleBlock: { marginBottom: 20, alignItems: "center" },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 },
  refLine: { fontSize: 8, color: C.light },
  // Sections
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${C.border}` },
  infoRow: { flexDirection: "row", marginBottom: 6 },
  infoLabel: { width: 160, fontSize: 9, color: C.light, fontFamily: "Helvetica-Bold" },
  infoValue: { flex: 1, fontSize: 9, color: C.dark },
  bodyText: { fontSize: 10, color: C.medium, lineHeight: 1.7, marginBottom: 8 },
  // Signature
  sigBlock: { marginTop: 32, flexDirection: "row", justifyContent: "space-between" },
  sigBox: { alignItems: "center", width: 140 },
  sigLine: { borderTop: `1px solid ${C.dark}`, width: 120, marginBottom: 4 },
  sigTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.dark, textAlign: "center" },
  sigSub: { fontSize: 8, color: C.light, textAlign: "center" },
  // Stamp
  stamp: { marginTop: 14, padding: 10, backgroundColor: C.lightBg, borderRadius: 4, alignItems: "center" },
  stampText: { fontSize: 8, color: C.medium, textAlign: "center", lineHeight: 1.5 },
  // Footer
  footer: { position: "absolute", bottom: 24, left: 48, right: 48 },
  footerLine: { borderTop: `1px solid ${C.border}`, marginBottom: 5 },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: C.light },
});

// ─── Shared components ────────────────────────────────────────────────────────

function PdfHeader({ inst }: { inst: DocInstitute }) {
  return (
    <View style={S.headerRow}>
      {inst.logo ? (
        <Image src={inst.logo} style={S.logoImg} />
      ) : (
        <View style={S.logoBox}>
          <Text style={S.logoBoxText}>{inst.name.charAt(0)}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={S.instName}>{inst.name}</Text>
        {inst.targetLine && <Text style={S.instTagline}>{inst.targetLine}</Text>}
        <Text style={S.instContact}>
          {[inst.address, inst.phoneNumber, inst.email].filter(Boolean).join("  |  ")}
        </Text>
      </View>
    </View>
  );
}

function PdfFooter({ inst, label }: { inst: DocInstitute; label: string }) {
  return (
    <View style={S.footer} fixed>
      <View style={S.footerLine} />
      <View style={S.footerRow}>
        <Text style={S.footerText}>{inst.name}  —  {label}</Text>
        <Text style={S.footerText}>Generated: {today()}</Text>
      </View>
    </View>
  );
}

// ─── 1. Admission Letter ──────────────────────────────────────────────────────

function AdmissionLetterDoc({
  student, inst, t,
}: {
  student: DocStudent; inst: DocInstitute; t: DocTemplates["admissionLetter"];
}) {
  const regNo = getRegNo(student);
  return (
    <Document title="Admission Letter" author={inst.name}>
      <Page size="A4" style={S.page}>
        <PdfHeader inst={inst} />
        <View style={S.titleBlock}>
          <Text style={S.docTitle}>Admission Letter</Text>
          <Text style={S.refLine}>Ref: ADM/{new Date().getFullYear()}/{regNo}  |  Date: {today()}</Text>
        </View>
        <View style={S.section}>
          <Text style={S.bodyText}>Dear {student.fullName},</Text>
          <Text style={S.bodyText}>{t.bodyParagraph1}</Text>
        </View>
        <View style={S.section}>
          <Text style={S.sectionTitle}>Student Details</Text>
          <View style={S.infoRow}><Text style={S.infoLabel}>Full Name</Text><Text style={S.infoValue}>{student.fullName}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Registration Number</Text><Text style={S.infoValue}>{regNo}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Email Address</Text><Text style={S.infoValue}>{student.email}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Class Assigned</Text><Text style={S.infoValue}>{getClassName(student)}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Date of Admission</Text><Text style={S.infoValue}>{getAdmissionDate(student)}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Academic Year</Text><Text style={S.infoValue}>{academicYear()}</Text></View>
        </View>
        <View style={S.section}>
          <Text style={S.sectionTitle}>Important Information</Text>
          <Text style={S.bodyText}>{t.bodyParagraph2}</Text>
        </View>
        <View style={S.sigBlock}>
          <View style={S.sigBox}>
            <View style={S.sigLine} />
            <Text style={S.sigTitle}>{t.principalTitle}</Text>
            <Text style={S.sigSub}>{inst.name}</Text>
          </View>
          <View style={S.sigBox}>
            <View style={S.sigLine} />
            <Text style={S.sigTitle}>{t.adminTitle}</Text>
            <Text style={S.sigSub}>{t.adminDept}</Text>
          </View>
        </View>
        <PdfFooter inst={inst} label="Admission Letter" />
      </Page>
    </Document>
  );
}

// ─── 2. Transfer Certificate ──────────────────────────────────────────────────

function TransferCertDoc({
  student, inst, t,
}: {
  student: DocStudent; inst: DocInstitute; t: DocTemplates["transferCert"];
}) {
  const regNo = getRegNo(student);
  const history = student.promotionHistory ?? [];
  const classSet: string[] = [];
  history.forEach((h) => {
    if (h.fromClass?.name && !classSet.includes(h.fromClass.name)) classSet.push(h.fromClass.name);
    if (h.toClass?.name && !classSet.includes(h.toClass.name)) classSet.push(h.toClass.name);
  });
  const className = getClassName(student);
  if (classSet.length === 0 && className !== "N/A") classSet.push(className);
  const lifecycleLabel = {
    graduated: "Graduation",
    transferred: "Voluntary Transfer",
    withdrawn: "Withdrawal",
  }[student.lifecycleStatus ?? ""] ?? "Completion of Study";

  return (
    <Document title="Transfer / Leaving Certificate" author={inst.name}>
      <Page size="A4" style={S.page}>
        <PdfHeader inst={inst} />
        <View style={S.titleBlock}>
          <Text style={S.docTitle}>Transfer / Leaving Certificate</Text>
          <Text style={S.refLine}>Serial No: TC/{new Date().getFullYear()}/{regNo}  |  Date: {today()}</Text>
        </View>
        <View style={S.section}>
          <Text style={S.bodyText}>To Whom It May Concern,</Text>
          <Text style={S.bodyText}>{t.bodyParagraph1}</Text>
        </View>
        <View style={S.section}>
          <Text style={S.sectionTitle}>Student Particulars</Text>
          <View style={S.infoRow}><Text style={S.infoLabel}>Full Name</Text><Text style={S.infoValue}>{student.fullName}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Registration Number</Text><Text style={S.infoValue}>{regNo}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Email Address</Text><Text style={S.infoValue}>{student.email}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Date of Admission</Text><Text style={S.infoValue}>{getAdmissionDate(student)}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Last Class Attended</Text><Text style={S.infoValue}>{className}</Text></View>
          {classSet.length > 1 && (
            <View style={S.infoRow}><Text style={S.infoLabel}>All Classes Attended</Text><Text style={S.infoValue}>{classSet.join(", ")}</Text></View>
          )}
          <View style={S.infoRow}><Text style={S.infoLabel}>Date of Leaving</Text><Text style={S.infoValue}>{today()}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Reason for Leaving</Text><Text style={S.infoValue}>{lifecycleLabel}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Character &amp; Conduct</Text><Text style={S.infoValue}>{t.conductRating}</Text></View>
        </View>
        <View style={[S.stamp, { borderLeft: `3px solid ${C.success}` }]}>
          <Text style={[S.stampText, { fontFamily: "Helvetica-Bold", color: C.success, marginBottom: 2 }]}>CERTIFIED TRUE</Text>
          <Text style={S.stampText}>{t.certifiedText}</Text>
        </View>
        <View style={S.sigBlock}>
          <View style={S.sigBox}>
            <View style={S.sigLine} />
            <Text style={S.sigTitle}>{t.principalTitle}</Text>
            <Text style={S.sigSub}>{inst.name}</Text>
          </View>
          <View style={S.sigBox}>
            <View style={S.sigLine} />
            <Text style={S.sigTitle}>{t.teacherTitle}</Text>
            <Text style={S.sigSub}>Academic Department</Text>
          </View>
        </View>
        <PdfFooter inst={inst} label="Transfer / Leaving Certificate" />
      </Page>
    </Document>
  );
}

// ─── 3. Attestation ───────────────────────────────────────────────────────────

function AttestationDoc({
  student, inst, t,
}: {
  student: DocStudent; inst: DocInstitute; t: DocTemplates["attestation"];
}) {
  const regNo = getRegNo(student);
  const statusLabel =
    student.lifecycleStatus === "graduated" ? "Graduated"
    : student.lifecycleStatus === "transferred" ? "Transferred"
    : student.lifecycleStatus === "withdrawn" ? "Withdrawn"
    : "Currently Enrolled";

  return (
    <Document title="Attestation Letter" author={inst.name}>
      <Page size="A4" style={S.page}>
        <PdfHeader inst={inst} />
        <View style={S.titleBlock}>
          <Text style={S.docTitle}>Attestation / Enrollment Letter</Text>
          <Text style={S.refLine}>Ref: ATT/{new Date().getFullYear()}/{regNo}  |  Date: {today()}</Text>
        </View>
        <View style={S.section}>
          <Text style={S.bodyText}>To Whom It May Concern,</Text>
          <Text style={S.bodyText}>{t.bodyParagraph1}</Text>
        </View>
        <View style={S.section}>
          <Text style={S.sectionTitle}>Student Particulars</Text>
          <View style={S.infoRow}><Text style={S.infoLabel}>Full Name</Text><Text style={S.infoValue}>{student.fullName}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Registration Number</Text><Text style={S.infoValue}>{regNo}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Email Address</Text><Text style={S.infoValue}>{student.email}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Class / Programme</Text><Text style={S.infoValue}>{getClassName(student)}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Date of Enrollment</Text><Text style={S.infoValue}>{getAdmissionDate(student)}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Academic Year</Text><Text style={S.infoValue}>{academicYear()}</Text></View>
          <View style={S.infoRow}><Text style={S.infoLabel}>Enrollment Status</Text><Text style={S.infoValue}>{statusLabel}</Text></View>
        </View>
        <View style={S.section}>
          <Text style={S.bodyText}>{t.bodyParagraph2}</Text>
        </View>
        <View style={S.stamp}>
          <Text style={S.stampText}>Official Document  •  {inst.name}  •  Issued: {today()}</Text>
        </View>
        <View style={S.sigBlock}>
          <View style={S.sigBox}>
            <View style={S.sigLine} />
            <Text style={S.sigTitle}>{t.principalTitle}</Text>
            <Text style={S.sigSub}>{inst.name}</Text>
          </View>
          <View style={S.sigBox}>
            <View style={S.sigLine} />
            <Text style={S.sigTitle}>{t.officerTitle}</Text>
            <Text style={S.sigSub}>{t.officerDept}</Text>
          </View>
        </View>
        <PdfFooter inst={inst} label="Attestation Letter" />
      </Page>
    </Document>
  );
}

// ─── 4. ID Card ───────────────────────────────────────────────────────────────

const ID = StyleSheet.create({
  page: { padding: 0, backgroundColor: C.white, fontFamily: "Helvetica" },
  wrapper: { margin: 48 },
  note: { fontSize: 8, color: C.light, marginBottom: 8 },
  card: { width: 252, height: 160, borderRadius: 8, overflow: "hidden", backgroundColor: C.white, border: `1px solid ${C.border}` },
  topBand: { backgroundColor: C.primary, height: 38, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6 },
  bandInst: { color: C.white, fontSize: 9, fontFamily: "Helvetica-Bold", flex: 1 },
  bandLabel: { color: "rgba(255,255,255,0.75)", fontSize: 7 },
  body: { flex: 1, flexDirection: "row", padding: 10 },
  avatar: { width: 46, height: 58, borderRadius: 4, backgroundColor: C.lightBg, border: `1px solid ${C.border}`, alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarPhoto: { width: 46, height: 58, borderRadius: 4 },
  avatarInitial: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.primary },
  info: { flex: 1, justifyContent: "center" },
  name: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 5 },
  row: { flexDirection: "row", marginBottom: 2 },
  lbl: { fontSize: 7, color: C.light, width: 60 },
  val: { fontSize: 7, color: C.dark, flex: 1 },
  bottomBand: { backgroundColor: C.lightBg, height: 22, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderTop: `1px solid ${C.border}` },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success, marginRight: 5 },
  bottomText: { fontSize: 7, color: C.light },
  returnNote: { fontSize: 8, color: C.light, marginTop: 8 },
});

function StudentIdCardDoc({
  student, inst, t,
}: {
  student: DocStudent; inst: DocInstitute; t: DocTemplates["idCard"];
}) {
  const regNo = getRegNo(student);
  const className = getClassName(student);
  return (
    <Document title="Student ID Card" author={inst.name}>
      <Page size="A4" style={ID.page}>
        <View style={ID.wrapper}>
          <Text style={ID.note}>Student Identity Card — {inst.name}</Text>
          <View style={ID.card}>
            <View style={ID.topBand}>
              <Text style={ID.bandInst}>{inst.name}</Text>
              <Text style={ID.bandLabel}>STUDENT ID</Text>
            </View>
            <View style={ID.body}>
              <View style={ID.avatar}>
                {student.profilePhoto ? (
                  <Image src={student.profilePhoto} style={ID.avatarPhoto} />
                ) : (
                  <Text style={ID.avatarInitial}>{student.fullName.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={ID.info}>
                <Text style={ID.name}>{student.fullName}</Text>
                <View style={ID.row}><Text style={ID.lbl}>Reg No:</Text><Text style={[ID.val, { fontFamily: "Helvetica-Bold" }]}>{regNo}</Text></View>
                <View style={ID.row}><Text style={ID.lbl}>Class:</Text><Text style={ID.val}>{className}</Text></View>
                <View style={ID.row}><Text style={ID.lbl}>Acad. Year:</Text><Text style={ID.val}>{academicYear()}</Text></View>
                <View style={ID.row}><Text style={ID.lbl}>Email:</Text><Text style={ID.val}>{student.email.length > 24 ? student.email.slice(0, 24) + "…" : student.email}</Text></View>
              </View>
            </View>
            <View style={ID.bottomBand}>
              <View style={ID.dot} />
              <Text style={ID.bottomText}>{t.validityPrefix} {academicYear()}</Text>
              <View style={{ flex: 1 }} />
              <Text style={[ID.bottomText, { fontFamily: "Helvetica-Bold" }]}>STUDENT</Text>
            </View>
          </View>
          <Text style={ID.returnNote}>{t.returnText.replace("{instituteName}", inst.name)}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Template editor ──────────────────────────────────────────────────────────

type DocTabKey = "admissionLetter" | "transferCert" | "attestation" | "idCard";

const TABS: { key: DocTabKey; label: string }[] = [
  { key: "admissionLetter", label: "Admission Letter" },
  { key: "transferCert", label: "Transfer Cert" },
  { key: "attestation", label: "Attestation" },
  { key: "idCard", label: "ID Card" },
];

const FIELDS: Record<DocTabKey, { key: string; label: string; multiline?: boolean }[]> = {
  admissionLetter: [
    { key: "bodyParagraph1", label: "Welcome Paragraph", multiline: true },
    { key: "bodyParagraph2", label: "Important Information Paragraph", multiline: true },
    { key: "principalTitle", label: "Principal Title" },
    { key: "adminTitle", label: "Admin Officer Title" },
    { key: "adminDept", label: "Admin Department Name" },
  ],
  transferCert: [
    { key: "bodyParagraph1", label: "Opening Paragraph", multiline: true },
    { key: "conductRating", label: "Conduct Rating (e.g. Good, Excellent)" },
    { key: "certifiedText", label: "Certified True Statement", multiline: true },
    { key: "principalTitle", label: "Principal Title" },
    { key: "teacherTitle", label: "Teacher / Co-Signer Title" },
  ],
  attestation: [
    { key: "bodyParagraph1", label: "Main Body Paragraph", multiline: true },
    { key: "bodyParagraph2", label: "Disclaimer Paragraph", multiline: true },
    { key: "principalTitle", label: "Principal Title" },
    { key: "officerTitle", label: "Officer Title" },
    { key: "officerDept", label: "Officer Department" },
  ],
  idCard: [
    { key: "validityPrefix", label: "Validity Text Prefix" },
    { key: "returnText", label: "Return Notice (use {instituteName} for school name)" },
  ],
};

interface TemplateEditorProps {
  templates: DocTemplates;
  student: DocStudent;
  inst: DocInstitute;
  onSave: (t: DocTemplates) => void;
  onReset: () => void;
  onClose: () => void;
}

function TemplateEditor({ templates, student, inst, onSave, onReset, onClose }: TemplateEditorProps) {
  const [draft, setDraft] = useState<DocTemplates>(JSON.parse(JSON.stringify(templates)));
  const [activeTab, setActiveTab] = useState<DocTabKey>("admissionLetter");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function setField(tab: DocTabKey, key: string, value: string) {
    setDraft((prev) => ({
      ...prev,
      [tab]: { ...(prev[tab] as Record<string, string>), [key]: value },
    }));
  }

  function previewDoc(): React.ReactElement<DocumentProps> {
    const p = { student, inst };
    if (activeTab === "admissionLetter") return AdmissionLetterDoc({ ...p, t: draft.admissionLetter }) as unknown as React.ReactElement<DocumentProps>;
    if (activeTab === "transferCert") return TransferCertDoc({ ...p, t: draft.transferCert }) as unknown as React.ReactElement<DocumentProps>;
    if (activeTab === "attestation") return AttestationDoc({ ...p, t: draft.attestation }) as unknown as React.ReactElement<DocumentProps>;
    return StudentIdCardDoc({ ...p, t: draft.idCard }) as unknown as React.ReactElement<DocumentProps>;
  }

  const tabSection = draft[activeTab] as Record<string, string>;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-boxdark" style={{ height: "min(92vh, 760px)" }}>
        {/* Modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
          <div>
            <h2 className="text-base font-semibold text-black dark:text-white">Customize Document Templates</h2>
            <p className="mt-0.5 text-xs text-body">Edit the text used in each document. Changes are saved per institution.</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md text-body transition-colors hover:text-black dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Document type tabs */}
        <div className="shrink-0 border-b border-stroke dark:border-strokedark">
          <div className="flex gap-1 px-6 pt-2">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={[
                  "rounded-t-lg px-4 py-2 text-xs font-medium transition-colors",
                  activeTab === key
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-body hover:text-black dark:hover:text-white",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content area: editor left + preview right */}
        <div className="flex flex-1 overflow-hidden">
          {/* Fields panel */}
          <div className="w-[340px] shrink-0 overflow-y-auto border-r border-stroke p-5 dark:border-strokedark">
            <div className="space-y-4">
              {FIELDS[activeTab].map(({ key, label, multiline }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-medium text-black dark:text-white">{label}</label>
                  {multiline ? (
                    <textarea
                      value={tabSection[key] ?? ""}
                      onChange={(e) => setField(activeTab, key, e.target.value)}
                      rows={4}
                      className="w-full resize-y rounded-lg border border-stroke bg-white px-3 py-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    />
                  ) : (
                    <input
                      value={tabSection[key] ?? ""}
                      onChange={(e) => setField(activeTab, key, e.target.value)}
                      className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview panel */}
          <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-meta-4/30">
            <div className="shrink-0 border-b border-stroke px-4 py-2 dark:border-strokedark">
              <p className="text-xs font-medium text-body">Live Preview</p>
            </div>
            <div className="flex-1 overflow-hidden">
              {mounted ? (
                <PDFViewer width="100%" height="100%" style={{ border: "none" }} showToolbar={false}>
                  {previewDoc()}
                </PDFViewer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-primary" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex shrink-0 items-center justify-between border-t border-stroke px-6 py-4 dark:border-strokedark">
          <button
            onClick={() => { onReset(); setDraft(JSON.parse(JSON.stringify(DEFAULT_TEMPLATES))); }}
            className="flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-xs font-medium text-body transition-colors hover:border-meta-1 hover:text-meta-1 dark:border-strokedark"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to Defaults
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="rounded-lg border border-stroke px-4 py-2 text-xs font-medium text-body transition-colors hover:text-black dark:border-strokedark dark:hover:text-white">
              Cancel
            </button>
            <button
              onClick={() => { onSave(draft); onClose(); }}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-opacity-90"
            >
              <Save className="h-3.5 w-3.5" /> Save Templates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DocumentsPanel ───────────────────────────────────────────────────────────

interface DocumentsPanelProps {
  student: DocStudent;
  institute: DocInstitute | null;
  /** Pass true to show the "Customize Templates" button (admin only) */
  showCustomize?: boolean;
}

export function DocumentsPanel({ student, institute, showCustomize = false }: DocumentsPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [templates, saveTemplates, resetTemplates] = useDocTemplates();
  useEffect(() => setMounted(true), []);

  const inst: DocInstitute = institute ?? { name: "Institution" };
  const regNo = getRegNo(student);

  const docs = [
    {
      key: "admission",
      label: "Admission Letter",
      description: "Official confirmation of student admission with enrollment details.",
      icon: FileText,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      doc: AdmissionLetterDoc({ student, inst, t: templates.admissionLetter }) as unknown as React.ReactElement<DocumentProps>,
      filename: `admission-letter-${regNo}.pdf`,
    },
    {
      key: "transfer",
      label: "Transfer / Leaving Certificate",
      description: "Certificate confirming classes attended, dates and reason for leaving.",
      icon: Award,
      iconColor: "text-meta-5",
      iconBg: "bg-meta-5/10",
      doc: TransferCertDoc({ student, inst, t: templates.transferCert }) as unknown as React.ReactElement<DocumentProps>,
      filename: `transfer-certificate-${regNo}.pdf`,
    },
    {
      key: "attestation",
      label: "Attestation / Enrollment Verification",
      description: "Official letter verifying current or past enrollment status.",
      icon: ShieldCheck,
      iconColor: "text-meta-3",
      iconBg: "bg-meta-3/10",
      doc: AttestationDoc({ student, inst, t: templates.attestation }) as unknown as React.ReactElement<DocumentProps>,
      filename: `attestation-${regNo}.pdf`,
    },
    {
      key: "idcard",
      label: "Student ID Card",
      description: "Printable ID card with student details and academic year.",
      icon: CreditCard,
      iconColor: "text-yellow-600 dark:text-yellow-400",
      iconBg: "bg-yellow-100 dark:bg-yellow-400/10",
      doc: StudentIdCardDoc({ student, inst, t: templates.idCard }) as unknown as React.ReactElement<DocumentProps>,
      filename: `id-card-${regNo}.pdf`,
    },
  ] as const;

  return (
    <>
      {showCustomize && (
        <div className="flex justify-end">
          <button
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-xs font-medium text-body transition-colors hover:border-primary hover:text-primary dark:border-strokedark"
          >
            <Settings className="h-3.5 w-3.5" />
            Customize Templates
          </button>
        </div>
      )}

      <div className="space-y-3">
        {docs.map(({ key, label, description, icon: Icon, iconColor, iconBg, doc, filename }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl border border-stroke bg-white p-4 transition-colors hover:bg-whiter dark:border-strokedark dark:bg-boxdark dark:hover:bg-meta-4/20"
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-black dark:text-white">{label}</p>
                <p className="mt-0.5 text-xs text-body">{description}</p>
              </div>
            </div>

            {mounted ? (
              <PDFDownloadLink document={doc} fileName={filename}>
                {({ loading, error: pdfError }) =>
                  pdfError ? (
                    <span className="ml-4 text-xs text-meta-1">Error</span>
                  ) : (
                    <button
                      disabled={loading}
                      className="ml-4 flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-opacity-90 disabled:opacity-60"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {loading ? "Preparing…" : "Download"}
                    </button>
                  )
                }
              </PDFDownloadLink>
            ) : (
              <button
                disabled
                className="ml-4 flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            )}
          </div>
        ))}
      </div>

      {editorOpen && (
        <TemplateEditor
          templates={templates}
          student={student}
          inst={inst}
          onSave={saveTemplates}
          onReset={resetTemplates}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  );
}
