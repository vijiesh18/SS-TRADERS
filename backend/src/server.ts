import "module-alias/register";
import "dotenv/config";
import { createApp } from "@/app";
import { registerBackupSchedules } from "@/lib/scheduler";

const PORT = process.env.PORT || 4000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`S.S Traders Smart POS API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  registerBackupSchedules();
});
