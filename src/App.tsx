import { useState, useEffect, useCallback, useRef } from 'react';
import { useTimer } from './hooks/useTimer';
import './App.css';

type Animal = 'pug' | 'cat';
type Background = 'none' | 'beach' | 'sunset';

const ANIMALS: Record<Animal, { name: string; image: string }> = {
  pug: {
    name: 'Pug Dog',
    image: `${import.meta.env.BASE_URL}pug.png`
  },
  cat: {
    name: 'Black Cat',
    image: `${import.meta.env.BASE_URL}cat.png`
  }
};

const BACKGROUNDS: Record<Background, { name: string; image: string }> = {
  none: { name: 'Transparent', image: '' },
  beach: { name: 'Beach', image: `${import.meta.env.BASE_URL}backgrounds/Beach Background.png` },
  sunset: { name: 'Sunset Beach', image: `${import.meta.env.BASE_URL}backgrounds/Sunset Beach Background.png` }
};

const BUBBLE_DURATION = 5000; // 5 seconds
const MAX_TEXT_LENGTH = 20;

function App() {
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [notificationText, setNotificationText] = useState("Time to stretch!");
  const [selectedAnimal, setSelectedAnimal] = useState<Animal>('pug');
  const [selectedBg, setSelectedBg] = useState<Background>('none');
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const pipWindowRef = useRef<any>(null);
  const bubbleTimeoutRef = useRef<number | null>(null);

  const getCharacterElement = (animal: Animal, isLarge = false, withBubble = false) => {
    return (
      <div className={`character-container ${isLarge ? 'large' : ''}`}>
        {withBubble && showBubble && (
          <div className="speech-bubble">
            {notificationText}
            <button className="close-bubble" onClick={() => setShowBubble(false)}>×</button>
          </div>
        )}
        <img 
          src={ANIMALS[animal].image}
          className={`character-img ${isLarge ? 'large' : ''}`}
          alt={ANIMALS[animal].name}
        />
      </div>
    );
  };

  const updatePiPContent = useCallback(() => {
    if (pipWindowRef.current) {
      const body = pipWindowRef.current.document.body;
      body.innerHTML = '';
      
      const pipContainer = pipWindowRef.current.document.createElement('div');
      pipContainer.className = 'pip-container';
      
      if (selectedBg !== 'none') {
        pipContainer.style.backgroundImage = `url('${BACKGROUNDS[selectedBg].image}')`;
        pipContainer.style.backgroundSize = 'cover';
        pipContainer.style.backgroundPosition = 'center';
      }

      const charContainer = pipWindowRef.current.document.createElement('div');
      charContainer.className = 'character-container large';
      
      if (showBubble) {
        const bubble = pipWindowRef.current.document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.textContent = notificationText;
        const closeBtn = pipWindowRef.current.document.createElement('button');
        closeBtn.className = 'close-bubble';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => setShowBubble(false);
        bubble.appendChild(closeBtn);
        charContainer.appendChild(bubble);
      }

      const img = pipWindowRef.current.document.createElement('img');
      img.className = 'character-img large';
      img.src = ANIMALS[selectedAnimal].image;
      charContainer.appendChild(img);
      
      pipContainer.appendChild(charContainer);
      body.appendChild(pipContainer);
    }
  }, [selectedAnimal, selectedBg, showBubble, notificationText]);

  const togglePiP = async () => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setIsPiPOpen(false);
      return;
    }

    if (!('documentPictureInPicture' in window)) {
      alert("Document Picture-in-Picture is not supported in your browser. Try Chrome or Edge.");
      return;
    }

    try {
      const pip = (window as any).documentPictureInPicture;
      const width = 200;
      const height = 150;
      const pipWindow = await pip.requestWindow({ width, height });
      pipWindowRef.current = pipWindow;
      setIsPiPOpen(true);

      // Lock size by snapping back on resize
      pipWindow.addEventListener('resize', () => {
        pipWindow.resizeTo(width, height);
      });

      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          if (styleSheet.href) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          }
        }
      });

      pipWindow.document.documentElement.style.height = '100%';
      pipWindow.document.body.style.height = '100%';
      pipWindow.document.body.style.margin = '0';
      pipWindow.document.body.style.overflow = 'hidden';
      pipWindow.document.body.style.display = 'flex';
      pipWindow.document.body.style.justifyContent = 'center';
      pipWindow.document.body.style.alignItems = 'center';
      pipWindow.document.body.style.backgroundColor = 'transparent';

      updatePiPContent();

      pipWindow.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
        setIsPiPOpen(false);
      });
    } catch (err) {
      console.error("Failed to open PiP window:", err);
    }
  };

  useEffect(() => {
    updatePiPContent();
  }, [selectedAnimal, selectedBg, showBubble, notificationText, updatePiPContent]);

  useEffect(() => {
    if (showBubble) {
      bubbleTimeoutRef.current = window.setTimeout(() => {
        setShowBubble(false);
      }, BUBBLE_DURATION);
    }
    return () => {
      if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
    };
  }, [showBubble]);

  const playNotificationSound = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = context.currentTime;
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = context.createOscillator();
        const g = context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.1, start + 0.05);
        g.gain.linearRampToValueAtTime(0, start + duration);
        osc.connect(g);
        g.connect(context.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(523.25, now, 0.2);
      playTone(659.25, now + 0.15, 0.2);
      playTone(783.99, now + 0.3, 0.3);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const handleComplete = useCallback(() => {
    playNotificationSound();
    setShowBubble(true);
  }, []);

  const { secondsRemaining, isActive, start, pause, reset } = useTimer({
    initialSeconds: timerMinutes * 60,
    onComplete: handleComplete,
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= MAX_TEXT_LENGTH) {
      setNotificationText(text);
    }
  };

  return (
    <div className="container transparent">
      <header>
        <h1>Bid Bid Bid Bid Bid Bid Bid Bid</h1>
        <p className="tagline">Bid more, win more, stay healthy!</p>
      </header>

      <main>
        <div className={`timer-display ${isActive ? 'active' : ''}`}>
          {formatTime(secondsRemaining)}
        </div>

        <div className="controls">
          {!isActive ? (
            <button className="btn btn-primary" onClick={start}>
              {secondsRemaining === timerMinutes * 60 ? 'Start Timer' : 'Resume'}
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={pause}>
              Pause
            </button>
          )}
          <button className="btn btn-outline" onClick={reset}>
            Reset
          </button>
        </div>

        <section className="settings">
          <div className="setting-item">
            <label>Choose Your Companion:</label>
            <div className="animal-selection">
              {(Object.keys(ANIMALS) as Animal[]).map((key) => (
                <div
                  key={key}
                  className={`animal-option ${selectedAnimal === key ? 'selected' : ''}`}
                  onClick={() => setSelectedAnimal(key)}
                  title={ANIMALS[key].name}
                >
                  {getCharacterElement(key)}
                </div>
              ))}
            </div>
          </div>

          <div className="setting-item">
            <label>PiP Background:</label>
            <div className="bg-selection">
              {(Object.keys(BACKGROUNDS) as Background[]).map((key) => (
                <button
                  key={key}
                  className={`bg-option ${selectedBg === key ? 'selected' : ''}`}
                  onClick={() => setSelectedBg(key)}
                >
                  {BACKGROUNDS[key].name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="setting-item">
            <label htmlFor="timerMinutes">Reminder Interval (minutes):</label>
            <input
              type="number"
              id="timerMinutes"
              min="1"
              max="120"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 1)}
              disabled={isActive}
            />
          </div>
          <div className="setting-item">
            <label htmlFor="notificationText">
              Custom Message: 
              <span className="char-count"> {notificationText.length}/{MAX_TEXT_LENGTH}</span>
            </label>
            <textarea
              id="notificationText"
              rows={2}
              value={notificationText}
              onChange={handleTextChange}
              placeholder="Max 20 characters"
            />
          </div>
        </section>

        <div className="character-preview">
          <div className="current-animal transparent">
            {getCharacterElement(selectedAnimal, true, true)}
          </div>
          <button className="btn btn-pip" onClick={togglePiP}>
            {isPiPOpen ? 'Close Floating Companion' : 'Float Companion (PiP)'}
          </button>
        </div>
      </main>

      <footer>
        <p>&copy; 2026 Bid Bid Bid Bid Bid Bid Bid Bid. Bid on!</p>
      </footer>
    </div>
  );
}

export default App;
