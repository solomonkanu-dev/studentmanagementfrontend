// ─── Auth ────────────────────────────────────────────────────────────────────

export type Role = "super_admin" | "admin" | "lecturer" | "student" | "parent";

export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  role: Role;
  approved: boolean;
  isActive: boolean;
  lifecycleStatus?: "active" | "graduated" | "transferred" | "withdrawn";
  lifecycleNote?: string;
  lifecycleUpdatedAt?: string;
  institute?: string | { _id: string; name: string; schoolType?: SchoolType; onboardingCompleted?: boolean };
  class?: string;
  profilePhoto?: string;
  studentProfile?: StudentProfile;
  lecturerProfile?: LecturerProfile;
  linkedStudents?: LinkedStudent[];
  emailOptOut?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LinkedStudent {
  _id: string;
  fullName: string;
  profilePhoto?: string;
  class?: { _id: string; name: string } | string;
  studentProfile?: StudentProfile;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ─── Institute ────────────────────────────────────────────────────────────────

export type SchoolType = 'primary' | 'secondary';

export interface Institute {
  _id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email?: string;
  website?: string;
  country?: string;
  targetLine?: string;
  logo?: string;
  admin: string;
  schoolType?: SchoolType;
  onboardingCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── User Profiles ────────────────────────────────────────────────────────────

export interface GuardianInfo {
  name?: string;
  relation?: string;
  phone?: string;
  occupation?: string;
}

export interface StudentProfile {
  registrationNumber?: string;
  admissionDate?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  bloodGroup?: string;
  religion?: string;
  isOrphan?: boolean;
  previousSchool?: string;
  familyType?: string;
  medicalInfo?: string;
  guardian?: GuardianInfo;
}

export interface LecturerProfile {
  employeeId?: string;
  department?: string;
  position?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  phoneNumber?: string;
  address?: string;
}

// ─── Class ────────────────────────────────────────────────────────────────────

export interface Class {
  _id: string;
  name: string;
  institute: string;
  lecturer?: string | AuthUser;
  students?: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Subject ─────────────────────────────────────────────────────────────────

export interface Subject {
  _id: string;
  name: string;
  code?: string;
  class: string | Class;
  lecturer?: string | AuthUser;
  institute: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Assignment ───────────────────────────────────────────────────────────────

export interface Assignment {
  _id: string;
  title: string;
  description?: string;
  subject: string | Subject;
  class?: string | { _id: string; name: string };
  dueDate?: string;
  totalMarks?: number;
  status?: string;
  createdBy: string | AuthUser;
  institute: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Submission ───────────────────────────────────────────────────────────────

export interface Submission {
  _id: string;
  assignment: string | Assignment;
  student: string | AuthUser;
  fileUrl?: string;
  content?: string;
  score?: number;
  feedback?: string;
  status?: "submitted" | "graded" | "resubmitted";
  isLate?: boolean;
  submittedAt: string;
  gradedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  _id: string;
  student: string | AuthUser;
  subject: string | Subject;
  date: string;
  status: "present" | "absent" | "late";
  institute: string;
  createdAt: string;
}

export interface AttendanceSummary {
  subjectId: string;
  subjectName: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

// ─── Fee Structure ────────────────────────────────────────────────────────────

export interface FeeParticular {
  label: string;
  amount: number;
}

export interface FeeStructure {
  _id: string;
  category: "all" | "class" | "student";
  classId?: string | { _id: string; name: string };
  studentId?: string | { _id: string; fullName: string };
  particulars: FeeParticular[];
  totalAmount: number;
  instituteId: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFee {
  _id: string;
  student: string | AuthUser;
  feeStructure: string | FeeStructure;
  amount: number;
  paid: boolean;
  dueDate?: string;
  paidAt?: string;
  institute: string;
  createdAt: string;
}

// ─── Salary ───────────────────────────────────────────────────────────────────

export interface Salary {
  _id: string;
  lecturer: string | AuthUser;
  institute: string;
  role: "lecturer" | "admin";
  salaryMonth: string;
  date: string;
  salary: number;
  bonus: number;
  deduction: number;
  totalAmount: number;
  remarks?: string;
  status: "pending" | "paid" | "cancelled";
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Account ─────────────────────────────────────────────────────────────────

export interface Account {
  _id: string;
  name: string;
  type?: string;
  balance?: number;
  isActive: boolean;
  institute: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceAccount {
  _id: string;
  bankName: string;
  bankAddress: string;
  bankNo: string;
  bankLogo?: string;
  instructions?: string;
  accountHolderName?: string;
  routingNumber?: string;
  swiftCode?: string;
  isActive: boolean;
  institute: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Result ───────────────────────────────────────────────────────────────────

export interface Result {
  _id: string;
  student: string | AuthUser;
  subject: string | Subject;
  class: string | Class;
  marksObtained: number;
  totalScore?: number;
  grade?: string;
  institute: string;
  isPublished: boolean;
  createdAt: string;
}

// ─── Academic Term ────────────────────────────────────────────────────────────

export interface AcademicTerm {
  _id: string;
  name: string;
  type: "term" | "semester";
  academicYear: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  institute: string;
  createdAt: string;
}

// ─── Exam ─────────────────────────────────────────────────────────────────────

export interface Exam {
  _id: string;
  title: string;
  subject: string | Subject;
  class: string | Class;
  term: string | AcademicTerm;
  institute: string;
  date: string;
  startTime: string;
  endTime: string;
  examType: "written" | "oral" | "practical" | "test";
  totalMarks: number;
  venue: string;
  instructions: string;
  status: "upcoming" | "ongoing" | "completed";
  createdBy: string | AuthUser;
  createdAt: string;
  updatedAt: string;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export interface Theme {
  _id: string;
  name: string;
  description?: string;
  institute: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  dark: string;
  light: string;
  fontFamily: string;
  fontSize: number;
  logo?: string;
  favicon?: string;
  backgroundImage?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Grading ──────────────────────────────────────────────────────────────────

export interface GradeEntry {
  grade: string;
  minScore: number;
  maxScore: number;
}

export interface GradingScale {
  _id: string;
  name: string;
  grades: GradeEntry[];
  isDefault: boolean;
  institute: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Fee Analysis ─────────────────────────────────────────────────────────────

export interface FeeSummary {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  totalStudents: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  collectionRate: number;
}

export interface FeeByClass {
  classId: string;
  className: string;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  totalStudents: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  collectionRate: number;
}

export interface FeeByStatus {
  status: string;
  count: number;
  totalAmount: number;
  totalCollected: number;
  totalOutstanding: number;
}

export interface FeeDefaulter {
  _id: string;
  student: {
    _id: string;
    fullName: string;
    email: string;
    studentProfile?: { registrationNumber?: string };
  };
  class: { _id: string; name: string };
  totalAmount: number;
  balance: number;
  status: string;
}

export interface FeeCollectionTrend {
  year: number;
  month: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  studentCount: number;
}

// ─── Super Admin ──────────────────────────────────────────────────────────────

export interface SuperAdminStats {
  admins: { total: number; approved: number; pending: number };
  institutes: { total: number };
  students: { total: number };
  lecturers: { total: number };
}

export interface PendingAdmin {
  _id: string;
  fullName: string;
  email: string;
  approved: boolean;
  isActive: boolean;
  institute?: { _id: string; name: string } | null;
  createdAt: string;
}

// ─── System Monitor ───────────────────────────────────────────────────────────

export interface SystemOverview {
  institutes: { total: number; active: number; inactive: number };
  admins: { total: number; active: number; suspended: number; pending: number };
  students: { total: number; active: number; suspended: number };
  lecturers: { total: number; active: number; suspended: number };
  fees: { totalBilled: number; totalCollected: number; totalOutstanding: number };
  salaries: { totalPaid: number; totalPending: number; totalDisbursed: number };
}

export interface InstituteHealthReport {
  institute: { id: string; name: string; email?: string };
  users: { students: number; lecturers: number; admins: number };
  academics: { classes: number; subjects: number };
  fees: { totalBilled: number; totalCollected: number; outstanding: number; paidCount: number; unpaidCount: number };
  salaries: { totalDisbursed: number };
}

export interface InstituteDeepReport {
  institute: { id: string; name: string; email?: string; createdAt: string };
  users: { role: string; total: number; active: number; suspended: number }[];
  academics: { classes: number; subjects: number; assignments: number; results: number; attendanceRecords: number };
  fees: { totalBilled: number; totalCollected: number; outstanding: number; paidCount: number; partialCount: number; unpaidCount: number };
  salaries: { totalDisbursed: number; totalPaid: number; totalPending: number };
}

export interface GrowthPoint { year: number; month: number; count: number }
export interface GrowthTrends {
  institutes: GrowthPoint[];
  admins: GrowthPoint[];
  students: GrowthPoint[];
  lecturers: GrowthPoint[];
}

export interface FeeRevenueReport {
  summary: {
    totalBilled: number; totalCollected: number; totalOutstanding: number;
    totalRecords: number; paidCount: number; partialCount: number; unpaidCount: number;
    collectionRate: number;
  };
  byStatus: { status: string; count: number; totalAmount: number; outstanding: number }[];
  topInstitutes: { instituteName: string; totalBilled: number; totalCollected: number; outstanding: number }[];
}

export interface SalaryExpenditureReport {
  summary: {
    totalDisbursed: number; totalPaid: number; totalPending: number;
    totalRecords: number; paidCount: number; pendingCount: number;
  };
  byStatus: { status: string; count: number; totalAmount: number }[];
  byInstitute: { instituteName: string; totalDisbursed: number; totalPaid: number; totalPending: number; staffCount: number }[];
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  _id: string;
  user?: string;
  userFullName: string;
  userEmail: string;
  role: "super_admin" | "admin" | "lecturer" | "student";
  institute?: string;
  action: string;
  entity?: string;
  entityId?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogSummary {
  byAction: { action: string; count: number }[];
  byRole: { role: string; count: number }[];
  recentActivity: AuditLog[];
}

export interface AuditLogParams {
  page?: number;
  limit?: number;
  action?: string;
  userRole?: string;
  userId?: string;
  instituteId?: string;
  startDate?: string;
  endDate?: string;
  entity?: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  _id: string;
  user: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  link?: string;
  institute?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Announcement ─────────────────────────────────────────────────────────────

export type AnnouncementType = "system_wide" | "institute_specific";
export type AnnouncementRole = "admin" | "lecturer" | "student" | "super_admin";

export interface AnnouncementReadEntry {
  user: string;
  readAt: string;
}

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  targetRoles: AnnouncementRole[];
  institute?: string;
  createdBy?: string;
  expiresAt?: string;
  isActive: boolean;
  readBy?: AnnouncementReadEntry[];
  isRead?: boolean; // computed by backend for current user
  createdAt: string;
  updatedAt: string;
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface Plan {
  _id: string;
  name: string;
  displayName?: string;
  isActive?: boolean;
  price?: number;
  description?: string;
  limits: {
    maxStudents: number;
    maxLecturers: number;
    maxClasses: number;
    maxStorageMB?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InstitutePlan {
  plan: Plan;
  institute: string;
  assignedAt: string;
  planExpiry?: string | null;
  subscription?: { assignedAt: string; assignedBy?: string };
  usage?: {
    students: { current: number; max: number };
    lecturers: { current: number; max: number };
    classes: { current: number; max: number };
  };
}

// ─── System Config ────────────────────────────────────────────────────────────

export interface MaintenanceStatus {
  globalMaintenance: boolean;
  instituteMaintenance?: boolean;
  message?: string;
}

// ─── Timetable ────────────────────────────────────────────────────────────────

export type WeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export interface TimetableEntry {
  _id?: string;
  day: WeekDay;
  startTime: string;
  endTime: string;
  subject: { _id: string; name: string } | string;
  lecturer: { _id: string; fullName: string } | string;
}

export interface Timetable {
  _id: string;
  class: { _id: string; name: string } | string;
  entries: TimetableEntry[];
  createdAt: string;
  updatedAt: string;
}

// ─── Academic Calendar ────────────────────────────────────────────────────────

export type CalendarEventType = "holiday" | "exam" | "event" | "term-start" | "term-end" | "other";

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: CalendarEventType;
  institute: string;
  createdAt: string;
  updatedAt: string;
}

// ─── QR Attendance ────────────────────────────────────────────────────────────

export interface StudentQR {
  _id: string;
  fullName: string;
  registrationNumber?: string;
  qrToken: string;
  qrActive: boolean;
}

export interface QRSessionStudent {
  _id: string;
  fullName: string;
  registrationNumber?: string;
  status: "present" | "absent" | null;
}

export interface QRSession {
  class: { _id: string; name: string };
  date: string;
  finalized: boolean;
  students: QRSessionStudent[];
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ─── Online User Reports ──────────────────────────────────────────────────────

export interface DailyOnlineEntry {
  date: string;
  dayOfWeek: number;  // 0 = Sun … 6 = Sat
  peakCounts: { student: number; lecturer: number; parent: number; admin: number };
  peakTotal: number;
  avgTotal: number;
  snapshotsTaken: number;
}

export interface OnlineUserReport {
  _id: string;
  weekStart: string;
  weekEnd: string;
  days: DailyOnlineEntry[];
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OnlineReportListResponse {
  success: boolean;
  data: OnlineUserReport[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}
