"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MeditationGenerator() {
  const [goal, setGoal] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Browser TTS settings
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speed, setSpeed] = useState(0.8);
  const [pitch, setPitch] = useState(0.9);
  const [showSettings, setShowSettings] = useState(false);

  const utteranceRef = { current: null as SpeechSynthesisUtterance | null };

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Find best default voice for meditation
      const preferredVoice = 
        voices.find(v => v.name.toLowerCase().includes('samantha')) || // macOS
        voices.find(v => v.name.toLowerCase().includes('zira')) || // Windows
        voices.find(v => v.name.toLowerCase().includes('female') && v.lang.startsWith('en')) ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices[0];
      
      setSelectedVoice(preferredVoice);
    };

    loadVoices();
    
    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setScript("");
    setLoading(true);
    setIsPlaying(false);
    setIsPaused(false);
    window.speechSynthesis.cancel();

    try {
      // Generate meditation script
      const generatedScript = generateMeditationScript(goal);
      
      // Set script with Android-safe render commit
      setScript(generatedScript);
      
      requestAnimationFrame(() => {
        setLoading(false);
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (!script) return;

    // Android-safe lazy init
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(script);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = speed;
    utterance.pitch = pitch;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      setError('Playback failed. Please try again.');
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const resetAll = () => {
    handleStop();
    setGoal("");
    setScript("");
    setError("");
  };

  const generateMeditationScript = (goal: string): string => {
    const cleanGoal = goal.toLowerCase().trim();
    
    return `
Welcome to this guided meditation for ${goal}.

Find a comfortable position, either sitting or lying down. Gently close your eyes, or soften your gaze downward.

Take a deep breath in through your nose... and slowly release it through your mouth.

Let's begin by bringing awareness to your body. Notice any tension you might be holding. With each exhale, imagine that tension melting away.

${getGoalSpecificContent(cleanGoal)}

Take another deep breath in... and as you exhale, feel yourself becoming more and more relaxed.

Continue to breathe naturally, allowing each breath to deepen your sense of peace and calm.

${getGoalSpecificAffirmation(cleanGoal)}

When you're ready, begin to deepen your breath. Gently wiggle your fingers and toes.

Take your time returning to the present moment, carrying this sense of ${goal} with you throughout your day.

Namaste.
    `.trim();
  };

  const getGoalSpecificContent = (goal: string): string => {
    if (goal.includes('stress') || goal.includes('anxiety') || goal.includes('calm')) {
      return `
Notice the rhythm of your breath. With each inhale, breathe in peace and calm. With each exhale, release any stress or worry.

Imagine a wave of relaxation starting at the top of your head, slowly flowing down through your body. Feel your shoulders drop, your jaw soften, your entire being release.

You are safe. You are supported. In this moment, there is nothing you need to do, nowhere you need to be.
      `.trim();
    }
    
    if (goal.includes('sleep') || goal.includes('rest')) {
      return `
Feel the weight of your body sinking into the surface beneath you. With each breath, you become heavier, more relaxed.

Notice how your body knows exactly how to prepare for rest. Your breathing naturally slows. Your thoughts begin to quiet.

Imagine yourself in a peaceful place. Perhaps a quiet beach, a serene forest, or a cozy bedroom. Feel the comfort and safety of this space.
      `.trim();
    }
    
    if (goal.includes('confidence') || goal.includes('self-esteem')) {
      return `
Bring to mind a moment when you felt truly capable and strong. Remember that feeling. Let it fill your body.

You are worthy exactly as you are. Your value doesn't depend on what you do or achieve. It simply is.

Visualize yourself moving through your day with ease and confidence. See yourself handling challenges with grace. This capable, confident person is you.
      `.trim();
    }
    
    if (goal.includes('focus') || goal.includes('clarity')) {
      return `
Bring your attention to a single point, perhaps the sensation of your breath at your nostrils.

When your mind wanders, and it will, gently guide it back without judgment. Each time you return your focus, you strengthen your concentration.

Imagine your mind as a clear, still lake. Thoughts may ripple the surface, but beneath remains calm and focused.
      `.trim();
    }
    
    return `
With each breath, connect more deeply with your intention for ${goal}. Feel it not just as a wish, but as an already-present reality within you.

Scan through your body from head to toe. As you do, release any tension or resistance. Simply allow yourself to be exactly as you are in this moment.

You have everything you need within you. Trust in your own inner wisdom and strength.
    `.trim();
  };

  const getGoalSpecificAffirmation = (goal: string): string => {
    if (goal.includes('stress') || goal.includes('anxiety')) {
      return 'I am calm and at peace. I trust in my ability to handle whatever comes my way.';
    }
    if (goal.includes('sleep')) {
      return 'I release the day and welcome restful, rejuvenating sleep.';
    }
    if (goal.includes('confidence')) {
      return 'I am confident, capable, and worthy of all good things.';
    }
    if (goal.includes('focus') || goal.includes('clarity')) {
      return 'I am focused and present. My mind is clear and alert.';
    }
    return `I am aligned with my intention for ${goal}.`;
  };

  // Get friendly voice names
  const getFriendlyVoiceName = (voice: SpeechSynthesisVoice): string => {
    if (voice.name.includes('Samantha')) return '🌟 Samantha (Premium)';
    if (voice.name.includes('Zira')) return '🌟 Zira (Recommended)';
    if (voice.name.toLowerCase().includes('female')) return `👤 ${voice.name}`;
    return voice.name;
  };

  const card = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -24 },
  };

  return (
    <div className="max-w-xl mx-auto px-4">
      <AnimatePresence mode="wait">
        {!script ? (
          <motion.div
            key="input"
            variants={card}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.35 }}
            className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-xl"
          >
            <h1 className="text-2xl font-semibold text-center mb-2">
              Guided Visualization
            </h1>

            <p className="text-sm text-center text-black mb-6">
              Describe a goal, vision, or future self
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. calm confidence, success, clarity..."
                disabled={loading}
                className="w-full h-32 rounded-xl bg-white/60 p-4 outline-none resize-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 text-black"
              />

              {/* Voice Settings Toggle */}
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="w-full text-sm text-black/70 hover:text-black transition flex items-center justify-center gap-2"
              >
                <span>🎙️ Voice Settings</span>
                <span>{showSettings ? '▼' : '▶'}</span>
              </button>

              {/* Voice Settings Panel */}
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 pt-2"
                >
                  {/* Voice Selection */}
                  <div>
                    <label className="text-xs text-black/70 block mb-1">Voice</label>
                    <select
                      value={selectedVoice?.name || ''}
                      onChange={(e) => {
                        const voice = availableVoices.find(v => v.name === e.target.value);
                        setSelectedVoice(voice || null);
                      }}
                      className="w-full rounded-lg bg-white/60 p-2 text-sm text-black outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      {availableVoices
                        .filter(v => v.lang.startsWith('en'))
                        .map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {getFriendlyVoiceName(voice)}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Speed Control */}
                  <div>
                    <label className="text-xs text-black/70 block mb-1">
                      Speed: {speed.toFixed(1)}x (slower is calmer)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Pitch Control */}
                  <div>
                    <label className="text-xs text-black/70 block mb-1">
                      Pitch: {pitch.toFixed(1)} (lower is soothing)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={pitch}
                      onChange={(e) => setPitch(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </motion.div>
              )}

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !goal.trim()}
                className="w-full rounded-xl bg-purple-600 text-white py-3 font-medium hover:bg-purple-700 transition disabled:opacity-50"
              >
                {loading ? "Generating…" : "Generate Visualization"}
              </button>

              <p className="text-xs text-center text-black/60">
                ✨ 100% Free • No Signup • Works Offline
              </p>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="playback"
            variants={card}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.35 }}
            className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-xl"
          >
            <h2 className="text-xl font-semibold text-center mb-4">
              Your Visualization
            </h2>

            <div className="max-h-64 overflow-y-auto rounded-xl bg-white/60 p-4 text-sm leading-relaxed mb-6 whitespace-pre-wrap text-black">
              {script}
            </div>

            <div className="space-y-3">
              {!isPlaying && (
                <button
                  onClick={handlePlay}
                  className="w-full py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition"
                >
                  Play Visualization
                </button>
              )}

              {isPlaying && (
                <div className="flex gap-3">
                  <button
                    onClick={handlePauseResume}
                    className="flex-1 py-3 rounded-xl bg-yellow-500 text-white font-medium"
                  >
                    {isPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={handleStop}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium"
                  >
                    Stop
                  </button>
                </div>
              )}

              <button
                onClick={resetAll}
                className="w-full py-3 rounded-xl border border-gray-400 text-black font-medium"
              >
                Create New Visualization
              </button>
            </div>

            {selectedVoice && (
              <p className="text-xs text-center text-black/60 mt-4">
                🎙️ Using {selectedVoice.name} • {speed}x speed • Browser TTS
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
