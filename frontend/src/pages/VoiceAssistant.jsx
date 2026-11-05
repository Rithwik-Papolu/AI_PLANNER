import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
  Radio,
  Check,
  RotateCcw,
  Bot,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  Square,
  Flame,
  ShieldCheck
} from 'lucide-react';
import GlossyIcon from '../components/GlossyIcon';
import AudioWaveform from '../components/AudioWaveform';
import { api } from '../api/client';

// Explicit Voice State Machine
const VOICE_STATES = {
  IDLE: 'idle',
  WAITING_WAKE: 'waiting_wake',
  LISTENING: 'listening',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  ERROR: 'error'
};

export default function VoiceAssistant() {
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [wakeWordMode, setWakeWordMode] = useState(true);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastWakeWord, setLastWakeWord] = useState(null);
  const [showWakeFlash, setShowWakeFlash] = useState(false);
  const [transcriptsLog, setTranscriptsLog] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [micPermissionGranted, setMicPermissionGranted] = useState(null);

  // Diagnostics Modal State
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [diagData, setDiagData] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // Pending Task for Voice Confirmation
  const [pendingVoiceTask, setPendingVoiceTask] = useState(null);

  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const stateRef = useRef(voiceState);
  stateRef.current = voiceState;
  const isActiveRef = useRef(false);
  isActiveRef.current = isVoiceActive;
  const wakeWordModeRef = useRef(wakeWordMode);
  wakeWordModeRef.current = wakeWordMode;

  // Web Audio Chime on Wake Word Detection
  const playWakeChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.debug('AudioContext chime error:', e);
    }
  }, []);

  // Request & check microphone permission
  const checkMicrophonePermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Microphone access is not supported by your current browser environment.");
        setMicPermissionGranted(false);
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicPermissionGranted(true);
      setErrorMessage(null);
      return true;
    } catch (err) {
      console.warn('Microphone permission error:', err);
      setMicPermissionGranted(false);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? "Microphone access was blocked. Please enable microphone permissions in your browser URL bar."
          : `Microphone unavailable: ${err.message}`
      );
      setVoiceState(VOICE_STATES.ERROR);
      return false;
    }
  };

  // Safe Speech Synthesis with GC protection and markdown stripping
  const speakSpokenResponse = useCallback((text) => {
    if (isMuted || !window.speechSynthesis || !text) {
      if (isActiveRef.current && wakeWordModeRef.current) {
        setVoiceState(VOICE_STATES.WAITING_WAKE);
      } else if (isActiveRef.current) {
        setVoiceState(VOICE_STATES.LISTENING);
      } else {
        setVoiceState(VOICE_STATES.IDLE);
      }
      return;
    }

    try {
      window.speechSynthesis.cancel();

      // Temporarily halt speech recognition to avoid picking up self-voice
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      // Attach to global window to prevent premature garbage collection in Chrome/Edge
      window.__ai_planner_speech_utterance = utterance;

      setVoiceState(VOICE_STATES.SPEAKING);

      utterance.onstart = () => {
        setVoiceState(VOICE_STATES.SPEAKING);
      };

      utterance.onend = () => {
        if (!isActiveRef.current) {
          setVoiceState(VOICE_STATES.IDLE);
          return;
        }
        const nextState = wakeWordModeRef.current ? VOICE_STATES.WAITING_WAKE : VOICE_STATES.LISTENING;
        setVoiceState(nextState);
        // Delay before re-opening microphone to prevent catching room reverberation
        setTimeout(() => {
          if (isActiveRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) {}
          }
        }, 600);
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        if (!isActiveRef.current) {
          setVoiceState(VOICE_STATES.IDLE);
        } else {
          setVoiceState(wakeWordModeRef.current ? VOICE_STATES.WAITING_WAKE : VOICE_STATES.LISTENING);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('TTS error:', err);
      if (!isActiveRef.current) {
        setVoiceState(VOICE_STATES.IDLE);
      } else {
        setVoiceState(wakeWordModeRef.current ? VOICE_STATES.WAITING_WAKE : VOICE_STATES.LISTENING);
      }
    }
  }, [isMuted]);

  // Dispatch recognized command to central planning engine
  const handleProcessCommand = async (rawText) => {
    if (!rawText || !rawText.trim()) return;

    setVoiceState(VOICE_STATES.PROCESSING);
    setLiveTranscript('');

    try {
      const res = await api.sendVoiceInteraction(rawText.trim(), wakeWordMode);

      if (res.wake_word_detected) {
        setLastWakeWord(res.detected_wake_word || 'Hey Planner');
        setShowWakeFlash(true);
        setTimeout(() => setShowWakeFlash(false), 2500);
      }

      // Check if task confirmation is pending
      if (res.action_taken && res.action_taken.action_type === 'task_preview_created') {
        setPendingVoiceTask(res.action_taken.data);
      } else {
        setPendingVoiceTask(null);
      }

      const entry = {
        userSpeech: res.recognized_command || rawText,
        detectedWakeWord: res.detected_wake_word,
        aiResponse: res.response,
        intent: res.intent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setTranscriptsLog(prev => [entry, ...prev]);

      // Speak response aloud
      const spokenText = res.spoken_payload?.text || res.response;
      speakSpokenResponse(spokenText);

    } catch (err) {
      console.error('Voice processing error:', err);
      setErrorMessage(`Planning engine error: ${err.message}`);
      setVoiceState(VOICE_STATES.ERROR);
    }
  };

  // Stop Voice Assistant
  const stopAssistant = useCallback(() => {
    isActiveRef.current = false;
    setIsVoiceActive(false);
    setVoiceState(VOICE_STATES.IDLE);
    setLiveTranscript('');

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      } catch (e) {}
    }
  }, []);

  // Start Voice Assistant with a fresh SpeechRecognition instance
  const startAssistant = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage("Speech Recognition is not supported by your current browser. Please open in Google Chrome, Microsoft Edge, or Brave.");
      return;
    }

    // Abort and clear any prior instance to prevent invalid state
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setErrorMessage(null);
        isActiveRef.current = true;
        setIsVoiceActive(true);
        if (stateRef.current !== VOICE_STATES.SPEAKING && stateRef.current !== VOICE_STATES.PROCESSING) {
          setVoiceState(wakeWordModeRef.current ? VOICE_STATES.WAITING_WAKE : VOICE_STATES.LISTENING);
        }
      };

      recognition.onresult = (event) => {
        if (stateRef.current === VOICE_STATES.SPEAKING || stateRef.current === VOICE_STATES.PROCESSING) {
          return;
        }

        let currentInterim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        const activeText = (finalTranscript || currentInterim).trim();
        setLiveTranscript(activeText);

        const lower = activeText.toLowerCase();
        if (
          lower.includes("hey planner") ||
          lower.includes("hi planner") ||
          lower.includes("okay planner") ||
          lower.startsWith("planner")
        ) {
          if (!showWakeFlash) {
            playWakeChime();
            setShowWakeFlash(true);
            setTimeout(() => setShowWakeFlash(false), 2500);
          }
          setVoiceState(VOICE_STATES.LISTENING);
        }

        if (finalTranscript.trim()) {
          handleProcessCommand(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setErrorMessage("Microphone permission was blocked. Please click the camera/microphone icon in your browser URL bar and allow access.");
          stopAssistant();
        } else if (event.error === 'audio-capture') {
          setErrorMessage("No microphone detected. Please connect a microphone or verify it is not in use by another application.");
          stopAssistant();
        } else if (event.error === 'no-speech') {
          // Normal silence interval
        }
      };

      recognition.onend = () => {
        // If turned off by user, do not restart
        if (!isActiveRef.current) {
          setVoiceState(VOICE_STATES.IDLE);
          return;
        }

        // If speaking or processing, speakSpokenResponse will resume afterwards
        if (stateRef.current === VOICE_STATES.SPEAKING || stateRef.current === VOICE_STATES.PROCESSING) {
          return;
        }

        // Re-arm listening if still active
        try {
          recognition.start();
          setVoiceState(wakeWordModeRef.current ? VOICE_STATES.WAITING_WAKE : VOICE_STATES.LISTENING);
        } catch (e) {
          // If instance is dead, restart cleanly
          setTimeout(() => {
            if (isActiveRef.current) {
              startAssistant();
            }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
      isActiveRef.current = true;
      setIsVoiceActive(true);
      setErrorMessage(null);
      setVoiceState(wakeWordModeRef.current ? VOICE_STATES.WAITING_WAKE : VOICE_STATES.LISTENING);

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setErrorMessage(`Could not start voice assistant: ${err.message}`);
      stopAssistant();
    }
  }, [playWakeChime, stopAssistant]);

  // Toggle button handler
  const toggleVoiceAssistant = () => {
    if (isVoiceActive || voiceState !== VOICE_STATES.IDLE) {
      stopAssistant();
    } else {
      startAssistant();
    }
  };

  const stopAllVoiceActivity = stopAssistant;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAssistant();
    };
  }, [stopAssistant]);

  // Run Voice Diagnostics
  const handleOpenDiagnostics = async () => {
    setShowDiagModal(true);
    setDiagLoading(true);
    try {
      const data = await api.getVoiceDiagnostics();
      setDiagData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDiagLoading(false);
    }
  };

  // Confirm task via voice button shortcut
  const handleConfirmTaskShortcut = () => {
    handleProcessCommand("Confirm and save the task");
  };

  const exampleVoiceCommands = [
    { title: "What should I do first today?", label: "Priority Decision" },
    { title: "Show my pending tasks.", label: "Task Queue" },
    { title: "Which tasks are overdue?", label: "Urgency Scan" },
    { title: "Add a task to study artificial intelligence tomorrow.", label: "AI Task Intake" },
    { title: "Mark my database assignment as completed.", label: "Status Update" },
    { title: "Generate my timetable for tomorrow.", label: "Interval Schedule" },
    { title: "How many tasks have I completed this week?", label: "Weekly Progress" },
    { title: "Reschedule my unfinished tasks.", label: "Adaptive Drift Repair" },
    { title: "Explain why you recommended this task.", label: "Explainable Breakdown" },
    { title: "Show my upcoming deadlines.", label: "Deadline Tracking" }
  ];

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-dark-charcoal flex items-center gap-3">
            AI Voice Assistant
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold/20 text-deep-wine border border-gold/40 font-mono font-bold">
              "Hey Planner"
            </span>
          </h1>
          <p className="text-xs text-muted-brown">
            Multimodal voice assistant with real-time wake phrase detection, intent routing, and local AI synthesis
          </p>
        </div>

        {/* Controls: Wake Word, Diagnostics & Mute */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenDiagnostics}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-soft-ivory hover:bg-warm-beige text-deep-wine border border-burgundy/30 shadow-sm transition-all flex items-center gap-1.5"
            title="Run 9-stage voice diagnostics"
          >
            <Activity size={14} className="text-gold" />
            <span>Voice Diagnostics</span>
          </button>

          <button
            onClick={() => {
              const nextMode = !wakeWordMode;
              setWakeWordMode(nextMode);
              wakeWordModeRef.current = nextMode;
              if (isActiveRef.current) {
                setVoiceState(nextMode ? VOICE_STATES.WAITING_WAKE : VOICE_STATES.LISTENING);
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              wakeWordMode
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                : 'bg-warm-beige text-muted-brown border-soft-border'
            }`}
          >
            <Radio size={14} className={wakeWordMode ? 'text-emerald-600 animate-pulse' : ''} />
            <span>Wake Word: {wakeWordMode ? 'Active' : 'Disabled'}</span>
          </button>

          <button
            onClick={() => {
              setIsMuted(!isMuted);
              if (!isMuted && window.speechSynthesis) {
                window.speechSynthesis.cancel();
              }
            }}
            className={`p-2 rounded-xl border text-xs transition-all ${
              isMuted
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-soft-ivory text-dark-charcoal border-soft-border'
            }`}
            title={isMuted ? "Unmute Spoken AI" : "Mute Spoken AI"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* Wake Word Detection Notification Banner */}
      {showWakeFlash && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-deep-maroon shadow-glossy-gold font-bold text-sm flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-deep-wine" />
            <span>Wake Word Recognized: "Hey Planner"! Listening for your command...</span>
          </div>
          <span className="text-xs uppercase tracking-wider font-mono bg-deep-maroon/15 px-2 py-0.5 rounded-md">
            Wake Phrase Verified
          </span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-700" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 text-red-700 hover:text-red-900"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Voice Interaction Console */}
      <div className="card-luxury p-8 rounded-3xl text-center space-y-6 relative overflow-hidden">
        {/* State Status Banner */}
        <div className="flex items-center justify-center gap-2">
          <span
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              voiceState === VOICE_STATES.SPEAKING
                ? 'bg-gold animate-ping'
                : voiceState === VOICE_STATES.PROCESSING
                ? 'bg-burgundy animate-pulse'
                : voiceState === VOICE_STATES.LISTENING
                ? 'bg-emerald-600 animate-ping'
                : voiceState === VOICE_STATES.WAITING_WAKE
                ? 'bg-gold-dark animate-pulse'
                : 'bg-muted-brown/40'
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-brown">
            {voiceState === VOICE_STATES.SPEAKING
              ? 'Spoken AI Voice Synthesizing Response...'
              : voiceState === VOICE_STATES.PROCESSING
              ? 'Central Planning Engine Reasoning...'
              : voiceState === VOICE_STATES.LISTENING
              ? 'Listening for speech...'
              : voiceState === VOICE_STATES.WAITING_WAKE
              ? 'Standby: Listening for "Hey Planner"...'
              : 'Microphone Standby'}
          </span>
        </div>

        {/* Animated Waveform Visualizer */}
        <AudioWaveform
          isActive={voiceState === VOICE_STATES.LISTENING || voiceState === VOICE_STATES.WAITING_WAKE}
          isSpeaking={voiceState === VOICE_STATES.SPEAKING}
        />

        {/* Live Speech Feedback Display */}
        <div className="min-h-14 flex items-center justify-center px-4">
          <p className="text-base text-dark-charcoal italic max-w-xl mx-auto font-serif">
            {liveTranscript
              ? `"${liveTranscript}"`
              : voiceState === VOICE_STATES.WAITING_WAKE
              ? 'Say "Hey Planner" or click the microphone to speak...'
              : voiceState === VOICE_STATES.LISTENING
              ? 'I am listening. Ask a question or give a command...'
              : voiceState === VOICE_STATES.PROCESSING
              ? 'Consulting SQLite database and priority models...'
              : voiceState === VOICE_STATES.SPEAKING
              ? 'Speaking response...'
              : 'Click the burgundy microphone to begin.'}
          </p>
        </div>

        {/* Central Glossy Microphone Button & Explicit Power Switch */}
        <div className="flex flex-col items-center justify-center gap-3 pt-2">
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={toggleVoiceAssistant}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-luxury-lg relative group ${
                isVoiceActive
                  ? 'bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white ring-8 ring-emerald-100 scale-105'
                  : 'bg-gradient-to-tr from-burgundy to-deep-wine text-gold-light ring-8 ring-burgundy/10 hover:scale-105'
              }`}
              title={isVoiceActive ? "Click to Turn Off Voice Assistant" : "Click to Turn On Voice Assistant"}
            >
              {/* Top specular reflection */}
              <span className="absolute top-1 inset-x-4 h-1/2 rounded-t-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
              {isVoiceActive ? (
                <Mic size={38} className="animate-pulse" />
              ) : (
                <MicOff size={36} className="text-gold-light/90" />
              )}
            </button>

            {isVoiceActive && (
              <button
                onClick={stopAllVoiceActivity}
                className="p-3 rounded-2xl bg-warm-beige hover:bg-soft-border text-red-800 border border-soft-border transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                title="Turn off speech and listening"
              >
                <Square size={14} className="fill-red-800" />
                <span>Turn Off</span>
              </button>
            )}
          </div>

          {/* Explicit Status & Toggle Badge */}
          <button
            onClick={toggleVoiceAssistant}
            className={`text-xs px-3.5 py-1.5 rounded-full font-semibold border transition-all flex items-center gap-1.5 ${
              isVoiceActive
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-warm-beige border-soft-border text-muted-brown hover:bg-soft-border'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-emerald-600 animate-pulse' : 'bg-muted-brown/50'}`} />
            <span>{isVoiceActive ? 'Voice Assistant is ON (Click to Turn Off)' : 'Voice Assistant is OFF (Click to Turn On)'}</span>
          </button>
        </div>

        {/* Pending Task Confirmation Banner (for Voice Intake) */}
        {pendingVoiceTask && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-left space-y-2 animate-fade-in max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-700" />
                Confirmation Required
              </span>
              <span className="text-[10px] text-muted-brown">Voice Command Extracted</span>
            </div>
            <p className="text-xs text-dark-charcoal">
              Say <strong>"Confirm and save"</strong> or click below to save this task to your database:
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setPendingVoiceTask(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-brown hover:text-dark-charcoal"
              >
                Dismiss
              </button>
              <button
                onClick={handleConfirmTaskShortcut}
                className="px-4 py-1.5 rounded-lg text-xs font-bold btn-burgundy flex items-center gap-1"
              >
                <Check size={13} />
                <span>Confirm & Save Task</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suggested 10 Core Capstone Voice Commands */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm font-bold text-deep-wine uppercase tracking-wider flex items-center gap-1.5">
            <Flame size={15} className="text-gold" />
            <span>10 Verified Voice Commands</span>
          </h3>
          <span className="text-[11px] text-muted-brown">Click any command to test speech pipeline</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {exampleVoiceCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleProcessCommand(cmd.title)}
              className="p-3 rounded-2xl bg-soft-ivory hover:bg-warm-beige border border-soft-border/80 text-left text-xs text-dark-charcoal hover:border-burgundy/40 transition-all shadow-sm flex items-center justify-between group"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-burgundy uppercase tracking-wider block">
                  {cmd.label}
                </span>
                <span className="font-medium">"{cmd.title}"</span>
              </div>
              <Mic size={14} className="text-muted-brown group-hover:text-deep-wine opacity-60 group-hover:opacity-100 shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </div>

      {/* Voice Transcripts History */}
      <div className="card-luxury p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-soft-border/70">
          <h3 className="font-serif text-lg font-bold text-deep-wine">Voice Interaction Transcript</h3>
          <span className="text-xs text-muted-brown font-mono">
            {transcriptsLog.length} Exchange(s)
          </span>
        </div>

        {transcriptsLog.length === 0 ? (
          <p className="text-xs text-muted-brown py-6 text-center">
            No voice interactions recorded this session. Try saying "Hey Planner, what should I do first today?"
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {transcriptsLog.map((log, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/60 border border-soft-border/70 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-muted-brown text-[11px]">
                  <span className="font-semibold text-deep-wine flex items-center gap-1.5">
                    <Mic size={12} />
                    You Spoke:
                  </span>
                  <span>{log.timestamp}</span>
                </div>
                <p className="font-medium text-dark-charcoal">"{log.userSpeech}"</p>

                <div className="pt-2 border-t border-soft-border/40 text-muted-brown text-[11px] flex items-center justify-between">
                  <span className="font-semibold text-burgundy flex items-center gap-1.5">
                    <Bot size={13} />
                    Spoken AI Response:
                  </span>
                  <span className="text-[10px] bg-warm-beige px-2 py-0.5 rounded-full font-mono">
                    Intent: {log.intent}
                  </span>
                </div>
                <p className="text-dark-charcoal leading-relaxed whitespace-pre-line bg-warm-beige/30 p-3 rounded-xl border border-soft-border/50">
                  {log.aiResponse}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 9-Stage Voice Diagnostics Modal */}
      {showDiagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-soft-ivory border border-soft-border rounded-3xl shadow-luxury-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-deep-maroon to-burgundy text-soft-ivory flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GlossyIcon icon={Activity} variant="gold" size={20} containerSize="w-10 h-10" />
                <div>
                  <h3 className="font-serif text-lg font-bold">Voice Assistant Diagnostics</h3>
                  <p className="text-xs text-gold-light/80">
                    Comprehensive 9-Point Verification of the Multimodal Audio Pipeline
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDiagModal(false)}
                className="p-1 rounded-full text-soft-ivory/80 hover:text-soft-ivory hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {diagLoading ? (
                <div className="py-12 text-center text-xs text-muted-brown space-y-2">
                  <Sparkles size={20} className="animate-spin mx-auto text-deep-wine" />
                  <p>Running diagnostic probes across audio drivers, SQLite, STT, and decision engines...</p>
                </div>
              ) : diagData ? (
                <>
                  {/* Summary Bar */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-warm-beige/50 border border-soft-border text-xs">
                    <div>
                      <span className="font-bold text-dark-charcoal block">
                        System Health Status: {diagData.overall_status}
                      </span>
                      <span className="text-muted-brown text-[11px]">
                        {diagData.passed} Passed, {diagData.warnings} Warnings, {diagData.failures} Failures
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider ${
                        diagData.overall_status === 'HEALTHY'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {diagData.overall_status}
                    </span>
                  </div>

                  {/* 9 Checklist Items */}
                  <div className="space-y-2.5">
                    {diagData.diagnostics?.map((item, idx) => {
                      const isPass = item.status === 'PASS';
                      const isWarn = item.status === 'WARNING';
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-white/70 border border-soft-border flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-dark-charcoal">{item.name}</span>
                              <span className="text-[10px] text-muted-brown bg-warm-beige px-2 py-0.2 rounded font-mono">
                                {item.category}
                              </span>
                            </div>
                            <p className="text-muted-brown text-[11px] leading-relaxed">{item.details}</p>
                          </div>

                          <div className="shrink-0 pt-0.5">
                            {isPass ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 size={12} />
                                PASS
                              </span>
                            ) : isWarn ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertCircle size={12} />
                                WARNING
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                                <XCircle size={12} />
                                FAIL
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-warm-beige/40 border-t border-soft-border flex justify-end">
              <button
                onClick={() => setShowDiagModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold btn-burgundy"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
