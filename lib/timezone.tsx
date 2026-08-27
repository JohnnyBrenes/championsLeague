"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { browserTz, STADIUM_TZ } from "./time";

/**
 * "local" — the visitor's own zone, the default. Champions League matches are
 * European evenings, which in the Americas land in the morning and early
 * afternoon, so showing "21:00" to someone watching at 13:00 is confusing.
 * "stadium" — central European time, i.e. the clock in the ground.
 */
export type TzMode = "local" | "stadium";

const STORAGE_KEY = "ucl2627-tz";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): TzMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "stadium"
      ? "stadium"
      : "local";
  } catch {
    return "local";
  }
}

/**
 * Prerendering has no visitor and no browser zone, so it must not resolve
 * "local" — the build machine's clock (UTC on the CI runner) would be baked
 * into the HTML. The stadium zone is the one deterministic answer; the client
 * swaps to the real preference on hydration.
 */
function getServerSnapshot(): TzMode {
  return "stadium";
}

function persist(mode: TzMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode / storage disabled — the choice just won't be remembered.
  }
  listeners.forEach((cb) => cb());
}

/** Resolve a mode to an IANA timezone string for Intl formatting. */
export function resolveTz(mode: TzMode): string {
  return mode === "stadium" ? STADIUM_TZ : browserTz();
}

type TimezoneContextValue = {
  mode: TzMode;
  tz: string;
  setMode: (m: TzMode) => void;
};

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const tz = resolveTz(mode);
  const setMode = (m: TzMode) => persist(m);

  return (
    <TimezoneContext.Provider value={{ mode, tz, setMode }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone(): TimezoneContextValue {
  const ctx = useContext(TimezoneContext);
  if (!ctx)
    throw new Error("useTimezone must be used within a TimezoneProvider");
  return ctx;
}
