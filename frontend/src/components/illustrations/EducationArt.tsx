import type { CSSProperties } from 'react';

type ArtProps = { className?: string };

/**
 * MAAREJ illustration system — soft 3D / editorial educational art.
 * Pure SVG, theme-aware (light + dark), zero dependencies, crisp at any size.
 *
 * Concept: معارج — "The Ascents". Books climb like stairs toward a
 * graduation cap and a star: learning made visible.
 */

function Sparkle({ x, y, s = 1, className = 'fill-gold-400' }: { x: number; y: number; s?: number; className?: string }) {
  return (
    <path
      d="M0 -9 C 1 -2.5 2.5 -1 9 0 C 2.5 1 1 2.5 0 9 C -1 2.5 -2.5 1 -9 0 C -2.5 -1 -1 -2.5 0 -9 Z"
      transform={`translate(${x} ${y}) scale(${s})`}
      className={className}
    />
  );
}

/**
 * Hero scene: an ascending book staircase, the tall cap on top, a small
 * certificate card and an atom floating around the composition.
 */
export function AscentScene({ className }: ArtProps) {
  const style = { overflow: 'visible' } as CSSProperties;
  return (
    <svg viewBox="0 0 560 440" role="img" aria-hidden="true" className={className} style={style}>
      {/* Backdrop organic blobs */}
      <path
        d="M300 18 C 428 26 506 106 500 218 C 494 330 408 412 300 404 C 182 396 66 326 62 212 C 58 98 172 10 300 18 Z"
        className="fill-brand-100/70 dark:fill-slate-800/70"
      />
      <path
        d="M272 62 C 372 66 438 128 434 214 C 430 306 360 366 272 360 C 178 354 122 292 120 208 C 118 118 176 58 272 62 Z"
        className="fill-white/60 dark:fill-brand-500/10"
      />

      {/* Soft glow orbs */}
      <circle cx="116" cy="96" r="72" className="fill-gold-200/50 dark:fill-gold-400/10" />
      <circle cx="474" cy="372" r="88" className="fill-brand-200/50 dark:fill-brand-500/10" />
      <circle cx="452" cy="84" r="52" className="fill-violet-200/40 dark:fill-violet-400/10" />

      {/* Ground shadow */}
      <ellipse cx="262" cy="400" rx="236" ry="16" className="fill-slate-900/10 dark:fill-black/40" />

      {/* Floating certificate card */}
      <g transform="translate(118 176) rotate(-7)">
        <rect x="-50" y="-34" width="100" height="72" rx="12" className="fill-white stroke-slate-200/80 dark:fill-slate-800 dark:stroke-slate-700" />
        <rect x="-34" y="-20" width="68" height="7" rx="3.5" className="fill-slate-200 dark:fill-slate-600" />
        <rect x="-34" y="-6" width="48" height="7" rx="3.5" className="fill-slate-200 dark:fill-slate-600" />
        <rect x="-34" y="8" width="58" height="7" rx="3.5" className="fill-slate-200 dark:fill-slate-600" />
        <circle cx="30" cy="10" r="11" className="fill-gold-400/90" />
        <path d="M30 3 L31.6 8.4 L37 10 L31.6 11.6 L30 17 L28.4 11.6 L23 10 L28.4 8.4 Z" className="fill-white/90" />
      </g>

      {/* Floating atom (science) */}
      <g transform="translate(452 112)">
        <ellipse cx="0" cy="0" rx="40" ry="14" className="stroke-brand-400/60 dark:stroke-brand-400/50" fill="none" strokeWidth="3" />
        <ellipse cx="0" cy="0" rx="40" ry="14" transform="rotate(60)" className="stroke-gold-400/70 dark:stroke-gold-400/50" fill="none" strokeWidth="3" />
        <ellipse cx="0" cy="0" rx="40" ry="14" transform="rotate(-60)" className="stroke-violet-400/70 dark:stroke-violet-400/50" fill="none" strokeWidth="3" />
        <circle cx="0" cy="0" r="6" className="fill-brand-600 dark:fill-brand-400" />
        <circle cx="40" cy="0" r="5" className="fill-gold-400" />
        <circle cx="-20" cy="-34.6" r="5" className="fill-violet-400" />
      </g>

      <Sparkle x={434} y={248} s={1.6} />
      <Sparkle x={96} y={300} s={1.2} />
      <Sparkle x={330} y={96} s={1.1} className="fill-gold-300" />

      {/* Ascending book staircase */}
      <g>
        {/* Book 1 */}
        <rect x="62" y="364" width="320" height="26" rx="8" className="fill-brand-600/40 dark:fill-brand-500/25" />
        <rect x="60" y="360" width="320" height="26" rx="8" className="fill-brand-600 dark:fill-brand-500" />
        <rect x="72" y="354" width="296" height="8" rx="4" className="fill-white/85 dark:fill-slate-200/85" />

        {/* Book 2 */}
        <rect x="122" y="334" width="290" height="24" rx="8" className="fill-gold-500/40 dark:fill-gold-400/25" />
        <rect x="120" y="330" width="290" height="24" rx="8" className="fill-gold-500 dark:fill-gold-400" />
        <rect x="131" y="324" width="268" height="8" rx="4" className="fill-white/85 dark:fill-slate-200/85" />

        {/* Book 3 */}
        <rect x="177" y="305" width="262" height="22" rx="8" className="fill-violet-500/40 dark:fill-violet-500/25" />
        <rect x="175" y="301" width="262" height="22" rx="8" className="fill-violet-500 dark:fill-violet-400" />
        <rect x="185" y="295" width="242" height="8" rx="4" className="fill-white/85 dark:fill-slate-200/85" />

        {/* Book 4 */}
        <rect x="228" y="277" width="232" height="20" rx="8" className="fill-teal-600/40 dark:fill-teal-500/25" />
        <rect x="226" y="273" width="232" height="20" rx="8" className="fill-teal-600 dark:fill-teal-500" />
        <rect x="235" y="267" width="214" height="8" rx="4" className="fill-white/85 dark:fill-slate-200/85" />
      </g>

      {/* Graduation cap on top */}
      <g transform="translate(300 232)">
        <path
          d="M-56 0 h112 a10 10 0 0 1 10 10 v12 a10 10 0 0 1 -10 10 h-112 a10 10 0 0 1 -10 -10 v-12 a10 10 0 0 1 10 -10 Z"
          className="fill-brand-800 dark:fill-brand-950"
        />
        <ellipse cx="0" cy="-14" rx="76" ry="15" className="fill-brand-700 dark:fill-brand-800" />
        <ellipse cx="0" cy="-18" rx="38" ry="7" className="fill-white/15 dark:fill-white/10" />
        <circle cx="0" cy="-14" r="7" className="fill-gold-400" />
        <path d="M38 -12 C 56 -2 64 12 62 26" className="stroke-gold-400" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <circle cx="62" cy="30" r="5.5" className="fill-gold-400" />
      </g>

      {/* Rising star above */}
      <g transform="translate(452 36)">
        <circle cx="0" cy="0" r="30" className="fill-gold-300/30 dark:fill-gold-400/10" />
        <Sparkle x={0} y={2} s={2} className="fill-gold-400" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------ */
/* Small section illustrations                                   */
/* ------------------------------------------------------------ */

export function SearchIllustration({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-hidden="true" className={className}>
      <circle cx="100" cy="100" r="88" className="fill-brand-100/70 dark:fill-brand-500/10" />
      <circle cx="60" cy="60" r="28" className="fill-white/70 dark:fill-white/5" />
      {/* book */}
      <rect x="36" y="116" width="96" height="28" rx="14" className="fill-brand-600 dark:fill-brand-500" />
      <rect x="48" y="110" width="72" height="8" rx="4" className="fill-white/85 dark:fill-slate-200/85" />
      {/* magnifier */}
      <g transform="rotate(-14 138 92)">
        <circle cx="132" cy="92" r="34" className="fill-white stroke-brand-700 dark:fill-slate-800 dark:stroke-brand-300" strokeWidth="11" />
        <circle cx="132" cy="92" r="11" className="fill-gold-400" />
        <path d="M158 118 L178 138" className="stroke-brand-700 dark:stroke-brand-300" strokeWidth="13" strokeLinecap="round" />
      </g>
      <Sparkle x={44} y={70} s={0.9} />
    </svg>
  );
}

export function CalendarIllustration({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-hidden="true" className={className}>
      <circle cx="100" cy="100" r="88" className="fill-gold-100/70 dark:fill-gold-400/10" />
      <circle cx="146" cy="52" r="26" className="fill-white/70 dark:fill-white/5" />
      {/* calendar */}
      <rect x="48" y="52" width="104" height="98" rx="16" className="fill-white stroke-slate-200/90 dark:fill-slate-800 dark:stroke-slate-700" />
      <path d="M48 84 h104 v30 a16 16 0 0 1 -16 16 h-72 a16 16 0 0 1 -16 -16 Z" className="fill-brand-50 dark:fill-brand-900/30" />
      <rect x="64" y="46" width="8" height="18" rx="4" className="fill-brand-600 dark:fill-brand-400" />
      <rect x="128" y="46" width="8" height="18" rx="4" className="fill-brand-600 dark:fill-brand-400" />
      {/* day dots */}
      <g className="fill-slate-200 dark:fill-slate-600">
        <rect x="64" y="96" width="76" height="7" rx="3.5" />
        <rect x="64" y="112" width="76" height="7" rx="3.5" />
        <rect x="64" y="128" width="48" height="7" rx="3.5" />
      </g>
      <circle cx="138" cy="124" r="12" className="fill-gold-400" />
      <Sparkle x={46} y={154} s={1} />
    </svg>
  );
}

export function LearnIllustration({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-hidden="true" className={className}>
      <circle cx="100" cy="100" r="88" className="fill-teal-100/70 dark:fill-teal-500/10" />
      <circle cx="150" cy="148" r="30" className="fill-white/70 dark:fill-white/5" />
      {/* open book */}
      <g>
        <path d="M100 128 L40 114 A10 10 0 0 1 34 100 L40 62 A10 10 0 0 1 52 58 L100 70 Z" className="fill-white stroke-teal-500/60 dark:fill-slate-800 dark:stroke-teal-400/50" strokeWidth="4" transform="rotate(4 70 90)" />
        <path d="M100 128 L160 114 A10 10 0 0 0 166 100 L160 62 A10 10 0 0 0 148 58 L100 70 Z" className="fill-white stroke-teal-500/60 dark:fill-slate-800 dark:stroke-teal-400/50" strokeWidth="4" transform="rotate(-4 130 90)" />
        <path d="M100 70 L100 128" className="stroke-brand-600 dark:stroke-brand-300" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      {/* cap */}
      <g transform="translate(100 34) scale(1.05)">
        <path
          d="M-30 0 h60 a6 6 0 0 1 6 6 v7 a6 6 0 0 1 -6 6 h-60 a6 6 0 0 1 -6 -6 v-7 a6 6 0 0 1 6 -6 Z"
          className="fill-brand-800 dark:fill-brand-950"
        />
        <ellipse cx="0" cy="-8" rx="42" ry="9" className="fill-brand-700 dark:fill-brand-800" />
        <circle cx="0" cy="-8" r="4" className="fill-gold-400" />
        <path d="M21 -7 C 31 0 36 6 35 14" className="stroke-gold-400" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="35" cy="17" r="3.5" className="fill-gold-400" />
      </g>
      <Sparkle x={158} y={58} s={1} className="fill-gold-400" />
    </svg>
  );
}

export function ProgressIllustration({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-hidden="true" className={className}>
      <circle cx="100" cy="100" r="88" className="fill-violet-100/70 dark:fill-violet-400/10" />
      {/* rising bars */}
      <g>
        <rect x="52" y="126" width="22" height="34" rx="8" className="fill-slate-200 dark:fill-slate-700" />
        <rect x="82" y="106" width="22" height="54" rx="8" className="fill-brand-300 dark:fill-brand-500/50" />
        <rect x="112" y="86" width="22" height="74" rx="8" className="fill-violet-400 dark:fill-violet-400/80" />
        <rect x="142" y="66" width="22" height="94" rx="8" className="fill-brand-600 dark:fill-brand-400" />
        {/* arrow */}
        <path d="M150 60 L162 72 M150 60 L141 66" className="stroke-gold-500 dark:stroke-gold-400" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      <Sparkle x={50} y={56} s={1.1} className="fill-gold-400" />
    </svg>
  );
}

export function CertificateIllustration({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-hidden="true" className={className}>
      <circle cx="100" cy="100" r="88" className="fill-gold-100/70 dark:fill-gold-400/10" />
      <g transform="translate(100 98)">
        <rect x="-52" y="-40" width="104" height="80" rx="14" className="fill-white stroke-slate-200/90 dark:fill-slate-800 dark:stroke-slate-700" />
        <rect x="-36" y="-24" width="72" height="8" rx="4" className="fill-brand-400/80" />
        <rect x="-36" y="-8" width="52" height="8" rx="4" className="fill-slate-200 dark:fill-slate-600" />
        <rect x="-36" y="8" width="62" height="8" rx="4" className="fill-slate-200 dark:fill-slate-600" />
        <circle cx="30" cy="10" r="12" className="fill-gold-400" />
        <path d="M30 2 L32 8.4 L38.5 10 L32 11.6 L30 18 L28 11.6 L21.5 10 L28 8.4 Z" className="fill-white/95" />
      </g>
      <Sparkle x={52} y={40} s={1} className="fill-gold-400" />
      <Sparkle x={152} y={156} s={0.8} />
    </svg>
  );
}