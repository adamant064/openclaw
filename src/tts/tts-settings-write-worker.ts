import path from "node:path";
import { resolveStateDir } from "../config/paths.js";
import { resolveRuntimeProcessEntrypointUrl } from "../infra/runtime-process-url.js";
import { WorkerTaskPool } from "../infra/worker-task-pool.js";
import { resolveGlobalSingleton } from "../shared/global-singleton.js";
import type { TtsUserPrefs } from "./tts-settings.js";

export type TtsPreferenceWrite = {
  prefsPath: string;
  stateDir: string;
  patch: NonNullable<TtsUserPrefs["tts"]>;
};

type TtsPreferenceWriter = {
  pool?: WorkerTaskPool<TtsPreferenceWrite, void>;
  pending: Set<Promise<void>>;
  closing: boolean;
};

/** Retain the private-store boundary until fs-safe's durable async writer is nonblocking. */
export function updateTtsPrefsAsync(
  prefsPath: string,
  patch: TtsPreferenceWrite["patch"],
): Promise<void> {
  const owner = resolveGlobalSingleton<TtsPreferenceWriter>(
    Symbol.for("openclaw.ttsPreferenceWriter"),
    () => ({
      pending: new Set<Promise<void>>(),
      closing: false,
    }),
    async (state) => {
      state.closing = true;
      await Promise.allSettled(state.pending);
      await state.pool?.close();
      state.pool = undefined;
      state.closing = false;
    },
  );
  if (owner.closing) {
    return Promise.reject(new Error("TTS preference writer is closing"));
  }
  const pool = (owner.pool ??= new WorkerTaskPool<TtsPreferenceWrite, void>({
    workerUrl: resolveRuntimeProcessEntrypointUrl("ttsPreferences"),
    maxWorkers: 1,
    maxPendingTasks: 256,
    idleTimeoutMs: 60_000,
  }));
  const write = pool.run(
    { prefsPath: path.resolve(prefsPath), stateDir: resolveStateDir(), patch },
    {},
  );
  owner.pending.add(write);
  const settled = () => owner.pending.delete(write);
  void write.then(settled, settled);
  return write;
}
