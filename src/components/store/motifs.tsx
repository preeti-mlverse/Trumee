/**
 * Brand artwork drawn in code (no image files): a schiffli-style scalloped lace edge, a faint
 * block-print stamp pattern for panel backgrounds, and slow-drifting botanical line doodles.
 */
import { cn } from "@/lib/utils";

/** Scalloped eyelet edge — sits on top of a coloured panel so its border reads like a lace hem. */
export function ScallopEdge({ color, className, flip }: { color: string; className?: string; flip?: boolean }) {
  return (
    <div aria-hidden className={cn("pointer-events-none h-4 sm:h-5 w-full", flip && "rotate-180", className)} style={{ color }}>
      <svg className="size-full" preserveAspectRatio="none" viewBox="0 0 40 20">
        <defs>
          <pattern id="scallop" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 20 Q10 0 20 20 Q30 0 40 20 Z" fill="currentColor" />
            <circle cx="10" cy="13" r="1.6" fill="var(--color-cream)" opacity="0.55" />
            <circle cx="30" cy="13" r="1.6" fill="var(--color-cream)" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#scallop)" />
      </svg>
    </div>
  );
}

/** Hand-block-print stamp (paisley bud + dots) as a tiling CSS background. */
export function blockPrint(color: string, opacity = 0.08) {
  const c = encodeURIComponent(color);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><g fill='none' stroke='${c}' stroke-opacity='${opacity}' stroke-width='1.4'><path d='M30 62c-12-2-16-16-8-25 7-8 21-6 24 4 3 9-4 18-14 17-6 0-9-6-6-10'/><circle cx='29' cy='44' r='3'/><path d='M66 22c4 6 4 12 0 17-4-5-4-11 0-17zM66 39v9M58 30c6 1 11 4 13 9M74 30c-6 1-11 4-13 9'/></g><g fill='${c}' fill-opacity='${opacity}'><circle cx='70' cy='70' r='2'/><circle cx='78' cy='76' r='1.4'/><circle cx='62' cy='78' r='1.4'/><circle cx='12' cy='12' r='1.6'/><circle cx='48' cy='88' r='1.6'/></g></svg>`;
  return { backgroundImage: `url("data:image/svg+xml,${svg.replace(/"/g, "'")}")`, backgroundSize: "96px 96px" };
}

/** Line-art sprig that drifts gently; purely decorative. */
export function Doodle({ kind = "sprig", className }: { kind?: "sprig" | "bloom" | "sun"; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 120" className={cn("pointer-events-none animate-drift", className)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {kind === "sprig" && (
        <>
          <path d="M60 112C58 80 62 52 76 18" />
          <path d="M63 86c-12-2-22-10-24-22 12 1 21 9 24 22zM66 62c11-4 20-13 21-25-12 3-20 12-21 25zM70 42c-9-4-14-12-14-22 9 3 14 11 14 22z" />
        </>
      )}
      {kind === "bloom" && (
        <>
          <circle cx="60" cy="60" r="7" />
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <path key={r} d="M60 52c-8-14-4-28 0-34 4 6 8 20 0 34z" transform={`rotate(${r} 60 60)`} />
          ))}
        </>
      )}
      {kind === "sun" && (
        <>
          <circle cx="60" cy="60" r="16" />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M60 30v-12" transform={`rotate(${i * 30} 60 60)`} />
          ))}
        </>
      )}
    </svg>
  );
}

/** The brand's beach umbrella (from the logo): sea canopy with ribs, a black pole. A small signature mark. */
export function Umbrella({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn("inline-block shrink-0", className)}>
      <path d="M2 11.5C2.6 6.4 6.9 3 12 3s9.4 3.4 10 8.5z" fill={dark ? "#d9a21b" : "#2b7aa5"} />
      <path d="M12 3.2 9.6 11.5M12 3.2l2.4 8.3M12 3.2 5.4 11.5M12 3.2l6.6 8.3" stroke={dark ? "#161616" : "#fffdf9"} strokeOpacity="0.55" strokeWidth="0.9" fill="none" />
      <path d="M12 11.5V21" stroke={dark ? "#faf6ef" : "#161616"} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
