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
  students: () => downloadCsv("/exports/students", "students.csv"),
  lecturers: () => downloadCsv("/exports/lecturers", "lecturers.csv"),
  feeCollection: () => downloadCsv("/exports/fee-collection", "fee-collection.csv"),
  salary: () => downloadCsv("/exports/salary", "salary.csv"),
  attendanceSummary: () => downloadCsv("/exports/attendance-summary", "attendance-summary.csv"),
  financialRecords: () => downloadCsv("/exports/financial", "financial-records.csv"),
};
