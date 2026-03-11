import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

export type OTAPhase = "idle" | "available" | "downloading" | "ready" | "error";

export interface OTAState {
  phase: OTAPhase;
  progress: number;
  error: string | null;
  startDownload: () => void;
  applyUpdate: () => void;
  dismiss: () => void;
}

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const DISMISS_DELAY_MS = 60 * 60 * 1000;

export function useOTAUpdates(): OTAState {
  const [phase, setPhase] = useState<OTAPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const dismissedUntil = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const updates = Updates.useUpdates();

  const progress = updates.downloadProgress ?? 0;
  const isDownloading = updates.isDownloading;
  const isPending = updates.isUpdatePending;
  const isAvailable = updates.isUpdateAvailable;

  useEffect(() => {
    if (isPending && phase !== "ready") {
      setPhase("ready");
    } else if (isDownloading && phase !== "downloading") {
      setPhase("downloading");
    } else if (isAvailable && phase === "idle" && Date.now() >= dismissedUntil.current) {
      setPhase("available");
    }
  }, [isAvailable, isDownloading, isPending, phase]);

  useEffect(() => {
    if (updates.checkError && phase !== "error") {
      setError(updates.checkError.message);
      setPhase("error");
    }
    if (updates.downloadError && phase !== "error") {
      setError(updates.downloadError.message);
      setPhase("error");
    }
  }, [updates.checkError, updates.downloadError, phase]);

  const check = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled) return;
    if (Date.now() < dismissedUntil.current) return;
    if (phase === "downloading" || phase === "ready") return;

    try {
      await Updates.checkForUpdateAsync();
    } catch {
      // Silently ignore network failures during background checks
    }
  }, [phase]);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    check();

    intervalRef.current = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [check]);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => sub.remove();
  }, [check]);

  const startDownload = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled) return;

    setPhase("downloading");
    setError(null);
    try {
      await Updates.fetchUpdateAsync();
    } catch (e: any) {
      setError(e?.message ?? "Download failed");
      setPhase("error");
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (e: any) {
      setError(e?.message ?? "Restart failed");
      setPhase("error");
    }
  }, []);

  const dismiss = useCallback(() => {
    dismissedUntil.current = Date.now() + DISMISS_DELAY_MS;
    setPhase("idle");
    setError(null);
  }, []);

  return { phase, progress, error, startDownload, applyUpdate, dismiss };
}
