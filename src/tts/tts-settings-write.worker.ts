import { serveWorkerTasks } from "../infra/worker-task-server.js";
import type { TtsPreferenceWrite } from "./tts-settings-write-worker.js";
import { updateTtsPrefs } from "./tts-settings-writes.js";

serveWorkerTasks<void, TtsPreferenceWrite>(({ prefsPath, stateDir, patch }) => {
  updateTtsPrefs(prefsPath, patch, stateDir);
});
