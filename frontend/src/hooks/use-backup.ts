import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Backup {
  id: string;
  fileName: string;
  type: "DAILY" | "WEEKLY" | "MANUAL";
  status: "PENDING" | "COMPLETED" | "FAILED" | "RESTORED";
  sizeBytes?: number | null;
  createdAt: string;
  createdBy?: { name: string } | null;
}

export function useBackups() {
  return useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const { data } = await api.get("/backup");
      return data.items as Backup[];
    },
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/backup/create");
      return data as Backup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
  });
}

export async function downloadBackup(backup: Backup) {
  const res = await api.get(`/backup/${backup.id}/download`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", backup.fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

interface RestoreResult {
  message: string;
  backup: Backup;
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("backupFile", file);
      const { data } = await api.post("/backup/restore", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as RestoreResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // restore can affect almost everything
    },
  });
}
