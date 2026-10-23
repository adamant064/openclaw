# Beta UI observations — 2026.10.10-beta.3

Written from daily operator use of the Control UI on the beta channel (Linux
Gateway, 28 containers, multiple paired nodes). Not a bug report — a summary of
what the recent beta UI work feels like from the operator seat.

## What works well

- **Iteration speed is visible and non-disruptive.** The UI changes often on
  beta, but the changes are pleasant: layout and affordances get refined rather
  than rearranged. Nothing had to be relearned between updates.
- **Collapsible sidebar.** Collapsing it to a rail keeps the session list one
  click away while giving the transcript the full width. This is the single
  biggest quality-of-life improvement for long sessions.
- **Tabs can be pulled out separately.** Keeping a second session or a
  dashboard in its own tab/window removes the "scroll back to find your place"
  tax when switching between two long-running conversations.
- **System pulse (load).** Seeing Gateway load next to the session makes the
  difference between "the model is thinking" and "the box is busy" obvious
  without opening a terminal.
- **"Details" side button.** A compact session overview (model, session key,
  usage, current state) on demand. It answers the "what am I actually talking
  to right now" question without leaving the conversation, and it stays out of
  the way when it is not needed.

## Why it matters

For an operator who keeps one Gateway running production services and several
agent sessions, the recurring cost is context switching, not raw model quality.
Collapsible navigation, separate tabs and an on-demand details panel each remove
one switch. The pulse indicator removes a whole class of false alarms.

## Suggestions (low priority)

- Remember the collapsed/expanded sidebar state across reloads and devices.
- In the details panel, show the retained context size for the session — that
  number drives cost more than token counters do.
- If tabs are detached, a visible marker in the main window would help find
  them again after an update.
