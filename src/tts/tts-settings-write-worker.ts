import path from "node:path";
import {
  finallyRetainedOperation,
  type RetainedOperation,
} from "@openclaw/worker-runtime/lifecycle";
import { resolveStateDir } from "../config/paths.js";
import { resolveRuntimeProcessEntrypointUrl } from "../infra/runtime-process-url.js";
import {
  captureRetainedNativeWorkerSource,
  type RetainedNativeWorkerSource,
} from "../infra/worker-native-lifecycle.js";
import { createOwnedWorkerTaskPool } from "../infra/worker-task-pool.js";
import { resolveGlobalSingleton } from "../shared/global-singleton.js";
import type { TtsUserPrefs } from "./tts-settings.js";

export type TtsPreferenceWrite = {
  prefsPath: string;
  stateDir: string;
  patch: NonNullable<TtsUserPrefs["tts"]>;
};

type TtsPreferenceWriter = {
  pool: ReturnType<typeof createOwnedWorkerTaskPool<TtsPreferenceWrite, void>>;
  pending: Set<RetainedOperation<void>>;
  waitSignal: Int32Array<SharedArrayBuffer>;
  closing: boolean;
};

const owners = resolveGlobalSingleton(
  Symbol.for("openclaw.ttsPreferenceWriters"),
  () => new WeakMap<RetainedNativeWorkerSource, TtsPreferenceWriter>(),
);

function startWrite(
  prefsPath: string,
  patch: TtsPreferenceWrite["patch"],
): { owner: TtsPreferenceWriter; write: RetainedOperation<void> } {
  const source = captureRetainedNativeWorkerSource({ runtimeGeneration: undefined });
  let owner = owners.get(source);
  if (!owner) {
    owner = {
      pool: createOwnedWorkerTaskPool<TtsPreferenceWrite, void>(
        {
          workerUrl: resolveRuntimeProcessEntrypointUrl("ttsPreferences"),
          maxWorkers: 1,
          maxPendingTasks: 256,
          idleTimeoutMs: 60_000,
        },
        { retainedTransport: true, nativeSource: source },
      ),
      pending: new Set(),
      waitSignal: new Int32Array(new SharedArrayBuffer(4)),
      closing: false,
    };
    owners.set(source, owner);
    const retained = owner;
    source.retain(owner, async () => {
      retained.closing = true;
      await Promise.allSettled([...retained.pending].map((write) => write.result));
      await retained.pool.close();
    });
  }
  if (owner.closing) {
    throw new Error("TTS preference writer is closing");
  }
  const task = owner.pool.startTask(
    { prefsPath: path.resolve(prefsPath), stateDir: resolveStateDir(), patch },
    { progressSignal: owner.waitSignal },
  );
  const write = finallyRetainedOperation(task, () => task.release());
  owner.pending.add(write);
  const pending = owner.pending;
  const settled = () => pending.delete(write);
  void write.result.then(settled, settled);
  return { owner, write };
}

/** Retain the private-store boundary until fs-safe's durable async writer is nonblocking. */
export async function updateTtsPrefsAsync(
  prefsPath: string,
  patch: TtsPreferenceWrite["patch"],
): Promise<void> {
  return startWrite(prefsPath, patch).write.result;
}

/** Legacy SDK calls join the same FIFO owner without depending on host Promise reactions. */
export function updateTtsPrefsSync(prefsPath: string, patch: TtsPreferenceWrite["patch"]): void {
  const { owner, write } = startWrite(prefsPath, patch);
  for (;;) {
    const observed = Atomics.load(owner.waitSignal, 0);
    // Release earlier async tasks too: their Promise callbacks cannot run during this wait.
    for (const pending of owner.pending) {
      pending.service();
      if (pending.read().status !== "pending") {
        owner.pending.delete(pending);
      }
    }
    const outcome = write.read();
    if (outcome.status === "fulfilled") {
      return;
    }
    if (outcome.status === "rejected") {
      throw outcome.error;
    }
    Atomics.wait(owner.waitSignal, 0, observed, 2);
  }
}
