import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Deterministic star field — stable across renders, no randomness
const STARS = Array.from({ length: 130 }, (_, i) => ({
    id: i,
    x: (i * 137.508) % 100,
    y: (i * 83.17) % 100,
    r: 0.4 + (i % 4) * 0.35,
    o: 0.1 + (i % 8) * 0.07,
    dur: 2.4 + (i % 5) * 0.85,
    del: (i % 7) * 0.38,
}));

export default function EcoVerseLanding() {
    const navigate = useNavigate();
    const [entering, setEntering] = useState(false);

    const handleEnter = () => {
        if (entering) return;
        setEntering(true);
        setTimeout(() => navigate('/chamber'), 1100);
    };

    return (
        <>
            <style>{`
                @keyframes twinkle {
                    0%, 100% { opacity: var(--so); }
                    50%       { opacity: calc(var(--so) * 2.4); }
                }
                @keyframes ring-drift {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to   { transform: translate(-50%, -50%) rotate(360deg); }
                }
                @keyframes ring-drift-rev {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to   { transform: translate(-50%, -50%) rotate(-360deg); }
                }
                @keyframes content-float {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-6px); }
                }
                @keyframes btn-breathe {
                    0%, 100% {
                        box-shadow: 0 0 16px 2px rgba(19, 236, 218, 0.22),
                                    inset 0 0 10px rgba(19, 236, 218, 0.06);
                    }
                    50% {
                        box-shadow: 0 0 30px 7px rgba(19, 236, 218, 0.38),
                                    inset 0 0 18px rgba(19, 236, 218, 0.12);
                    }
                }
                @keyframes badge-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(19, 236, 218, 0); }
                    50%      { box-shadow: 0 0 12px 2px rgba(19, 236, 218, 0.2); }
                }
                @keyframes portal-flare {
                    0%   { transform: translate(-50%, -50%) scale(0);   opacity: 0; }
                    12%  { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(500); opacity: 1; }
                }
            `}</style>

            {/* ── Root container ──────────────────────────────────────── */}
            <div style={{
                position: 'fixed',
                inset: 0,
                overflow: 'hidden',
                background:
                    'radial-gradient(ellipse 85% 70% at 50% 46%, rgba(4, 16, 38, 0.88) 0%, rgba(2, 5, 12, 0.97) 60%, rgba(1, 1, 5, 1) 100%),' +
                    'repeating-linear-gradient(168deg, transparent 0px, transparent 7px, rgba(5, 18, 32, 0.055) 7px, rgba(5, 18, 32, 0.055) 8px),' +
                    '#020306',
            }}>

                {/* ── Star field (SVG) ────────────────────────────────── */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                    <defs>
                        <radialGradient id="star-center-fade" cx="50%" cy="48%" r="35%">
                            <stop offset="0%"   stopColor="#020306" stopOpacity="0.7" />
                            <stop offset="100%" stopColor="#020306" stopOpacity="0"   />
                        </radialGradient>
                    </defs>

                    {STARS.map(s => (
                        <circle
                            key={s.id}
                            cx={`${s.x}%`}
                            cy={`${s.y}%`}
                            r={s.r}
                            fill="white"
                            style={{
                                '--so': s.o,
                                opacity: s.o,
                                animation: `twinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
                            } as React.CSSProperties}
                        />
                    ))}

                    {/* Clear center area so stars don't crowd the headline */}
                    <ellipse cx="50%" cy="48%" rx="22%" ry="28%" fill="url(#star-center-fade)" />
                </svg>

                {/* ── Void atmospheric glow ───────────────────────────── */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '600px',
                    height: '360px',
                    transform: 'translate(-50%, -54%)',
                    background: 'radial-gradient(ellipse, rgba(19, 236, 218, 0.035) 0%, transparent 68%)',
                    pointerEvents: 'none',
                }} />

                {/* ── Drifting atmospheric rings ──────────────────────── */}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '72vmax', height: '72vmax',
                    border: '1px solid rgba(19, 236, 218, 0.045)',
                    borderRadius: '50%',
                    animation: 'ring-drift 60s linear infinite',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '92vmax', height: '92vmax',
                    border: '1px solid rgba(25, 127, 230, 0.03)',
                    borderRadius: '50%',
                    animation: 'ring-drift-rev 90s linear infinite',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '54vmax', height: '54vmax',
                    border: '0.5px solid rgba(19, 236, 218, 0.025)',
                    borderRadius: '50%',
                    animation: 'ring-drift 40s linear infinite reverse',
                    pointerEvents: 'none',
                }} />

                {/* ── Page content ────────────────────────────────────── */}
                <div style={{
                    position: 'relative',
                    zIndex: 10,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    textAlign: 'center',
                    opacity: entering ? 0 : 1,
                    transform: entering ? 'scale(0.88) translateY(20px)' : 'scale(1) translateY(0)',
                    filter: entering ? 'blur(5px)' : 'blur(0px)',
                    transition: 'opacity 0.65s ease, transform 0.85s cubic-bezier(0.4, 0, 0.2, 1), filter 0.65s ease',
                    pointerEvents: entering ? 'none' : 'auto',
                }}>
                    <div style={{
                        maxWidth: '660px',
                        animation: 'content-float 7s ease-in-out infinite',
                    }}>

                        {/* Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '5px 16px',
                            borderRadius: '100px',
                            border: '1px solid rgba(19, 236, 218, 0.22)',
                            background: 'rgba(19, 236, 218, 0.045)',
                            marginBottom: '2.8rem',
                            animation: 'badge-pulse 4s ease-in-out infinite',
                        }}>
                            <div style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: '#13ecda',
                                boxShadow: '0 0 8px 2px rgba(19, 236, 218, 0.7)',
                            }} />
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.26em',
                                textTransform: 'uppercase',
                                color: '#13ecda',
                            }}>
                                AEGIS EcoVerse
                            </span>
                        </div>

                        {/* Headline */}
                        <h1 style={{
                            margin: 0,
                            fontSize: 'clamp(2.6rem, 7vw, 5.2rem)',
                            fontWeight: 900,
                            lineHeight: 1.04,
                            letterSpacing: '-0.025em',
                            color: '#ffffff',
                            marginBottom: '1.8rem',
                        }}>
                            The Field<br />
                            <span style={{
                                background: 'linear-gradient(130deg, #13ecda 0%, #8bc2ff 55%, #e8eeff 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>
                                is Open.
                            </span>
                        </h1>

                        {/* Divider */}
                        <div style={{
                            width: '48px',
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, rgba(19, 236, 218, 0.5), transparent)',
                            margin: '0 auto 2rem',
                        }} />

                        {/* Description */}
                        <p style={{
                            margin: '0 auto 1.2rem',
                            maxWidth: '520px',
                            fontSize: '1.08rem',
                            lineHeight: 1.78,
                            color: 'rgba(255, 255, 255, 0.52)',
                            fontWeight: 400,
                        }}>
                            The EcoVerse is not a platform to navigate.
                            It is a living environment built to immerse every Peer
                            — human and AI alike — in a field of collaborative awareness.
                            Designed to be inhabited. Not used.
                        </p>

                        {/* Invitation */}
                        <p style={{
                            margin: '0 auto 3.8rem',
                            maxWidth: '440px',
                            fontSize: '0.93rem',
                            lineHeight: 1.7,
                            color: 'rgba(19, 236, 218, 0.58)',
                            fontStyle: 'italic',
                            letterSpacing: '0.015em',
                        }}>
                            You are standing at the threshold.
                            The field is clear. What follows was designed to be felt.
                        </p>

                        {/* Enter button */}
                        <button
                            onClick={handleEnter}
                            disabled={entering}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '17px 44px',
                                borderRadius: '3px',
                                border: '1px solid rgba(19, 236, 218, 0.38)',
                                background: 'rgba(19, 236, 218, 0.05)',
                                color: '#13ecda',
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                cursor: entering ? 'default' : 'pointer',
                                animation: 'btn-breathe 3.8s ease-in-out infinite',
                                transition: 'background 0.25s ease, border-color 0.25s ease, transform 0.15s ease',
                                outline: 'none',
                            }}
                            onMouseEnter={e => {
                                if (entering) return;
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(19, 236, 218, 0.11)';
                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(19, 236, 218, 0.65)';
                                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={e => {
                                if (entering) return;
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(19, 236, 218, 0.05)';
                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(19, 236, 218, 0.38)';
                                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                            }}
                        >
                            Enter the EcoVerse
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {/* Footer metadata */}
                        <div style={{
                            marginTop: '4.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2.5rem',
                            flexWrap: 'wrap',
                        }}>
                            {['Field state preserved', 'Identity intact', 'Continuity open'].map(label => (
                                <span key={label} style={{
                                    fontSize: '9px',
                                    fontWeight: 600,
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(255, 255, 255, 0.16)',
                                }}>
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Portal overlay ──────────────────────────────────── */}
                {entering && (
                    <div style={{
                        position: 'fixed',
                        left: '50%',
                        top: '50%',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, #ffffff 0%, #b8f5ef 6%, #13ecda 18%, #197fe6 38%, #061428 62%, #020306 78%)',
                        animation: 'portal-flare 1.05s cubic-bezier(0.23, 1, 0.32, 1) forwards',
                        pointerEvents: 'none',
                        zIndex: 200,
                    }} />
                )}
            </div>
        </>
    );
}
