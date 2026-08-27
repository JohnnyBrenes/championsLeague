"use client";

import { useI18n } from "@/lib/i18n";
import { slotLabelText, teamById, teamName } from "@/lib/data";
import type { Team } from "@/lib/types";

/**
 * Club crest at a fixed box size.
 *
 * Crests are downloaded to /crests by the sync, so they are same-origin and
 * work offline in the PWA. They sit on a light disc because many crests are
 * dark and would disappear against a dark surface. When one is missing we fall
 * back to the club's three-letter code rather than a broken image.
 */
export function Crest({
  team,
  size = 24,
}: {
  team: Team | undefined;
  size?: number;
}) {
  const box = { width: size, height: size };

  if (!team?.crest) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-line text-[0.55em] font-bold text-muted"
        style={box}
        aria-hidden
      >
        {team?.tla || "—"}
      </span>
    );
  }

  return (
    /* Plain <img> on purpose: the static export has no image optimizer, and
       these are already small local PNGs. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={team.crest}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="shrink-0 rounded-full bg-white/90 object-contain p-0.5"
      style={box}
    />
  );
}

export default function TeamBadge({
  id,
  label,
  align = "left",
  size = 24,
}: {
  id: number | null;
  /** Text for a knockout slot with no team yet. */
  label?: string;
  align?: "left" | "right";
  size?: number;
}) {
  const { locale, t } = useI18n();
  const team = teamById(id);
  const name = team ? teamName(team, locale) : slotLabelText(label, t);

  return (
    <div
      className={`flex items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <Crest team={team} size={size} />
      <span
        className={`font-semibold ${team ? "" : "italic text-muted"}`}
        title={name}
      >
        {name}
      </span>
    </div>
  );
}
