import React, { useState, useEffect, useRef, useCallback } from 'react';
import './CinematicIntro.css';

// Top-right overview — desk, laptop, chair all visible
const DESK_CAMERA = { pos: [4, 3.5, 5], look: [0, 0, 0] };
// After back-to-office — same angle, slightly closer
const CHAIR_CAMERA = { pos: [4, 3.5, 5], look: [0, 0, 0] };

// ─── STORY SCRIPT ───────────────────────────────────────────
const SCENES = [
  {
    id: 'title',
    camera: { pos: [6, 5, 12], look: [0, 0, 0] },
    duration: 10000,
    title: 'ETHCR4CK',
    subtitle: 'CLINICAL INTELLIGENCE SYSTEM',
    text: '',
  },
  {
    id: 'problem-intro',
    camera: { pos: [5, 3, 7], look: [0, 1, 0] },
    duration: 10000,
    title: 'THE PROBLEM',
    subtitle: '',
    text: 'Three critical failures are costing lives in modern medicine.',
  },
  // PROBLEMS: Left side & behind angles — bookshelves, dark corners
  {
    id: 'problem-1',
    camera: { pos: [-5, 3, 3], look: [-3, 2, -2] },
    duration: 10000,
    title: 'DATA ENTRAPMENT',
    subtitle: '01',
    text: '80% of clinical evidence is trapped in dead formats. PDFs, faxes, scanned reports. Decades of life-saving research, stranded and inaccessible to AI analysis.',
  },
  {
    id: 'problem-2',
    camera: { pos: [-2, 4.5, -2], look: [0, 1, 0] },
    duration: 10000,
    title: 'INFORMATION OVERLOAD',
    subtitle: '02',
    text: 'Medical knowledge doubles every 73 days. Clinicians drown in data, forced to rely on outdated protocols. Burnout rises. Patient safety falls.',
  },
  {
    id: 'problem-3',
    camera: { pos: [-4, 1.5, 6], look: [-1, 2, -1] },
    duration: 10000,
    title: 'BLACK BOX AI',
    subtitle: '03',
    text: 'Current AI operates without transparency. No sources. No proof. Without traceability, artificial intelligence remains a risky experiment, not a trusted clinical partner.',
  },
  {
    id: 'solution-intro',
    camera: { pos: [0, 6, 8], look: [0, 0, 0] },
    duration: 10000,
    title: 'THE SOLUTION',
    subtitle: 'ETHCR4CK',
    text: 'A three-stage intelligence pipeline that transforms dead data into verified clinical insight.',
  },
  // SOLUTIONS: Right side & front angles — desk, laptop, workspace focus
  {
    id: 'solution-1',
    camera: { pos: [4, 2.5, 3], look: [1, 1, -1] },
    duration: 10000,
    title: 'STRUCTURED KNOWLEDGE',
    subtitle: '01',
    text: 'A Medical NLP pipeline extracts clinical entities from dead PDFs. Drugs, diseases, genes. Static documents become a living, structured knowledge base.',
  },
  {
    id: 'solution-2',
    camera: { pos: [2, 1.5, 1.5], look: [0, 0.8, -1] },
    duration: 10000,
    title: 'FACT-ANCHORED RESPONSES',
    subtitle: '02',
    text: 'Every AI response is anchored to retrieved clinical facts. No hallucinations. No guessing. Verified insights that reduce clinician risk and burnout.',
  },
  {
    id: 'solution-3',
    camera: { pos: [3, 3.5, 5], look: [0, 1, 0] },
    duration: 10000,
    title: '100% TRACEABILITY',
    subtitle: '03',
    text: 'Every recommendation links directly to its source evidence. File, page, paragraph. The black box is eliminated. Doctors get the proof they need to trust AI.',
  },
  {
    id: 'portal',
    // Transition to desk overview from behind chair
    camera: DESK_CAMERA,
    duration: 10000,
    title: 'ENTER THE SYSTEM',
    subtitle: '',
    text: 'Click the laptop to begin.',
  },
];

// ─── TYPEWRITER CLICK SOUND (Web Audio API) ─────────────────
function createClickSound(audioCtx) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = 3800 + Math.random() * 1200;
  osc.type = 'square';
  gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.06);
}

// ─── TYPEWRITER TEXT COMPONENT ──────────────────────────────
function TypewriterText({ text, speed = 35, onComplete, audioCtx }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    indexRef.current = 0;
    if (!text) {
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1));
        if (text[indexRef.current] !== ' ' && audioCtx) {
          try { createClickSound(audioCtx); } catch(e) {}
        }
        indexRef.current++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayed}<span className="typewriter-cursor">|</span></span>;
}

