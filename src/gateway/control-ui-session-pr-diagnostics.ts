import { channel } from "node:diagnostics_channel";
import type { ControlUiSessionPrTarget } from "./control-ui-session-pr-read.js";

const diagnostics = channel("openclaw.gateway.session-pr");

/** Opt-in phase facts only: no credentials, repository paths, or PR content. */
export function recordSessionPrDiagnostic(
  phase: string,
  target?: ControlUiSessionPrTarget,
  details?: { count?: number; current?: boolean },
): void {
  if (diagnostics.hasSubscribers) {
    diagnostics.publish({
      phase,
      sessionKey: target?.params.sessionKey,
      receiptsOnly: target?.taskReceiptsOnly === true,
      ...details,
    });
  }
}
