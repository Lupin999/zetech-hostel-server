import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

const BLUE = '#1a237e';
const DARK = '#000051';
const GOLD = '#FFD700';

const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 5 + 2,
    delay: 0.3 + Math.random() * 0.6,
}));

export default function SplashScreen({ onComplete }) {
    const [visible, setVisible] = useState(true);
    const [phase, setPhase] = useState(0);
    const bgCtrl = useAnimation();
    const waveCtrl = useAnimation();

    const runSequence = useCallback(async () => {
        // Phase 1: blue flood
        await new Promise(r => setTimeout(r, 800));
        setPhase(1);
        waveCtrl.start({ x: '0%', transition: { duration: 0.6, ease: [0.33, 1, 0.68, 1] } });
        bgCtrl.start({ opacity: 1, transition: { duration: 0.7 } });

        // Phase 2: E bounce + subtitle
        await new Promise(r => setTimeout(r, 800));
        setPhase(2);

        // Phase 3: exit
        await new Promise(r => setTimeout(r, 1000));
        setVisible(false);
        setTimeout(onComplete, 500);
    }, [onComplete, bgCtrl, waveCtrl]);

    useEffect(() => { runSequence(); }, [runSequence]);

    const letters = 'ZETECH'.split('');

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: 'easeInOut' }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', background: '#fff',
                        willChange: 'opacity',
                    }}
                >
                    {/* Blue gradient overlay */}
                    <motion.div
                        animate={bgCtrl}
                        initial={{ opacity: 0 }}
                        style={{
                            position: 'absolute', inset: 0,
                            background: `radial-gradient(ellipse at 50% 40%, ${BLUE} 0%, ${DARK} 100%)`,
                            willChange: 'opacity',
                        }}
                    />

                    {/* Wave sweep */}
                    <motion.div
                        animate={waveCtrl}
                        initial={{ x: '-105%' }}
                        style={{
                            position: 'absolute', inset: 0,
                            background: `linear-gradient(135deg, ${BLUE}, ${DARK})`,
                            willChange: 'transform',
                        }}
                    />

                    {/* Particles */}
                    {phase >= 1 && particles.map(p => (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 0.5, 0], scale: [0, 1, 0], y: [0, -50] }}
                            transition={{ duration: 1.8, delay: p.delay, ease: 'easeOut' }}
                            style={{
                                position: 'absolute',
                                left: `${p.x}%`, top: `${p.y}%`,
                                width: p.size, height: p.size,
                                borderRadius: '50%', background: GOLD,
                                willChange: 'transform, opacity',
                            }}
                        />
                    ))}

                    {/* Glow ring */}
                    {phase >= 1 && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 1.4, 1.15], opacity: [0, 0.25, 0.1] }}
                            transition={{ duration: 0.9, ease: 'easeOut' }}
                            style={{
                                position: 'absolute',
                                width: 380, height: 380, borderRadius: '50%',
                                border: `2px solid ${GOLD}`,
                                boxShadow: `0 0 50px ${GOLD}33`,
                                willChange: 'transform, opacity',
                            }}
                        />
                    )}

                    {/* ZETECH letters */}
                    <div style={{
                        position: 'relative', display: 'flex', zIndex: 2,
                        fontFamily: '"Inter", "Roboto", sans-serif',
                    }}>
                        {letters.map((letter, i) => {
                            const isTheE = letter === 'E' && i === 1;
                            return (
                                <motion.span
                                    key={i}
                                    initial={{ x: -250, opacity: 0, rotateY: -90 }}
                                    animate={{
                                        x: 0, opacity: 1, rotateY: 0,
                                        ...(isTheE && phase >= 2 ? { y: [16, -12, 0], scale: [1, 1.25, 1] } : {}),
                                    }}
                                    transition={{
                                        x: { duration: 0.5, delay: i * 0.07, ease: [0.33, 1, 0.68, 1] },
                                        opacity: { duration: 0.35, delay: i * 0.07 },
                                        rotateY: { duration: 0.5, delay: i * 0.07, ease: [0.33, 1, 0.68, 1] },
                                        ...(isTheE && phase >= 2 ? {
                                            y: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
                                            scale: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
                                        } : {}),
                                    }}
                                    style={{
                                        fontSize: 'clamp(48px, 12vw, 90px)',
                                        fontWeight: 900,
                                        letterSpacing: '0.04em',
                                        color: phase >= 1 ? '#fff' : BLUE,
                                        transition: 'color 0.5s ease',
                                        display: 'inline-block',
                                        willChange: 'transform, opacity',
                                        textShadow: isTheE && phase >= 2
                                            ? `0 0 20px ${GOLD}, 0 0 40px ${GOLD}66`
                                            : phase >= 1 ? '0 2px 16px rgba(0,0,0,0.25)' : 'none',
                                    }}
                                >
                                    {letter}
                                </motion.span>
                            );
                        })}
                    </div>

                    {/* Subtitle */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
                        style={{
                            position: 'absolute', bottom: '30%',
                            color: GOLD, fontSize: 'clamp(11px, 2.5vw, 16px)',
                            fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase',
                            fontFamily: '"Inter", sans-serif',
                            willChange: 'transform, opacity',
                        }}
                    >
                        Hostel Management
                    </motion.div>

                    {/* Gold line */}
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={phase >= 1 ? { scaleX: 1 } : {}}
                        transition={{ duration: 0.7, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
                        style={{
                            position: 'absolute', bottom: '27%',
                            width: '28%', height: 2,
                            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
                            transformOrigin: 'center',
                            willChange: 'transform',
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
