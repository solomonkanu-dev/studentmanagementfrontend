import { apiClient } from "./client";

async function downloadCsv(url: string, filename: string) {
  const response = await apiClient.get(url, { responseType: "blob" });
  const blob = new Blob([response.data], { type: "text/csv" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export const exportApi = {
  students: () => downloadCsv("/export/students", "students.csv"),
  lecturers: () => downloadCsv("/export/lecturers", "lecturers.csv"),
  feeCollection: () => downloadCsv("/export/fee-collection", "fee-collection.csv"),
  salary: () => downloadCsv("/export/salary", "salary.csv"),
  attendanceSummary: () => downloadCsv("/export/attendance-summary", "attendance-summary.csv"),
};
