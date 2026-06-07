import React from 'react';
import { useGameStore } from '../store/useGameStore';

const STEPS = [
  {
    title: 'Move & Explore',
    body:  'Use the joystick (or WASD / arrow keys) to move around Kaelford. The world is huge — explore!',
    icon:  '🕹️',
    anchor: 'bottom',
  },
  {
    title: 'Attack Enemies',
    body:  'Tap the ⚔ Attack button (or press Space) to swing your weapon. Hit enemies to earn XP and loot.',
    icon:  '⚔️',
    anchor: 'bottom',
  },
  {
    title: 'Use Checkpoints',
    body:  'Walk into a glowing flag to save your progress. Respawn here if you fall in battle.',
    icon:  '🚩',
    anchor: 'top',
  },
  {
    title: 'Enter the Realms',
    body:  'Find the realm portals on the map to challenge bosses and earn divine rewards. Good luck, Prodigy!',
    icon:  '🌀',
    anchor: 'top',
  },
];

export default function TutorialOverlay() {
  const tutorialStep   = useGameStore(s => s.tutorialStep);
  const advanceTutorial = useGameStore(s => s.advanceTutorial);

  // Steps 0–3 are tutorial; step >= 4 means done
  if (tutorialStep >= STEPS.length) return null;

  const step = STEPS[tutorialStep];
  const isLast = tutorialStep === STEPS.length - 1;
  const fromBottom = step.anchor === 'bottom';

  const overlayStyle = {
    position:        'fixed',
    inset:           0,
    zIndex:          9000,
    pointerEvents:   'none',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  fromBottom ? 'flex-end' : 'flex-start',
    padding:         fromBottom ? '0 0 120px 0' : 'calc(env(safe-area-inset-top) + 70px) 0 0 0',
  };

  const dimStyle = {
    position:  'fixed',
    inset:     0,
    zIndex:    8999,
    background:'rgba(0,0,0,0.45)',
    pointerEvents: 'all',
  };

  const cardStyle = {
    pointerEvents:  'all',
    background:     'linear-gradient(160deg,#1a1a2e 0%,#16213e 100%)',
    border:         '1.5px solid #d4af37',
    borderRadius:   18,
    padding:        '22px 26px 18px',
    maxWidth:       320,
    width:          'calc(100% - 48px)',
    boxShadow:      '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px #d4af3722',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            10,
    animation:      'tutSlide 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
  };

  const iconStyle = {
    fontSize: 36,
    lineHeight: 1,
  };

  const titleStyle = {
    color:      '#d4af37',
    fontSize:   17,
    fontWeight: 700,
    fontFamily: "'Georgia', serif",
    textAlign:  'center',
    margin:     0,
  };

  const bodyStyle = {
    color:      '#ccc',
    fontSize:   13.5,
    lineHeight: 1.5,
    textAlign:  'center',
    margin:     '2px 0 6px',
  };

  const dotsStyle = {
    display:  'flex',
    gap:      6,
    margin:   '4px 0 8px',
  };

  const btnStyle = {
    background:   'linear-gradient(135deg,#d4af37,#f5c842)',
    border:       'none',
    borderRadius: 10,
    padding:      '11px 36px',
    color:        '#0d0d1a',
    fontWeight:   700,
    fontSize:     14,
    cursor:       'pointer',
    letterSpacing: 0.4,
    width:        '100%',
  };

  const skipStyle = {
    marginTop:  6,
    background: 'none',
    border:     'none',
    color:      '#888',
    fontSize:   12,
    cursor:     'pointer',
    padding:    '4px 0',
  };

  // Skip all remaining steps
  const skipAll = () => {
    const remaining = STEPS.length - tutorialStep;
    for (let i = 0; i < remaining; i++) advanceTutorial();
  };

  return (
    <>
      <style>{`
        @keyframes tutSlide {
          from { opacity:0; transform: translateY(${fromBottom ? '30px' : '-30px'}) scale(0.92); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* dim layer — clicking it does nothing, just blocks game inputs */}
      <div style={dimStyle} />

      {/* tooltip card */}
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={iconStyle}>{step.icon}</div>
          <p style={titleStyle}>{step.title}</p>
          <p style={bodyStyle}>{step.body}</p>

          {/* progress dots */}
          <div style={dotsStyle}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width:        i === tutorialStep ? 18 : 7,
                height:       7,
                borderRadius: 4,
                background:   i < tutorialStep ? '#d4af37' : i === tutorialStep ? '#f5c842' : '#444',
                transition:   'all 0.2s',
              }} />
            ))}
          </div>

          <button style={btnStyle} onClick={advanceTutorial}>
            {isLast ? 'Start Playing' : 'Next →'}
          </button>
          {!isLast && (
            <button style={skipStyle} onClick={skipAll}>Skip tutorial</button>
          )}
        </div>
      </div>
    </>
  );
}
