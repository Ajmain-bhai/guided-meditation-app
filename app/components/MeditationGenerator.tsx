"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Script from "next/script";

// Declare puter global type
declare global {
  interface Window {
    puter: any;
  }
}

const TTS_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    voices: [
      { id: 'nova', name: 'Nova', description: 'Warm & calm' },
      { id: 'shimmer', name: 'Shimmer', description: 'Soft & gentle' },
      { id: 'alloy', name: 'Alloy', description: 'Neutral' },
      { id: 'echo', name: 'Echo', description: 'Clear' },
      { id: 'fable', name: 'Fable', description: 'Expressive' },
      { id: 'onyx', name: 'Onyx', description: 'Deep' },
    ],
    models: [
      { id: 'tts-1', name: 'Standard' },
      { id: 'tts-1-hd', name: 'HD Quality' },
    ]
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    voices: [
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm female' },
      { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Calm male' },
    ],
    models: [
      { id: 'eleven_multilingual_v2', name: 'Multilingual V2' },
    ]
  },
];

export default function MeditationGenerator() {
  const [goal, setGoal] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [puterReady, setPuterReady] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Puter.js settings
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [selectedModel, setSelectedModel] = useState('tts-1');
  const [showSettings, setShowSettings] = useState(false);

  const currentProvider = TTS_PROVIDERS.find(p => p.id === selectedProvider);
  const currentAudioRef = { current: null as HTMLAudioElement | null };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!puterReady || !window.puter) {
      setError("Puter.js is still loading. Please wait a moment.");
      return;
    }

    setError("");
    setScript("");
    setLoading(true);
    setIsPlaying(false);
    setIsPaused(false);
    
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

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

  const handlePlay = async () => {
    if (!script || !puterReady || !window.puter) return;

    try {
      setIsPlaying(true);
      setIsPaused(false);

      // Convert to speech using Puter.js
      const audio = await window.puter.ai.txt2speech(script, {
        provider: selectedProvider,
        voice: selectedVoice,
        model: selectedModel,
      });

      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };
      
      audio.onpause = () => {
        setIsPaused(true);
      };
      
      audio.onplay = () => {
        setIsPaused(false);
      };
      
      // Auto-play
      audio.play();

    } catch (err) {
      console.error('TTS Error:', err);
      setError('Failed to generate audio. Please try again.');
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handlePauseResume = () => {
    if (!currentAudioRef.current) return;

    if (isPaused) {
      currentAudioRef.current.play();
      setIsPaused(false);
    } else {
      currentAudioRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
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

  const card = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -24 },
  };

  return (
    <>
      {/* Load Puter.js */}
      <Script 
        src="https://js.puter.com/v2/" 
        onLoad={() => setPuterReady(true)}
      />

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
                  disabled={loading || !puterReady}
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
                    {/* Provider Selection */}
                    <div>
                      <label className="text-xs text-black/70 block mb-1">Provider</label>
                      <div className="grid grid-cols-2 gap-2">
                        {TTS_PROVIDERS.map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => {
                              setSelectedProvider(provider.id);
                              setSelectedVoice(provider.voices[0].id);
                              setSelectedModel(provider.models[0].id);
                            }}
                            className={`p-2 rounded-lg text-sm transition ${
                              selectedProvider === provider.id
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/60 text-black hover:bg-white/80'
                            }`}
                          >
                            {provider.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voice Selection */}
                    {currentProvider && (
                      <div>
                        <label className="text-xs text-black/70 block mb-1">Voice</label>
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full rounded-lg bg-white/60 p-2 text-sm text-black outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          {currentProvider.voices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name} - {voice.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Model Selection (OpenAI only) */}
                    {selectedProvider === 'openai' && currentProvider && (
                      <div>
                        <label className="text-xs text-black/70 block mb-1">Quality</label>
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-full rounded-lg bg-white/60 p-2 text-sm text-black outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          {currentProvider.models.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </motion.div>
                )}

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                {!puterReady && (
                  <p className="text-xs text-black/60 text-center">Loading voice engine...</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !goal.trim() || !puterReady}
                  className="w-full rounded-xl bg-purple-600 text-white py-3 font-medium hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {!puterReady ? "Loading..." : loading ? "Generating…" : "Generate Visualization"}
                </button>
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

              <p className="text-xs text-center text-black/60 mt-4">
                🎙️ Using {selectedProvider === 'openai' ? 'OpenAI' : 'ElevenLabs'} • {currentProvider?.voices.find(v => v.id === selectedVoice)?.name} voice
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
