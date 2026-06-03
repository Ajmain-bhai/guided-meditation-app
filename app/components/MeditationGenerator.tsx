"use client";
 
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
 
// ── Preset chips ─────────────────────────────────────────────────────────────
const PRESETS = [
  { label: "Morning Focus", icon: "✦" },
  { label: "Deep Sleep",    icon: "◑" },
  { label: "Confidence",    icon: "✧" },
];
 
// ── Animated breathing orb ───────────────────────────────────────────────────
function BreathingOrb({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 my-6">
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* outer glow rings */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)" }}
          animate={{ scale: isPlaying ? [1, 1.45, 1] : [1, 1.18, 1] }}
          transition={{ duration: isPlaying ? 2.2 : 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)" }}
          animate={{ scale: isPlaying ? [1, 1.3, 1] : [1, 1.12, 1] }}
          transition={{ duration: isPlaying ? 2.2 : 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        {/* core orb */}
        <motion.div
          className="w-14 h-14 rounded-full"
          style={{
            background: "radial-gradient(circle at 38% 35%, #a78bfa, #6d28d9 60%, #3b0764)",
            boxShadow: "0 0 32px 6px rgba(109,40,217,0.55), 0 0 8px 2px rgba(167,139,250,0.3)",
          }}
          animate={{ scale: isPlaying ? [1, 1.15, 1] : [1, 1.08, 1] }}
          transition={{ duration: isPlaying ? 2.2 : 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <span
        className="text-[10px] tracking-[0.3em] uppercase"
        style={{ color: "rgba(167,139,250,0.6)" }}
      >
        {isPlaying ? "playing" : "breathe"}
      </span>
    </div>
  );
}
 
// ── Waveform bars (shown during playback) ────────────────────────────────────
function Waveform({ active }: { active: boolean }) {
  const bars = [4, 7, 5, 9, 6, 11, 7, 5, 8, 6, 4, 9, 7];
  return (
    <div className="flex items-end justify-center gap-[3px] h-8 my-4">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: "rgba(167,139,250,0.7)" }}
          animate={active ? { scaleY: [0.3, 1, 0.3] } : { scaleY: 0.3 }}
          transition={{
            duration: 0.9 + i * 0.05,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.07,
          }}
          initial={{ scaleY: 0.3, height: h * 2 }}
        />
      ))}
    </div>
  );
}
 
