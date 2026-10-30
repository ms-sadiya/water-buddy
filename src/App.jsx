import React, { useState, useEffect, useRef } from 'react';
import WaterBuddy from './components/WaterBuddy/WaterBuddy.jsx';

export default function App() {
  const [uiState, setUiState] = useState('reminding'); // 'hidden' | 'reminding' | 'confirmed' | 'snoozed'
  const [message, setMessage] = useState("Hey! It's time to drink water! 💧");
  const [characterMood, setCharacterMood] = useState('waving'); // 'idle' | 'happy' | 'gentle' | 'waving'
  const [isProcessing, setIsProcessing] = useState(false);

  // Timer ref to cleanly manage the waving -> idle greeting transition without leaks or stale timers
  const wavingTimerRef = useRef(null);

  /**
   * Helper to trigger a brief waving greeting when a reminder appears,
   * transitioning smoothly to idle after 1.8s while buttons remain interactive.
   */
  const startWavingGreeting = () => {
    if (wavingTimerRef.current) {
      clearTimeout(wavingTimerRef.current);
    }
    setCharacterMood('waving');
    wavingTimerRef.current = setTimeout(() => {
      setCharacterMood('idle');
      wavingTimerRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    let isMounted = true;

    // Synchronize initial state with Electron main process on mount (handles renderer reloads)
    if (window.waterBuddyAPI?.getReminderState) {
      window.waterBuddyAPI
        .getReminderState()
        .then((stateData) => {
          if (!isMounted || !stateData) return;
          if (stateData.state === 'reminding') {
            setUiState('reminding');
            setMessage(stateData.messages?.prompt || "Hey! It's time to drink water! 💧");
            setIsProcessing(false);
            startWavingGreeting();
          } else if (stateData.state === 'confirmed') {
            setUiState('confirmed');
            setMessage(stateData.messages?.confirmed || "Awesome! Stay hydrated! 💧✨");
            setIsProcessing(true);
            setCharacterMood('happy');
          } else if (stateData.state === 'snoozed') {
            setUiState('snoozed');
            setMessage(stateData.messages?.snoozed || "No worries! I'll remind you again soon! 💧");
            setIsProcessing(true);
            setCharacterMood('gentle');
          }
        })
        .catch((err) => {
          console.error('[App] Failed to fetch initial reminder state:', err);
        });
    }

    // Subscribe to reminder notifications triggered by main process scheduler
    const unsubReminder = window.waterBuddyAPI?.onReminderShown?.((data) => {
      if (!isMounted) return;
      setUiState('reminding');
      setMessage(data?.message || "Hey! It's time to drink water! 💧");
      setIsProcessing(false);
      startWavingGreeting();
    });

    // Subscribe to manual show events from system tray
    const unsubManual = window.waterBuddyAPI?.onManualShow?.((data) => {
      if (!isMounted) return;
      if (data?.isReminding) {
        setUiState('reminding');
        setMessage(data.message || "Hey! It's time to drink water! 💧");
        setIsProcessing(false);
        startWavingGreeting();
      } else {
        setMessage(data?.message || "Water Buddy is active & keeping you hydrated! 💧");
        startWavingGreeting();
      }
    });

    return () => {
      isMounted = false;
      if (wavingTimerRef.current) {
        clearTimeout(wavingTimerRef.current);
      }
      if (typeof unsubReminder === 'function') unsubReminder();
      if (typeof unsubManual === 'function') unsubManual();
    };
  }, []);

  const handleYes = async () => {
    if (isProcessing) return;

    if (wavingTimerRef.current) {
      clearTimeout(wavingTimerRef.current);
      wavingTimerRef.current = null;
    }

    // Immediately update UI to provide instant feedback and prevent duplicate clicks
    setIsProcessing(true);
    setUiState('confirmed');
    setMessage("Awesome! Stay hydrated! 💧✨");
    setCharacterMood('happy');

    try {
      if (window.waterBuddyAPI?.confirmWater) {
        const response = await window.waterBuddyAPI.confirmWater();
        if (response?.message) {
          setMessage(response.message);
        }
      }
    } catch (err) {
      console.error('[App] Error sending confirmWater IPC event:', err);
      setIsProcessing(false);
    }
  };

  const handleNotYet = async () => {
    if (isProcessing) return;

    if (wavingTimerRef.current) {
      clearTimeout(wavingTimerRef.current);
      wavingTimerRef.current = null;
    }

    // Immediately update UI to provide instant feedback and prevent duplicate clicks
    setIsProcessing(true);
    setUiState('snoozed');
    setMessage("No worries! I'll remind you again soon! 💧");
    setCharacterMood('gentle');

    try {
      if (window.waterBuddyAPI?.snoozeReminder) {
        const response = await window.waterBuddyAPI.snoozeReminder();
        if (response?.message) {
          setMessage(response.message);
        }
      }
    } catch (err) {
      console.error('[App] Error sending snoozeReminder IPC event:', err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="buddy-container">
      {/* Speech Bubble Container */}
      <div className="speech-bubble-wrapper">
        <div className="speech-bubble">
          <p className="speech-text">{message}</p>
          <div className="button-group">
            <button
              id="btn-yes"
              type="button"
              className="buddy-btn btn-yes"
              onClick={handleYes}
              disabled={isProcessing}
            >
              Yes, I did!
            </button>
            <button
              id="btn-not-yet"
              type="button"
              className="buddy-btn btn-not-yet"
              onClick={handleNotYet}
              disabled={isProcessing}
            >
              Not yet
            </button>
          </div>
        </div>
        <div className="speech-tail" aria-hidden="true"></div>
      </div>

      {/* 3D Character Component */}
      <WaterBuddy state={characterMood} />
    </div>
  );
}
