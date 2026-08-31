"use client";

import { useSyncExternalStore } from "react";
import { teams } from "./data";

/**
 * The visitor's club, kept in localStorage and nowhere else.
 *
 * The site is a static export: there is no server, no account and no request
 * that could carry this anywhere, so the choice lives in the browser that made
 * it and is invisible to every other visitor. Same trade-off as the language
 * and the clock (see lib/i18n.tsx, lib/timezone.tsx): it is per-device and it
 * is lost with a cleared site or a private window, which is acceptable for a
 * cosmetic preference and is why nothing here may be load-bearing.
 *
 * No provider on purpose. i18n and timezone wrap a context because they derive
 * a value (a dictionary, a resolved zone); a club id derives nothing, so the
 * module-level store plus a hook is the whole thing.
 */
const STORAGE_KEY = "ucl2627-fav";

const listeners = new Set<() => void>();
const KNOWN_IDS = new Set(teams.map((t) => t.id));

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const id = Number(raw);
    // A club is only in the competition for the season it qualified for.
    // Someone who picked a favourite last season and comes back to a new draw
    // can be pointing at a club that is no longer in the 36, so the stored id
    // is checked against the squad we actually ship instead of being trusted.
    return KNOWN_IDS.has(id) ? id : null;
  } catch {
    // Private mode / storage disabled.
    return null;
  }
}

/** Prerendering has no browser and therefore no club: the client fills it in. */
function getServerSnapshot(): number | null {
  return null;
}

function persist(id: number | null) {
  try {
    if (id === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // The choice just won't be remembered.
  }
  listeners.forEach((cb) => cb());
}

export function useFavorite() {
  const favorite = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return {
    favorite,
    setFavorite: (id: number | null) => persist(id),
    /** Clicking the club that is already the favourite clears it. */
    toggle: (id: number) => persist(favorite === id ? null : id),
  };
}