// ─── MAIN CINEMATIC INTRO COMPONENT ─────────────────────────
export default function CinematicIntro({ onCinematicEnd, setCameraTarget, loadProgress = 0 }) {
  const [started, setStarted] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [textComplete, setTextComplete] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const audioCtxRef = useRef(null);
  const timeoutRef = useRef(null);

  // Initialize audio context
  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}
  }, []);

  // Send camera position to 3D scene
  useEffect(() => {
    if (!isActive || !started) return;
    const scene = SCENES[currentScene];
    if (scene && setCameraTarget) {
      setCameraTarget(scene.camera);
    }
  }, [currentScene, isActive, started, setCameraTarget]);

  // Auto-advance scenes
  useEffect(() => {
    if (!isActive || !started) return;
    const scene = SCENES[currentScene];
    if (!scene) return;

    timeoutRef.current = setTimeout(() => {
      if (currentScene < SCENES.length - 1) {
        setTextComplete(false);
        setCurrentScene(prev => prev + 1);
      } else {
        setCameraTarget(DESK_CAMERA);
        onCinematicEnd();
        setIsActive(false);
      }
    }, scene.duration);

    return () => clearTimeout(timeoutRef.current);
  }, [currentScene, isActive, started, onCinematicEnd, setCameraTarget]);

  const goNext = useCallback(() => {
    clearTimeout(timeoutRef.current);
    if (currentScene < SCENES.length - 1) {
      setTextComplete(false);
      setCurrentScene(prev => prev + 1);
    } else {
      setCameraTarget(DESK_CAMERA);
      onCinematicEnd();
      setIsActive(false);
    }
  }, [currentScene, onCinematicEnd, setCameraTarget]);

  const goPrev = useCallback(() => {
    clearTimeout(timeoutRef.current);
    if (currentScene > 0) {
      setTextComplete(false);
      setCurrentScene(prev => prev - 1);
    }
  }, [currentScene]);

  const handleSkip = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setIsActive(false);
    setCameraTarget(DESK_CAMERA);
    onCinematicEnd();
  }, [onCinematicEnd, setCameraTarget]);

  const handleStart = useCallback(() => {
    setStarted(true);
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  // ── START SCREEN ──
  if (!started) {
    const loaded = loadProgress >= 100;
    return (
      <div className="cinematic-overlay start-screen">
        <div className="start-content">
          <h1 className="start-title">ETHCR4CK</h1>
          <p className="start-sub">CLINICAL INTELLIGENCE SYSTEM</p>
          <button 
            className={`start-btn ${!loaded ? 'disabled' : ''}`} 
            onClick={loaded ? handleStart : undefined}
            style={!loaded ? { opacity: 0.3, cursor: 'default' } : {}}
          >
            {loaded ? 'START' : 'LOADING...'}
          </button>
          <div className="start-loader">
            <div 
              className="start-loader-fill" 
              style={{ width: `${loadProgress}%` }} 
            />
          </div>
          <p className="start-progress-text">{Math.round(loadProgress)}%</p>
        </div>
      </div>
    );
  }

  if (!isActive) return null;

  const scene = SCENES[currentScene];
  if (!scene) return null;

  const isTitle = scene.id === 'title';
  const isProblem = scene.id.startsWith('problem');
  const isSolution = scene.id.startsWith('solution');

  return (
    <div className="cinematic-overlay">
      {/* Scene indicator dots */}
      <div className="scene-indicators">
        {SCENES.map((s, i) => (
          <div 
            key={s.id} 
            className={`scene-dot ${i === currentScene ? 'active' : ''} ${i < currentScene ? 'done' : ''}`} 
          />
        ))}
      </div>

      {/* Main text block with glass background for readability */}
      <div className={`cinematic-text-block ${isTitle ? 'center' : 'bottom-left'}`}>
        <div className="cinematic-glass">
          {scene.subtitle && (
            <p className="cinematic-subtitle">{scene.subtitle}</p>
          )}
          {scene.title && (
            <h1 className={`cinematic-title ${isProblem ? 'problem' : ''} ${isSolution ? 'solution' : ''} ${isTitle ? 'hero-title' : ''}`}>
              {scene.title}
            </h1>
          )}
          {scene.text && (
            <p className="cinematic-body">
              <TypewriterText 
                key={scene.id}
                text={scene.text} 
                speed={isProblem || isSolution ? 25 : 35}
                onComplete={() => setTextComplete(true)}
                audioCtx={audioCtxRef.current}
              />
            </p>
          )}
        </div>
      </div>

      {/* Navigation controls */}
      <div className="cinema-nav">
        <button 
          className="nav-btn" 
          onClick={goPrev} 
          disabled={currentScene === 0}
          title="Previous"
        >
          ‹
        </button>
        <span className="nav-counter">{currentScene + 1} / {SCENES.length}</span>
        <button 
          className="nav-btn" 
          onClick={goNext}
          title="Next"
        >
          ›
        </button>
      </div>

      {/* Skip button */}
      <button className="skip-btn" onClick={handleSkip}>
        SKIP INTRO →
      </button>

      {/* Scene progress bar */}
      <div className="scene-progress">
        <div 
          className="scene-progress-fill" 
          style={{ 
            width: `${((currentScene + 1) / SCENES.length) * 100}%`,
            transition: 'width 0.8s ease-out'
          }} 
        />
      </div>
    </div>
  );
}

export { SCENES, DESK_CAMERA, CHAIR_CAMERA };
