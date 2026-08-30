import { useT } from '../../i18n';

export function KnowledgeVisual({ className = '' }: { className?: string }) {
  const { dir } = useT();
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`} aria-label="3D knowledge visual">
      {/* Deep ink background with atmospheric glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060f22] via-[#0a1630] to-[#0d1b3d]" aria-hidden />
      <div aria-hidden className="absolute -start-20 -top-20 h-96 w-96 rounded-full bg-brand-500/20 blur-[100px]" />
      <div aria-hidden className="absolute end-10 bottom-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-[80px]" />

      {/* Subtle scientific grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08] dark:opacity-[0.12]" aria-hidden preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <line x1="20%" y1="0" x2="20%" y2="100%" stroke="white" strokeWidth="0.3" opacity="0.4" />
        <line x1="60%" y1="0" x2="60%" y2="100%" stroke="white" strokeWidth="0.3" opacity="0.4" />
        <line x1="0" y1="30%" x2="100%" y2="30%" stroke="white" strokeWidth="0.3" opacity="0.4" />
        <line x1="0" y1="70%" x2="100%" y2="70%" stroke="white" strokeWidth="0.3" opacity="0.4" />
      </svg>

      {/* Arabic geometric frame — abstract Kufic-inspired angles */}
      <svg className="absolute start-10 top-10 w-24 h-24 opacity-20 dark:opacity-30" aria-hidden viewBox="0 0 100 100">
        <polygon points="10,50 50,10 90,50 50,90" fill="none" stroke="#d4a843" strokeWidth="0.8" />
        <polygon points="25,50 50,25 75,50 50,75" fill="none" stroke="#d4a843" strokeWidth="0.5" />
        <line x1="50" y1="10" x2="50" y2="90" stroke="#d4a843" strokeWidth="0.3" />
      </svg>

      {/* 3D knowledge object — layered open pages */}
      <div className="relative z-10" style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}>
        <div
          className="relative flex items-center justify-center"
          style={{
            transform: dir === 'rtl' ? 'rotateY(8deg) rotateX(6deg)' : 'rotateY(-8deg) rotateX(6deg)',
            animation: 'knowledgeFloat 18s ease-in-out infinite',
          }}
        >
          {/* Back layer — deep scientific structure */}
          <div
            aria-hidden
            className="absolute rounded-2xl shadow-2xl overflow-hidden border border-white/10"
            style={{
              width: 260,
              height: 340,
              background: 'linear-gradient(135deg, #060f22 0%, #091430 60%, #0d1b3d 100%)',
              transform: 'translateZ(-60px) rotateX(10deg)',
            }}
          >
            {/* Scientific diagram on back page */}
            <svg className="absolute inset-4 w-[90%] h-[90%]" viewBox="0 0 200 200" aria-hidden>
              <defs>
                <linearGradient id="backGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0d3a7a" />
                  <stop offset="100%" stopColor="#0a1630" />
                </linearGradient>
              </defs>
              <rect x="20" y="20" width="160" height="160" rx="8" fill="url(#backGrad)" opacity="0.7" />
              <circle cx="100" cy="100" r="60" fill="none" stroke="#c8d6e5" strokeWidth="0.6" opacity="0.6" />
              <circle cx="100" cy="100" r="40" fill="none" stroke="#4fc3f7" strokeWidth="0.8" opacity="0.8" />
              <line x1="100" y1="40" x2="100" y2="160" stroke="#c8d6e5" strokeWidth="0.5" opacity="0.5" />
              <line x1="40" y1="100" x2="160" y2="100" stroke="#c8d6e5" strokeWidth="0.5" opacity="0.5" />
              <circle cx="100" cy="100" r="6" fill="#f0c97a" opacity="0.9" />
              <text x="100" y="108" textAnchor="middle" fill="#c8d6e5" fontSize="8" fontFamily="system-ui" opacity="0.7">Σ</text>
              <circle cx="55" cy="55" r="3" fill="#4fc3f7" opacity="0.7" />
              <circle cx="145" cy="55" r="3" fill="#4fc3f7" opacity="0.7" />
              <circle cx="55" cy="145" r="3" fill="#4fc3f7" opacity="0.7" />
              <circle cx="145" cy="145" r="3" fill="#4fc3f7" opacity="0.7" />
            </svg>
          </div>

          {/* Middle layer — ascending pages */}
          <div className="relative rounded-2xl shadow-xl overflow-hidden border border-white/10" style={{ width: 240, height: 320, background: 'linear-gradient(145deg, #0b1638 0%, #091a30 100%)', transform: 'translateZ(20px)', boxShadow: '0 25px 60px rgba(11,22,66,0.6)' }}>
            {/* Abstract scientific nodes */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 320" aria-hidden preserveAspectRatio="none">
              <defs>
                <linearGradient id="layerMid" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4fc3f7" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#c8d6e5" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <rect width="240" height="320" fill="url(#layerMid)" />
              {/* Nodes connected */}
              <circle cx="60" cy="80" r="4" fill="#f0c97a" opacity="0.9" />
              <circle cx="180" cy="80" r="4" fill="#4fc3f7" opacity="0.9" />
              <circle cx="120" cy="160" r="5" fill="#f0c97a" opacity="0.9" />
              <circle cx="60" cy="240" r="4" fill="#4fc3f7" opacity="0.7" />
              <circle cx="180" cy="240" r="4" fill="#4fc3f7" opacity="0.7" />
              <line x1="60" y1="80" x2="120" y2="160" stroke="#4fc3f7" strokeWidth="0.7" opacity="0.6" />
              <line x1="180" y1="80" x2="120" y2="160" stroke="#4fc3f7" strokeWidth="0.7" opacity="0.6" />
              <line x1="120" y1="160" x2="60" y2="240" stroke="#4fc3f7" strokeWidth="0.7" opacity="0.6" />
              <line x1="120" y1="160" x2="180" y2="240" stroke="#4fc3f7" strokeWidth="0.7" opacity="0.6" />
              <line x1="60" y1="240" x2="180" y2="240" stroke="#c8d6e5" strokeWidth="0.5" opacity="0.4" />
              {/* Orbit lines */}
              <ellipse cx="120" cy="160" rx="90" ry="70" fill="none" stroke="#4fc3f7" strokeWidth="0.4" opacity="0.3" transform="rotate(15 120 160)" />
              {/* Mathematical symbols floating */}
              <text x="30" y="60" fill="#f0c97a" fontSize="14" opacity="0.8" fontFamily="system-ui">∫</text>
              <text x="190" y="60" fill="#4fc3f7" fontSize="14" opacity="0.8" fontFamily="system-ui">∂</text>
              <text x="30" y="280" fill="#c8d6e5" fontSize="10" opacity="0.6" fontFamily="system-ui">f(x)</text>
              <text x="190" y="280" fill="#c8d6e5" fontSize="10" opacity="0.6" fontFamily="system-ui">Σ</text>
            </svg>
          </div>

          {/* Front layer — open book form with geometric lines */}
          <div className="absolute rounded-xl bg-gradient-to-br from-[#0b1638]/90 to-[#091430]/95 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-md" style={{ width: 220, height: 300, transform: 'translateZ(40px)', boxShadow: '0 30px 70px rgba(11,22,66,0.7)' }}>
            <div className="p-6 h-full flex flex-col">
              {/* Book spine line */}
              <div className="absolute inset-y-0 start-1/2 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" aria-hidden />
              {/* Title line */}
              <div className="mb-3">
                <h3 className="text-xl font-bold text-white tracking-tight">المعارج</h3>
                <p className="text-[10px] font-medium uppercase tracking-widest text-brand-300">Maarej — Education</p>
              </div>
              {/* Scientific measurement grid */}
              <div className="relative flex-1 rounded-lg bg-[#060f22]/60 border border-white/5 p-3">
                <svg className="w-full h-full" viewBox="0 0 180 120" aria-hidden>
                  <rect x="10" y="10" width="160" height="100" rx="4" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <line x1="10" y1="60" x2="170" y2="60" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <line x1="90" y1="10" x2="90" y2="110" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <circle cx="90" cy="60" r="35" fill="none" stroke="#4fc3f7" strokeWidth="0.7" opacity="0.7" />
                  <circle cx="90" cy="60" r="20" fill="none" stroke="#f0c97a" strokeWidth="0.7" opacity="0.7" />
                  <text x="90" y="65" textAnchor="middle" fill="#f0c97a" fontSize="10" fontFamily="system-ui">Σ</text>
                  <line x1="10" y1="30" x2="170" y2="30" stroke="#d4a843" strokeWidth="0.3" opacity="0.5" />
                  <line x1="10" y1="90" x2="170" y2="90" stroke="#d4a843" strokeWidth="0.3" opacity="0.5" />
                </svg>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                <span>01 / 03</span>
                <span className="h-0.5 flex-1 rounded-full bg-white/10" />
                <span>Knowledge Path</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle ambient glow behind text */}
      <div className="absolute bottom-10 start-1/2 -translate-x-1/2 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-400/10" aria-hidden />

      <style jsx>{`
        @keyframes knowledgeFloat {
          0%, 100% { transform: translateY(0) rotateY(-8deg) rotateX(6deg); }
          50% { transform: translateY(-10px) rotateY(-6deg) rotateX(4deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation: knowledgeFloat"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
