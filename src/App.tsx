import { useState, useEffect, useCallback, useRef } from 'react';
import { useTimer } from './hooks/useTimer';
import './App.css';

type Animal = 'black_cat' | 'french_bulldog';
type Background = 'beach' | 'sunset';

const ANIMALS: Record<Animal, { 
  name: string; 
  image: string; 
  stretchImage: string | null; 
  sleepImage: string | null; 
  icon: string; 
  isAnimated?: boolean; 
  customClass?: string;
  sleepDurationRange: [number, number]; // [min_minutes, max_minutes]
}> = {
  black_cat: {
    name: 'Black Cat',
    image: `${import.meta.env.BASE_URL}cat-idle`,
    stretchImage: `${import.meta.env.BASE_URL}cat-stretch`,
    sleepImage: `${import.meta.env.BASE_URL}cat-sleep`,
    icon: `${import.meta.env.BASE_URL}cat-static.png`,
    isAnimated: true,
    sleepDurationRange: [3, 6] // Deep sleeper
  },
  french_bulldog: {
    name: 'French bulldog',
    image: `${import.meta.env.BASE_URL}bulldog-idle`,
    stretchImage: `${import.meta.env.BASE_URL}bulldog-stretch`,
    sleepImage: `${import.meta.env.BASE_URL}bulldog-sleep`,
    icon: `${import.meta.env.BASE_URL}bulldog-static.png`,
    isAnimated: true,
    sleepDurationRange: [1, 3] // Light sleeper
  }
};

const BACKGROUNDS: Record<Background, { name: string; image: string }> = {
  beach: { name: 'Beach', image: `${import.meta.env.BASE_URL}backgrounds/Beach Background.png` },
  sunset: { name: 'Sunset Beach', image: `${import.meta.env.BASE_URL}backgrounds/Sunset Beach Background.png` }
};

const BUBBLE_DURATION = 7000; // 7 seconds
const MAX_TEXT_LENGTH = 20;

