// src/validation/bydRim01/history.ts
//
// Spike-local Undo/Redo/Return-to-Original/failure-injection state machine
// for the single B_Rim diagnostic color. Pure data + reducer — no React,
// no Three.js — so applying it to the actual material is a separate,
// explicit step the caller performs after every transition.

export type BydRimHistoryEntryKind = "original" | "bright" | "dark" | "custom";

export interface BydRimHistoryEntry {
  kind: BydRimHistoryEntryKind;
  // null only for "original" — the material's captured pre-spike values.
  colorHex: string | null;
  label: string;
}

export interface BydRimHistoryState {
  entries: BydRimHistoryEntry[];
  pointer: number;
  // Set while a failure is injected and not yet restored. While true, the
  // history pointer is frozen — Undo/Redo/Apply are rejected until
  // restoreAfterFailure() runs, mirroring "restoration must be exact"
  // before any further operation is trusted.
  failureInjected: boolean;
  lastKnownGoodPointer: number;
}

export const ORIGINAL_ENTRY: BydRimHistoryEntry = {
  kind: "original",
  colorHex: null,
  label: "Original",
};

export function createInitialHistory(): BydRimHistoryState {
  return {
    entries: [ORIGINAL_ENTRY],
    pointer: 0,
    failureInjected: false,
    lastKnownGoodPointer: 0,
  };
}

export type BydRimHistoryAction =
  | { type: "apply"; kind: "bright" | "dark" | "custom"; colorHex: string; label: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "returnToOriginal" }
  | { type: "injectFailure" }
  | { type: "restoreAfterFailure" };

export interface BydRimHistoryTransitionResult {
  next: BydRimHistoryState;
  rejected: boolean;
  reason?: string;
}

export function reduceBydRimHistory(
  state: BydRimHistoryState,
  action: BydRimHistoryAction,
): BydRimHistoryTransitionResult {
  if (state.failureInjected && action.type !== "restoreAfterFailure") {
    return {
      next: state,
      rejected: true,
      reason: "A failure is injected; run Restore After Failure before any other operation.",
    };
  }

  switch (action.type) {
    case "apply": {
      // Truncate any redo branch, then push the new entry — standard
      // linear undo/redo semantics (one commit per confirmed action, no
      // history entries from intermediate/uncommitted state).
      const truncated = state.entries.slice(0, state.pointer + 1);
      const nextEntries = [
        ...truncated,
        { kind: action.kind, colorHex: action.colorHex, label: action.label },
      ];
      const pointer = nextEntries.length - 1;
      return {
        next: { ...state, entries: nextEntries, pointer, lastKnownGoodPointer: pointer },
        rejected: false,
      };
    }
    case "undo": {
      if (state.pointer <= 0) {
        return { next: state, rejected: true, reason: "Already at Original; nothing to undo." };
      }
      const pointer = state.pointer - 1;
      return {
        next: { ...state, pointer, lastKnownGoodPointer: pointer },
        rejected: false,
      };
    }
    case "redo": {
      if (state.pointer >= state.entries.length - 1) {
        return {
          next: state,
          rejected: true,
          reason: "Already at the newest entry; nothing to redo.",
        };
      }
      const pointer = state.pointer + 1;
      return {
        next: { ...state, pointer, lastKnownGoodPointer: pointer },
        rejected: false,
      };
    }
    case "returnToOriginal": {
      return {
        next: {
          entries: [ORIGINAL_ENTRY],
          pointer: 0,
          failureInjected: false,
          lastKnownGoodPointer: 0,
        },
        rejected: false,
      };
    }
    case "injectFailure": {
      // Simulates an operation that fails mid-way: the pointer is
      // deliberately NOT moved and no entry is appended, so the current
      // (pre-failure) material state is what must still be showing.
      return {
        next: { ...state, failureInjected: true },
        rejected: false,
      };
    }
    case "restoreAfterFailure": {
      if (!state.failureInjected) {
        return { next: state, rejected: true, reason: "No failure is currently injected." };
      }
      return {
        next: { ...state, failureInjected: false, pointer: state.lastKnownGoodPointer },
        rejected: false,
      };
    }
    default:
      return { next: state, rejected: true, reason: "Unknown action." };
  }
}

export function currentEntry(state: BydRimHistoryState): BydRimHistoryEntry {
  return state.entries[state.pointer];
}
