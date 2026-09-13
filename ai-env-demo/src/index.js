import os from "node:os";
import { fileURLToPath } from "node:url";

export function getEnvironmentSummary() {
  return {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    cpuCores: os.cpus().length,
    memoryGiB: Number((os.totalmem() / 1024 ** 3).toFixed(2))
  };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log("AI environment demo started");
  console.log(JSON.stringify(getEnvironmentSummary(), null, 2));
}