function App() {
  const [timerMinutes, setTimerMinutes] = useState<number | string>(60);
  const [notificationText, setNotificationText] = useState("Time to bid!");
  const [selectedAnimal, setSelectedAnimal] = useState<Animal>('black_cat');
  const [selectedBg, setSelectedBg] = useState<Background>('beach');
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [napTime, setNapTime] = useState(0);
  const pipWindowRef = useRef<Window | null>(null);
  const bubbleTimeoutRef = useRef<number | null>(null);
  const sleepTimeoutRef = useRef<number | null>(null);
  const pipElementsRef = useRef<{
    container: HTMLDivElement;
    napValue: HTMLDivElement;
    charContainer: HTMLDivElement;
    bubble: HTMLDivElement | null;
    bubbleText: Text | null;
    sprite: HTMLImageElement;
  } | null>(null);

  // Preload all animation frames to prevent lag on first use
  useEffect(() => {
    const imagesToPreload: string[] = [];
    Object.values(ANIMALS).forEach(animal => {
      if (animal.isAnimated) {
        [animal.image, animal.stretchImage, animal.sleepImage].forEach(baseUrl => {
          if (baseUrl) {
            for (let i = 1; i <= 4; i++) {
              imagesToPreload.push(`${baseUrl}/${i}.png`);
            }
          }
        });
      }
    });

    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const context = new AudioContextClass();
      const now = context.currentTime;
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = context.createOscillator();
        const g = context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        g.gain.setValueAtTime(0, startTime);
        g.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
        g.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.connect(g);
        g.connect(context.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playTone(523.25, now, 0.2);
      playTone(659.25, now + 0.15, 0.2);
      playTone(783.99, now + 0.3, 0.3);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, []);

  const handleComplete = useCallback(() => {
    setCurrentFrame(1);
    playNotificationSound();
    setShowBubble(true);
  }, [playNotificationSound]);

  const { secondsRemaining, isActive, start, pause, reset } = useTimer({
    initialSeconds: (Number(timerMinutes) || 0) * 60,
    onComplete: handleComplete,
  });

  const startSleeping = useCallback(() => {
    if (ANIMALS[selectedAnimal].sleepImage === null) return;
    setCurrentFrame(1);
    setIsSleeping(true);
    setShowBubble(false);
    
    const [minMin, maxMin] = ANIMALS[selectedAnimal].sleepDurationRange;
    const duration = (Math.floor(Math.random() * (maxMin * 60 - minMin * 60 + 1)) + minMin * 60) * 1000;
    
    if (sleepTimeoutRef.current) clearTimeout(sleepTimeoutRef.current);
    sleepTimeoutRef.current = window.setTimeout(() => {
      setIsSleeping(false);
    }, duration);
  }, [selectedAnimal]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let interval: any;
    if (isSleeping) {
      interval = setInterval(() => {
        setNapTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSleeping]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNapTime(0);
  }, [selectedAnimal]);

  useEffect(() => {
    const hasStretch = ANIMALS[selectedAnimal].stretchImage !== null;
    const hasSleep = ANIMALS[selectedAnimal].sleepImage !== null;
    
    if (showBubble && hasStretch) {
      let timeoutId: number;
      const playStretch = (frame: number) => {
        setCurrentFrame(frame);
        const nextFrame = (frame % 4) + 1;
        const delay = (frame === 3 || frame === 4) ? 500 : 200;
        timeoutId = window.setTimeout(() => playStretch(nextFrame), delay);
      };
      
      playStretch(1);
      return () => clearTimeout(timeoutId);
    } else if (isSleeping && hasSleep) {
      const interval = setInterval(() => {
        setCurrentFrame(f => (f % 4) + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      let timeoutId: number;
      const playIdle = (frame: number) => {
        setCurrentFrame(frame);
        const nextFrame = (frame % 4) + 1;
        // Frame 3 and 4 get a slightly longer pause for a more natural rhythm
        const delay = (frame === 3 || frame === 4) ? 300 : 200;
        timeoutId = window.setTimeout(() => playIdle(nextFrame), delay);
      };
      
      playIdle(1);
      return () => clearTimeout(timeoutId);
    }
  }, [showBubble, isSleeping, selectedAnimal]);

  useEffect(() => {
    if (!isActive || isSleeping || Number(timerMinutes) < 10) {
      return;
    }

    const interval = setInterval(() => {
      if (Math.random() < 0.05) {
        startSleeping();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isActive, isSleeping, timerMinutes, startSleeping]);

  const getCharacterElement = (animal: Animal, isLarge = false, withBubble = false) => {
    const isAnimated = ANIMALS[animal].isAnimated;
    const isStretching = showBubble && ANIMALS[animal].stretchImage !== null;
    const isActuallySleeping = isSleeping && ANIMALS[animal].sleepImage !== null;
    const customClass = ANIMALS[animal].customClass || '';
    
    let imageUrl = ANIMALS[animal].image;
    if (isAnimated) {
      if (isStretching) {
        imageUrl = `${ANIMALS[animal].stretchImage}/${currentFrame}.png`;
      } else if (isActuallySleeping) {
        imageUrl = `${ANIMALS[animal].sleepImage}/${currentFrame}.png`;
      } else {
        imageUrl = `${ANIMALS[animal].image}/${currentFrame}.png`;
      }
    }

    return (
      <div className={`character-container ${isLarge ? 'large' : ''} ${isStretching ? 'stretching' : ''} ${isActuallySleeping ? 'sleeping' : ''} ${customClass}`}>
        {withBubble && showBubble && (
          <div className="speech-bubble">
            {notificationText}
            <button className="close-bubble" onClick={() => setShowBubble(false)}>×</button>
          </div>
        )}
        <img 
          src={isAnimated ? imageUrl : ANIMALS[animal].image}
          className={`character-sprite ${isLarge ? 'large' : ''} ${!isAnimated ? 'character-img' : ''}`}
          alt={ANIMALS[animal].name}
        />
      </div>
    );
  };

  const updatePiPContent = useCallback(() => {
    if (pipWindowRef.current) {
      const isStretching = showBubble && ANIMALS[selectedAnimal].stretchImage !== null;
      const isActuallySleeping = isSleeping && ANIMALS[selectedAnimal].sleepImage !== null;
      const customClass = ANIMALS[selectedAnimal].customClass || '';
      
      if (!pipElementsRef.current) {
        const body = pipWindowRef.current.document.body;
        body.innerHTML = '';
        
        const pipContainer = pipWindowRef.current.document.createElement('div');
        pipContainer.className = 'pip-container';
        
        const napTimer = pipWindowRef.current.document.createElement('div');
        napTimer.className = 'nap-timer';
        const napLabel = pipWindowRef.current.document.createElement('div');
        napLabel.className = 'nap-label';
        napLabel.textContent = 'NAP TIME';
        const napValue = pipWindowRef.current.document.createElement('div');
        napValue.className = 'nap-value';
        napTimer.appendChild(napLabel);
        napTimer.appendChild(napValue);
        pipContainer.appendChild(napTimer);

        const charContainer = pipWindowRef.current.document.createElement('div');
        
        const sprite = pipWindowRef.current.document.createElement('img');
        sprite.alt = ANIMALS[selectedAnimal].name;
        charContainer.appendChild(sprite);
        pipContainer.appendChild(charContainer);
        body.appendChild(pipContainer);

        pipElementsRef.current = {
          container: pipContainer,
          napValue,
          charContainer,
          bubble: null,
          bubbleText: null,
          sprite
        };
      }

      const { container, napValue, charContainer, sprite } = pipElementsRef.current;
      
      container.style.backgroundImage = `url('${BACKGROUNDS[selectedBg].image}')`;
      napValue.textContent = formatTime(napTime);
      charContainer.className = `character-container large ${isStretching ? 'stretching' : ''} ${isActuallySleeping ? 'sleeping' : ''} ${customClass}`;
      
      if (showBubble) {
        if (!pipElementsRef.current.bubble) {
          const bubble = pipWindowRef.current.document.createElement('div');
          bubble.className = 'speech-bubble';
          const bubbleText = pipWindowRef.current.document.createTextNode(notificationText);
          bubble.appendChild(bubbleText);
          const closeBtn = pipWindowRef.current.document.createElement('button');
          closeBtn.className = 'close-bubble';
          closeBtn.textContent = '×';
          closeBtn.onclick = () => setShowBubble(false);
          bubble.appendChild(closeBtn);
          charContainer.insertBefore(bubble, sprite);
          pipElementsRef.current.bubble = bubble;
          pipElementsRef.current.bubbleText = bubbleText;
        } else if (pipElementsRef.current.bubbleText) {
          pipElementsRef.current.bubbleText.nodeValue = notificationText;
        }
      } else if (pipElementsRef.current.bubble) {
        pipElementsRef.current.bubble.remove();
        pipElementsRef.current.bubble = null;
        pipElementsRef.current.bubbleText = null;
      }

      let imageUrl = ANIMALS[selectedAnimal].image;
      if (ANIMALS[selectedAnimal].isAnimated) {
        if (isStretching) {
          imageUrl = `${ANIMALS[selectedAnimal].stretchImage}/${currentFrame}.png`;
        } else if (isActuallySleeping) {
          imageUrl = `${ANIMALS[selectedAnimal].sleepImage}/${currentFrame}.png`;
        } else {
          imageUrl = `${ANIMALS[selectedAnimal].image}/${currentFrame}.png`;
        }
      }
      
      if (sprite.src !== imageUrl) {
        sprite.src = imageUrl;
      }
      sprite.className = `character-sprite large ${!ANIMALS[selectedAnimal].isAnimated ? 'character-img' : ''}`;
    }
  }, [selectedAnimal, selectedBg, showBubble, notificationText, currentFrame, isSleeping, napTime, formatTime]);

  const togglePiP = async () => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pip = (window as any).documentPictureInPicture;
    if (!pip) {
      alert("Document Picture-in-Picture is not supported in your browser. Try Chrome or Edge.");
      return;
    }

    try {
      const width = 200;
      const height = 150;
      const pipWindow = await pip.requestWindow({ width, height });
      pipWindowRef.current = pipWindow;
      setIsPiPOpen(true);

      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch {
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
        pipElementsRef.current = null;
        setIsPiPOpen(false);
      });
    } catch (err) {
      console.error("Failed to open PiP window:", err);
    }
  };

  useEffect(() => {
    updatePiPContent();
  }, [updatePiPContent]);

  useEffect(() => {
    if (showBubble) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSleeping(false);
      bubbleTimeoutRef.current = window.setTimeout(() => {
        setShowBubble(false);
      }, BUBBLE_DURATION);
    }
    return () => {
      if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
    };
  }, [showBubble]);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    if (text.length <= MAX_TEXT_LENGTH) {
      setNotificationText(text);
    }
  };

  const handleTimerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    if (val === '') {
      setTimerMinutes('');
      return;
    }
    
    const parsed = parseInt(val);
    if (!isNaN(parsed)) {
      // Allow the value if it's within range, or if it's a prefix of a possible valid value
      // This allows the user to clear and type a new number
      setTimerMinutes(Math.min(120, Math.max(0, parsed)));
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
            <button 
              className="btn btn-primary" 
              onClick={start}
              disabled={!timerMinutes || Number(timerMinutes) <= 0}
            >
              {secondsRemaining === (Number(timerMinutes) || 0) * 60 ? 'Start Timer' : 'Resume'}
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
                  onClick={() => {
                    setSelectedAnimal(key);
                    setCurrentFrame(1);
                  }}
                  title={ANIMALS[key].name}
                >
                  <img src={ANIMALS[key].icon} alt={ANIMALS[key].name} className={`selection-icon ${ANIMALS[key].customClass || ''}`} />
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
              onChange={handleTimerChange}
              onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
              disabled={isActive}
            />
          </div>
          <div className="setting-item">
            <label htmlFor="notificationText">
              Custom Message: 
              <span className={`char-count ${notificationText.length >= MAX_TEXT_LENGTH ? 'limit' : ''}`}> 
                {notificationText.length}/{MAX_TEXT_LENGTH}
              </span>
            </label>
            <textarea
              id="notificationText"
              rows={2}
              value={notificationText}
              onChange={handleTextChange}
              placeholder="Time to bid!"
            />
          </div>
        </section>

        <div className="character-preview">
          <div 
            className={`current-animal ${isPiPOpen ? 'pip-active' : ''}`}
            style={{ backgroundImage: `url('${BACKGROUNDS[selectedBg].image}')` }}
          >
            <div className="nap-timer">
              <div className="nap-label">NAP TIME</div>
              <div className="nap-value">{formatTime(napTime)}</div>
            </div>
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
