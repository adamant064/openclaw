import { resolveStateDir } from "../config/paths.js";
// TTS preference mutations stay off the agent prompt's read-only import path.
import type { TtsAutoMode, TtsProvider } from "../config/types.js";
import { writePrivateTextFileAtomicSync } from "../infra/private-file-store.js";
import { canonicalizeSpeechProviderId } from "./provider-registry.js";
import { normalizeTtsPersonaId, readTtsPrefs, type TtsUserPrefs } from "./tts-settings.js";

export function updateTtsPrefs(
  prefsPath: string,
  patch: NonNullable<TtsUserPrefs["tts"]>,
  stateDir = resolveStateDir(),
): void {
  const prefs = readTtsPrefs(prefsPath, { forUpdate: true });
  const tts = { ...prefs.tts, ...patch };
  if (patch.auto !== undefined) {
    delete tts.enabled;
  }
  if (Object.hasOwn(patch, "persona")) {
    tts.persona = normalizeTtsPersonaId(patch.persona) ?? null;
  }
  prefs.tts = tts;
  writePrivateTextFileAtomicSync(prefsPath, JSON.stringify(prefs, null, 2), stateDir);
}

export function setTtsAutoMode(prefsPath: string, mode: TtsAutoMode): void {
  updateTtsPrefs(prefsPath, { auto: mode });
}

export function setTtsEnabled(prefsPath: string, enabled: boolean): void {
  setTtsAutoMode(prefsPath, enabled ? "always" : "off");
}

export function setTtsPersona(prefsPath: string, persona: string | null | undefined): void {
  updateTtsPrefs(prefsPath, { persona: persona ?? null });
}

export function setTtsProvider(prefsPath: string, provider: TtsProvider): void {
  updateTtsPrefs(prefsPath, { provider: canonicalizeSpeechProviderId(provider) ?? provider });
}

export function setTtsMaxLength(prefsPath: string, maxLength: number): void {
  updateTtsPrefs(prefsPath, { maxLength });
}

export function setSummarizationEnabled(prefsPath: string, enabled: boolean): void {
  updateTtsPrefs(prefsPath, { summarize: enabled });
}