// ── Main component ────────────────────────────────────────────────────────────
export default function MeditationGenerator() {
  const [goal, setGoal]           = useState("");
  const [script, setScript]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused]   = useState(false);
 
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice]     = useState<SpeechSynthesisVoice | null>(null);
  const [speed, setSpeed]   = useState(0.8);
  const [pitch, setPitch]   = useState(0.9);
  const [showSettings, setShowSettings] = useState(false);
 
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
 
  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      const preferred =
        voices.find(v => v.name.toLowerCase().includes("samantha")) ||
        voices.find(v => v.name.toLowerCase().includes("zira")) ||
        voices.find(v => v.name.toLowerCase().includes("female") && v.lang.startsWith("en")) ||
        voices.find(v => v.lang.startsWith("en-US")) ||
        voices[0];
      setSelectedVoice(preferred ?? null);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined)
      window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);
 
  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);
 
  // ── Logic (unchanged) ───────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setScript(""); setLoading(true);
    setIsPlaying(false); setIsPaused(false);
    window.speechSynthesis.cancel();
    try {
      const generatedScript = generateMeditationScript(goal);
      setScript(generatedScript);
      requestAnimationFrame(() => setLoading(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };
 
  const handlePlay = () => {
    if (!script) return;
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate   = speed;
    utterance.pitch  = pitch;
    utterance.volume = 1.0;
    utterance.onstart = () => { setIsPlaying(true);  setIsPaused(false); };
    utterance.onend   = () => { setIsPlaying(false); setIsPaused(false); };
    utterance.onerror = () => { setError("Playback failed. Please try again."); setIsPlaying(false); setIsPaused(false); };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };
 
  const handlePauseResume = () => {
    if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); }
    else          { window.speechSynthesis.pause();  setIsPaused(true);  }
  };
 
  const handleStop = () => { window.speechSynthesis.cancel(); setIsPlaying(false); setIsPaused(false); };
  const resetAll   = () => { handleStop(); setGoal(""); setScript(""); setError(""); };
 
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
    if (goal.includes("stress") || goal.includes("anxiety") || goal.includes("calm"))
      return `Notice the rhythm of your breath. With each inhale, breathe in peace and calm. With each exhale, release any stress or worry.\n\nImagine a wave of relaxation starting at the top of your head, slowly flowing down through your body. Feel your shoulders drop, your jaw soften, your entire being release.\n\nYou are safe. You are supported. In this moment, there is nothing you need to do, nowhere you need to be.`;
    if (goal.includes("sleep") || goal.includes("rest"))
      return `Feel the weight of your body sinking into the surface beneath you. With each breath, you become heavier, more relaxed.\n\nNotice how your body knows exactly how to prepare for rest. Your breathing naturally slows. Your thoughts begin to quiet.\n\nImagine yourself in a peaceful place. Perhaps a quiet beach, a serene forest, or a cozy bedroom. Feel the comfort and safety of this space.`;
    if (goal.includes("confidence") || goal.includes("self-esteem"))
      return `Bring to mind a moment when you felt truly capable and strong. Remember that feeling. Let it fill your body.\n\nYou are worthy exactly as you are. Your value doesn't depend on what you do or achieve. It simply is.\n\nVisualize yourself moving through your day with ease and confidence. See yourself handling challenges with grace. This capable, confident person is you.`;
    if (goal.includes("focus") || goal.includes("clarity"))
      return `Bring your attention to a single point, perhaps the sensation of your breath at your nostrils.\n\nWhen your mind wanders, and it will, gently guide it back without judgment. Each time you return your focus, you strengthen your concentration.\n\nImagine your mind as a clear, still lake. Thoughts may ripple the surface, but beneath remains calm and focused.`;
    return `With each breath, connect more deeply with your intention for ${goal}. Feel it not just as a wish, but as an already-present reality within you.\n\nScan through your body from head to toe. As you do, release any tension or resistance. Simply allow yourself to be exactly as you are in this moment.\n\nYou have everything you need within you. Trust in your own inner wisdom and strength.`;
  };
 
  const getGoalSpecificAffirmation = (goal: string): string => {
    if (goal.includes("stress") || goal.includes("anxiety")) return "I am calm and at peace. I trust in my ability to handle whatever comes my way.";
    if (goal.includes("sleep"))      return "I release the day and welcome restful, rejuvenating sleep.";
    if (goal.includes("confidence")) return "I am confident, capable, and worthy of all good things.";
    if (goal.includes("focus") || goal.includes("clarity")) return "I am focused and present. My mind is clear and alert.";
    return `I am aligned with my intention for ${goal}.`;
  };
 
  const getFriendlyVoiceName = (voice: SpeechSynthesisVoice): string => {
    if (voice.name.includes("Samantha")) return "✦ Samantha (Premium)";
    if (voice.name.includes("Zira"))     return "✦ Zira (Recommended)";
    if (voice.name.toLowerCase().includes("female")) return voice.name;
    return voice.name;
  };
 
  // ── Animation variants ──────────────────────────────────────────────────────
  const card = {
    hidden:  { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0  },
    exit:    { opacity: 0, y: -28 },
  };
 
  // ── Shared card style ───────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: "rgba(15,10,30,0.72)",
    border: "1px solid rgba(139,92,246,0.18)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
  };
 
  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(88,28,220,0.18) 0%, #07050f 60%)",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      {/* Brand pill */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full"
        style={{ background: "rgba(109,40,217,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}
      >
        <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
        <span className="text-[11px] tracking-widest uppercase text-violet-300">
          Guided Visualization
        </span>
      </motion.div>
 
      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1 }}
        className="text-center mb-2"
      >
        <h1 className="text-4xl sm:text-5xl font-light text-white leading-tight">
          What do you want to
        </h1>
        <h1
          className="text-4xl sm:text-5xl font-light italic leading-tight"
          style={{ color: "#a78bfa" }}
        >
          visualize?
        </h1>
      </motion.div>
 
      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="w-10 h-px my-5"
        style={{ background: "rgba(139,92,246,0.4)" }}
      />
 
      {/* Main card */}
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
 
          {/* ── INPUT STATE ─────────────────────────────────────────────────── */}
          {!script ? (
            <motion.div
              key="input"
              variants={card}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.35 }}
              className="rounded-3xl p-6 sm:p-8"
              style={cardStyle}
            >
              {/* Breathing orb */}
              <BreathingOrb isPlaying={false} />
 
              {/* Preset chips */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {PRESETS.map(({ label, icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setGoal(label)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm transition-all duration-200"
                    style={{
                      background: goal === label ? "rgba(109,40,217,0.45)" : "rgba(255,255,255,0.05)",
                      border: goal === label ? "1px solid rgba(167,139,250,0.6)" : "1px solid rgba(255,255,255,0.1)",
                      color: goal === label ? "#c4b5fd" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
 
              <form onSubmit={handleGenerate} className="space-y-4">
                {/* Textarea */}
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Describe your goal, intention, or what you'd like to visualize..."
                  disabled={loading}
                  rows={3}
                  className="w-full rounded-2xl p-4 text-sm resize-none outline-none transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(139,92,246,0.25)",
                    color: "rgba(255,255,255,0.85)",
                    caretColor: "#a78bfa",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.55)")}
                  onBlur={e  => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)")}
                />
 
                {/* Voice settings toggle */}
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full flex items-center justify-center gap-2 text-xs transition-colors duration-150"
                  style={{ color: "rgba(167,139,250,0.65)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                  </svg>
                  Voice Settings
                  <span style={{ fontSize: 9, opacity: 0.7 }}>{showSettings ? "▲" : "▼"}</span>
                </button>
 
                {/* Voice settings panel */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-4 pt-1"
                    >
                      <div>
                        <label className="block text-[11px] mb-1.5" style={{ color: "rgba(167,139,250,0.6)" }}>
                          Voice
                        </label>
                        <select
                          value={selectedVoice?.name || ""}
                          onChange={e => {
                            const v = availableVoices.find(v => v.name === e.target.value);
                            setSelectedVoice(v || null);
                          }}
                          className="w-full rounded-xl p-2.5 text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.25)", color: "rgba(255,255,255,0.8)" }}
                        >
                          {availableVoices.filter(v => v.lang.startsWith("en")).map(v => (
                            <option key={v.name} value={v.name} style={{ background: "#0f0a1e" }}>
                              {getFriendlyVoiceName(v)}
                            </option>
                          ))}
                        </select>
                      </div>
 
                      <div>
                        <label className="block text-[11px] mb-1.5" style={{ color: "rgba(167,139,250,0.6)" }}>
                          Speed: {speed.toFixed(1)}×
                        </label>
                        <input type="range" min="0.5" max="1.0" step="0.1" value={speed}
                          onChange={e => setSpeed(parseFloat(e.target.value))}
                          className="w-full accent-violet-500" />
                      </div>
 
                      <div>
                        <label className="block text-[11px] mb-1.5" style={{ color: "rgba(167,139,250,0.6)" }}>
                          Pitch: {pitch.toFixed(1)}
                        </label>
                        <input type="range" min="0.5" max="1.5" step="0.1" value={pitch}
                          onChange={e => setPitch(parseFloat(e.target.value))}
                          className="w-full accent-violet-500" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
 
                {error && (
                  <p className="text-xs text-red-400 text-center">{error}</p>
                )}
 
                {/* Generate button */}
                <motion.button
                  type="submit"
                  disabled={loading || !goal.trim()}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-2xl text-sm font-medium tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #6d28d9, #4c1d95)",
                    color: "#ede9fe",
                    boxShadow: "0 0 24px rgba(109,40,217,0.4)",
                    border: "1px solid rgba(167,139,250,0.25)",
                  }}
                >
                  {loading ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="inline-block w-4 h-4 border-2 border-violet-300 border-t-transparent rounded-full"
                      />
                      Generating…
                    </>
                  ) : (
                    <>✦ Generate Visualization</>
                  )}
                </motion.button>
 
                <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                  ✨ 100% Free · No Signup · Works Offline
                </p>
              </form>
            </motion.div>
 
          ) : (
 
            /* ── PLAYBACK STATE ───────────────────────────────────────────── */
            <motion.div
              key="playback"
              variants={card}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.35 }}
              className="rounded-3xl p-6 sm:p-8"
              style={cardStyle}
            >
              {/* Orb + waveform */}
              <BreathingOrb isPlaying={isPlaying && !isPaused} />
              <Waveform active={isPlaying && !isPaused} />
 
              <h2 className="text-lg font-light text-center text-white mb-4 tracking-wide">
                Your Visualization
              </h2>
 
              {/* Script scroll area */}
              <div
                className="max-h-52 overflow-y-auto rounded-2xl p-4 text-sm leading-relaxed mb-6 whitespace-pre-wrap"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(139,92,246,0.18)",
                  color: "rgba(255,255,255,0.7)",
                  scrollbarWidth: "thin",
                }}
              >
                {script}
              </div>
 
              {/* Playback controls */}
              <div className="space-y-3">
                {!isPlaying && (
                  <motion.button
                    onClick={handlePlay}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #6d28d9, #4c1d95)",
                      color: "#ede9fe",
                      boxShadow: "0 0 20px rgba(109,40,217,0.4)",
                      border: "1px solid rgba(167,139,250,0.25)",
                    }}
                  >
                    ▶ Play Visualization
                  </motion.button>
                )}
 
                {isPlaying && (
                  <div className="flex gap-3">
                    <motion.button
                      onClick={handlePauseResume}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 py-3.5 rounded-2xl text-sm font-medium"
                      style={{
                        background: "rgba(245,158,11,0.15)",
                        border: "1px solid rgba(245,158,11,0.35)",
                        color: "#fcd34d",
                      }}
                    >
                      {isPaused ? "▶ Resume" : "⏸ Pause"}
                    </motion.button>
                    <motion.button
                      onClick={handleStop}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 py-3.5 rounded-2xl text-sm font-medium"
                      style={{
                        background: "rgba(220,38,38,0.12)",
                        border: "1px solid rgba(220,38,38,0.3)",
                        color: "#fca5a5",
                      }}
                    >
                      ■ Stop
                    </motion.button>
                  </div>
                )}
 
                <motion.button
                  onClick={resetAll}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-2xl text-sm font-medium"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  ↩ Create New Visualization
                </motion.button>
              </div>
 
              {selectedVoice && (
                <p className="text-center text-[11px] mt-5" style={{ color: "rgba(167,139,250,0.45)" }}>
                  🎙 {selectedVoice.name} · {speed}× speed · Browser TTS
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}