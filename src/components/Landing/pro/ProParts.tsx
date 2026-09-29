import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import './landing-pro.css';

/* Política de movimiento: se respeta prefers-reduced-motion, salvo que el usuario
   fuerce los efectos (?motion=on o el interruptor del pie de página). */
export const motionForced = (): boolean => {
  try {
    return new URLSearchParams(window.location.search).get('motion') === 'on' || localStorage.getItem('aura-force-motion') === '1';
  } catch {
    return false;
  }
};
export const systemReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const reducedMotion = (): boolean => systemReducedMotion() && !motionForced();
export const setForceMotion = (on: boolean): void => {
  try {
    if (on) localStorage.setItem('aura-force-motion', '1');
    else localStorage.removeItem('aura-force-motion');
  } catch {
    /* almacenamiento no disponible */
  }
};
const useMotionReduced = (): boolean => {
  const sys = useReducedMotion();
  return !!sys && !motionForced();
};

/* ────────────────────────────────────────────────────────────────────────────
   AmbientOrbs — luz fija que el cristal refracta. Solo se mueve con transform
   (compuesto por GPU): no repinta gradientes al hacer scroll.
   ──────────────────────────────────────────────────────────────────────────── */
export const AmbientOrbs: React.FC = () => {
  const reduce = useMotionReduced();
  const { scrollYProgress } = useScroll();

  const xa = useTransform(scrollYProgress, [0, 1], ['-20vw', '18vw']);
  const ya = useTransform(scrollYProgress, [0, 1], ['-24vh', '34vh']);
  const xb = useTransform(scrollYProgress, [0, 1], ['46vw', '-14vw']);
  const yb = useTransform(scrollYProgress, [0, 1], ['22vh', '-20vh']);
  const xc = useTransform(scrollYProgress, [0, 1], ['10vw', '40vw']);
  const yc = useTransform(scrollYProgress, [0, 1], ['58vh', '4vh']);

  return (
    <div className="lp-orbs" aria-hidden="true">
      <motion.div className="lp-orb lp-orb--a" style={reduce ? { x: '-12vw', y: '-14vh' } : { x: xa, y: ya }} />
      <motion.div className="lp-orb lp-orb--b" style={reduce ? { x: '42vw', y: '16vh' } : { x: xb, y: yb }} />
      <motion.div className="lp-orb lp-orb--c" style={reduce ? { x: '14vw', y: '50vh' } : { x: xc, y: yc }} />
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   Scene3D — entrada en perspectiva: el bloque se levanta y se endereza mientras
   entra al viewport. Sin salida ni springs: lectura directa del scroll, barato.
   ──────────────────────────────────────────────────────────────────────────── */
interface Scene3DProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

export const Scene3D: React.FC<Scene3DProps> = ({ children, className = '', intensity = 1 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useMotionReduced();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.55'] });

  const rotateX = useTransform(scrollYProgress, [0, 1], [12 * intensity, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [70 * intensity, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.96, 1]);

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <div ref={ref} className={className} style={{ perspective: 1400 }}>
      <motion.div style={{ rotateX, y, scale, transformOrigin: '50% 100%', willChange: 'transform' }}>{children}</motion.div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   SpotlightCard — superficie de cristal con brillo que sigue al cursor.
   ──────────────────────────────────────────────────────────────────────────── */
interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tilt?: number;
  tint?: boolean;
}

export const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(
  ({ children, className = '', tilt = 0, tint = false, style, onMouseMove, onMouseLeave, ...rest }, fwd) => {
    const inner = useRef<HTMLDivElement | null>(null);

    const setRefs = (node: HTMLDivElement | null) => {
      inner.current = node;
      if (typeof fwd === 'function') fwd(node);
      else if (fwd) (fwd as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const el = inner.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        el.style.setProperty('--mx', `${x}px`);
        el.style.setProperty('--my', `${y}px`);
        if (tilt) {
          el.style.transform = `perspective(1100px) rotateY(${(x / r.width - 0.5) * tilt}deg) rotateX(${-(y / r.height - 0.5) * tilt}deg)`;
        }
      }
      onMouseMove?.(e);
    };

    const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      if (inner.current && tilt) inner.current.style.transform = '';
      onMouseLeave?.(e);
    };

    const cls = ['lp-glass lp-glass--hover', tint ? 'lp-glass--tint' : '', className].filter(Boolean).join(' ');

    return (
      <div
        ref={setRefs}
        className={cls}
        style={{ transition: tilt ? 'transform 0.25s cubic-bezier(0.16,1,0.3,1)' : undefined, ...style }}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
SpotlightCard.displayName = 'SpotlightCard';

/* ────────────────────────────────────────────────────────────────────────────
   WordReveal — las palabras se encienden con el scroll (solo opacity).
   ──────────────────────────────────────────────────────────────────────────── */
const Word: React.FC<{ word: string; range: [number, number]; progress: MotionValue<number> }> = ({ word, range, progress }) => {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block mr-[0.26em]">
      {word}
    </motion.span>
  );
};

export const WordReveal: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const reduce = useMotionReduced();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.5'] });
  const words = text.split(' ');
  if (reduce) return <p className={className}>{text}</p>;
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <Word key={i} word={w} range={[i / words.length, (i + 1) / words.length]} progress={scrollYProgress} />
      ))}
    </p>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   SectionLabel — etiqueta editorial (sin contenedor): 01 ─── Título
   ──────────────────────────────────────────────────────────────────────────── */
export const SectionLabel: React.FC<{ index?: string; children: React.ReactNode; className?: string }> = ({ index, children, className = '' }) => (
  <div className={`lp-label ${className}`}>
    {index && <b>{index}</b>}
    <i aria-hidden="true" />
    <span>{children}</span>
  </div>
);

/* ────────────────────────────────────────────────────────────────────────────
   GlassNav — píldora flotante con sección activa y progreso de lectura.
   ──────────────────────────────────────────────────────────────────────────── */
export interface NavLink {
  id: string;
  label: string;
  also?: string[]; // otras secciones que cuentan como esta
}

interface GlassNavProps {
  links: NavLink[];
  onNavigate: (id: string) => void;
  onEnter: () => void;
}

export const GlassNav: React.FC<GlassNavProps> = ({ links, onNavigate, onEnter }) => {
  const [active, setActive] = useState<string>('');
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

  useEffect(() => {
    const owner = new Map<string, string>();
    links.forEach((l) => {
      owner.set(l.id, l.id);
      l.also?.forEach((a) => owner.set(a, l.id));
    });
    owner.set('hero', '');
    owner.set('descargar', '');
    const els = Array.from(owner.keys())
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setActive(owner.get(en.target.id) ?? '');
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [links]);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="lp-nav lp-glass lp-glass--pill"
      aria-label="Navegación principal"
    >
      <button
        type="button"
        onClick={() => onNavigate('hero')}
        className="inline-flex items-center gap-2.5 pr-3 mr-1 bg-transparent border-0 cursor-pointer text-white"
        aria-label="Aura3D inicio"
      >
        <span className="w-2 h-2 rounded-full bg-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
        <span className="text-[14px] font-semibold tracking-tight">Aura3D</span>
      </button>

      <div className="hidden md:flex items-center gap-0.5">
        {links.map((l) => (
          <a
            key={l.id}
            href={`#${l.id}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(l.id);
            }}
            className={`lp-nav-link ${active === l.id ? 'is-active' : ''}`}
          >
            {l.label}
          </a>
        ))}
      </div>

      <button type="button" onClick={onEnter} className="lp-btn lp-btn--primary ml-2" style={{ minHeight: 40, padding: '0 20px', fontSize: 13 }}>
        Iniciar motor
      </button>

      <div className="lp-nav-progress" aria-hidden="true">
        <motion.span style={{ scaleX: progress }} />
      </div>
    </motion.nav>
  );
};
