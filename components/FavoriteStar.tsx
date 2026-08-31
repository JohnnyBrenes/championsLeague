"use client";

import { useI18n } from "@/lib/i18n";
import { useFavorite } from "@/lib/favorite";
import { STAR_PATH } from "./StarMark";

/**
 * Toggle that makes a club the visitor's own. Filled star = chosen.
 *
 * The star is never the only signal: the button always carries its label, so
 * the state is readable without relying on the shape or on colour.
 */
export default function FavoriteStar({ teamId }: { teamId: number }) {
  const { t } = useI18n();
  const { favorite, toggle } = useFavorite();
  const active = favorite === teamId;

  return (
    <button
      type="button"
      onClick={() => toggle(teamId)}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-gold bg-highlight text-gold"
          : "border-line bg-surface text-muted hover:border-gold/60 hover:text-gold"
      }`}
    >
      <svg
        width={16}
        height={16}
        viewBox="-12 -12 24 24"
        aria-hidden
        focusable="false"
      >
        <path
          d={STAR_PATH}
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={active ? 0 : 2}
          strokeLinejoin="round"
        />
      </svg>
      {t(active ? "favorite.remove" : "favorite.add")}
    </button>
  );
}
