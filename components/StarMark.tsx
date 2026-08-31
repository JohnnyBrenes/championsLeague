/**
 * The star outline, exported so the favourite toggle can draw the same shape
 * hollow or filled instead of carrying a second, slightly different star.
 */
export const STAR_PATH =
  "M0,-11 L2.82,-3.88 L11.41,-3.71 L4.57,1.48 L7.05,9.71 L0,4.8 L-7.05,9.71 L-4.57,1.48 L-11.41,-3.71 L-2.82,-3.88 Z";

/**
 * The site's mark: a single five-pointed star.
 *
 * Deliberately our own and deliberately simple. The competition's real emblem
 * is a ball made of stars and is a registered trademark — this is one plain
 * geometric star, which is generic imagery we are free to use. Do not add a
 * ball, a ring of stars, or anything that starts to resemble the official
 * mark. See CHAMPIONS_MIGRATION.md §6.1.
 */
export default function StarMark({
  size = 30,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  );
}
