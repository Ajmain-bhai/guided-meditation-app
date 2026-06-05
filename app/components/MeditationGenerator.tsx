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

// ── Waveform bars ────────────────────────────────────────────────────────────
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
  const [ttsMode, setTtsMode]     = useState<"polly" | "browser">("polly");

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice]     = useState<SpeechSynthesisVoice | null>(null);
  const [speed, setSpeed] = useState(0.8);
  const [pitch, setPitch] = useState(0.9);
  const [showSettings, setShowSettings] = useState(false);

  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  useEffect(() => () => {
    window.speechSynthesis.cancel();
    audioRef.current?.pause();
  }, []);

  // ── Generate via Groq API ────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setScript(""); setLoading(true);
    setIsPlaying(false); setIsPaused(false);
    window.speechSynthesis.cancel();
    audioRef.current?.pause();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to generate script");
      setScript(data.script);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── AWS Polly playback ───────────────────────────────────────────────────
  const handlePlayPolly = async () => {
  if (!script) return;

  setError("");

  try {
    console.log("Calling AWS Polly...");

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: script,
      }),
    });

    console.log("Polly Response Status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Polly API Error:", errorText);

      throw new Error(
        `AWS Polly request failed (${res.status})`
      );
    }

    const blob = await res.blob();

    console.log("Audio blob size:", blob.size);

    if (blob.size === 0) {
      throw new Error("Empty audio returned from Polly");
    }

    const audioUrl = URL.createObjectURL(blob);

    if (audioRef.current) {
      audioRef.current.pause();

      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    }

    const audio = new Audio(audioUrl);

    audioRef.current = audio;

    audio.onplay = () => {
      console.log("Playing Polly audio");
      setIsPlaying(true);
      setIsPaused(false);
      setTtsMode("polly");
    };

    audio.onpause = () => {
      setIsPaused(true);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    audio.onerror = (event) => {
      console.error("Audio playback error:", event);

      setError(
        "AWS Polly generated audio but playback failed."
      );

      setIsPlaying(false);
      setIsPaused(false);
    };

    await audio.play();
  } catch (err) {
    console.error("POLLY ERROR:", err);

    setError(
      err instanceof Error
        ? err.message
        : "AWS Polly failed"
    );

    setIsPlaying(false);
    setIsPaused(false);
  }
};

  // ── Browser TTS fallback ─────────────────────────────────────────────────
  const handlePlayBrowser = () => {
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
    utterance.onerror = () => {
      setError("Playback failed. Please try again.");
      setIsPlaying(false); setIsPaused(false);
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = () => ttsMode === "polly" ? handlePlayPolly() : handlePlayBrowser();

  const handlePauseResume = () => {
    if (ttsMode === "polly" && audioRef.current) {
      if (isPaused) { audioRef.current.play(); setIsPaused(false); }
      else          { audioRef.current.pause(); setIsPaused(true); }
    } else {
      if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); }
      else          { window.speechSynthesis.pause();  setIsPaused(true);  }
    }
  };

  const handleStop = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    window.speechSynthesis.cancel();
    setIsPlaying(false); setIsPaused(false);
  };

  const resetAll = () => { handleStop(); setGoal(""); setScript(""); setError(""); };

  const getFriendlyVoiceName = (voice: SpeechSynthesisVoice): string => {
    if (voice.name.includes("Samantha")) return "✦ Samantha (Premium)";
    if (voice.name.includes("Zira"))     return "✦ Zira (Recommended)";
    return voice.name;
  };

  const card = {
    hidden:  { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0  },
    exit:    { opacity: 0, y: -28 },
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(15,10,30,0.72)",
    border: "1px solid rgba(139,92,246,0.18)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(88,28,220,0.18) 0%, #07050f 60%)",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full"
        style={{ background: "rgba(109,40,217,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}
      >
        <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
        <span className="text-[11px] tracking-widest uppercase text-violet-300">Guided Visualization</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1 }}
        className="text-center mb-2"
      >
        <h1 className="text-4xl sm:text-5xl font-light text-white leading-tight">What do you want to</h1>
        <h1 className="text-4xl sm:text-5xl font-light italic leading-tight" style={{ color: "#a78bfa" }}>visualize?</h1>
      </motion.div>

      <motion.div
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="w-10 h-px my-5"
        style={{ background: "rgba(139,92,246,0.4)" }}
      />

      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">

          {!script ? (
            <motion.div
              key="input" variants={card} initial="hidden" animate="visible" exit="exit"
              transition={{ duration: 0.35 }}
              className="rounded-3xl p-6 sm:p-8" style={cardStyle}
            >
              <BreathingOrb isPlaying={false} />

              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {PRESETS.map(({ label, icon }) => (
                  <button
                    key={label} type="button" onClick={() => setGoal(label)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm transition-all duration-200"
                    style={{
                      background: goal === label ? "rgba(109,40,217,0.45)" : "rgba(255,255,255,0.05)",
                      border: goal === label ? "1px solid rgba(167,139,250,0.6)" : "1px solid rgba(255,255,255,0.1)",
                      color: goal === label ? "#c4b5fd" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{icon}</span>{label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleGenerate} className="space-y-4">
                <textarea
                  value={goal} onChange={(e) => setGoal(e.target.value)}
                  placeholder="Describe your goal, intention, or what you'd like to visualize..."
                  disabled={loading} rows={3}
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

                <button
                  type="button" onClick={() => setShowSettings(!showSettings)}
                  className="w-full flex items-center justify-center gap-2 text-xs transition-colors duration-150"
                  style={{ color: "rgba(167,139,250,0.65)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                  </svg>
                  Voice Settings
                  <span style={{ fontSize: 9, opacity: 0.7 }}>{showSettings ? "▲" : "▼"}</span>
                </button>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-4 pt-1"
                    >
                      <div>
                        <label className="block text-[11px] mb-1.5" style={{ color: "rgba(167,139,250,0.6)" }}>TTS Engine</label>
                        <div className="flex gap-2">
                          {(["polly", "browser"] as const).map(mode => (
                            <button
                              key={mode} type="button" onClick={() => setTtsMode(mode)}
                              className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-all"
                              style={{
                                background: ttsMode === mode ? "rgba(109,40,217,0.45)" : "rgba(255,255,255,0.04)",
                                border: ttsMode === mode ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(255,255,255,0.08)",
                                color: ttsMode === mode ? "#c4b5fd" : "rgba(255,255,255,0.4)",
                              }}
                            >
                              {mode === "polly" ? "✦ AWS Polly" : "Browser TTS"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {ttsMode === "browser" && (
                        <>
                          <div>
                            <label className="block text-[11px] mb-1.5" style={{ color: "rgba(167,139,250,0.6)" }}>Voice</label>
                            <select
                              value={selectedVoice?.name || ""}
                              onChange={e => setSelectedVoice(availableVoices.find(v => v.name === e.target.value) || null)}
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
                            <label className="block text-[11px] mb-1.5" style={{ color: "rgba(167,139,250,0.6)" }}>Speed: {speed.toFixed(1)}×</label>
                            <input type="range" min="0.5" max="1.0" step="0.1" value={speed}
                              onChange={e => setSpeed(parseFloat(e.target.value))}
                              className="w-full accent-violet-500" />
                          </div>
                          <div>
                            <label className="block text-[11px] mb-1.5" style={{ color: "rgba(167,139,250,0.6)" }}>Pitch: {pitch.toFixed(1)}</label>
                            <input type="range" min="0.5" max="1.5" step="0.1" value={pitch}
                              onChange={e => setPitch(parseFloat(e.target.value))}
                              className="w-full accent-violet-500" />
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && <p className="text-xs text-red-400 text-center">{error}</p>}

                <motion.button
                  type="submit" disabled={loading || !goal.trim()}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
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
                  ) : <>✦ Generate Visualization</>}
                </motion.button>

                <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                  ✨ 100% Free · No Signup · Works Offline
                </p>
              </form>
            </motion.div>

          ) : (

            <motion.div
              key="playback" variants={card} initial="hidden" animate="visible" exit="exit"
              transition={{ duration: 0.35 }}
              className="rounded-3xl p-6 sm:p-8" style={cardStyle}
            >
              <BreathingOrb isPlaying={isPlaying && !isPaused} />
              <Waveform active={isPlaying && !isPaused} />

              <h2 className="text-lg font-light text-center text-white mb-4 tracking-wide">Your Visualization</h2>

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

              <div className="space-y-3">
                {!isPlaying && (
                  <motion.button
                    onClick={handlePlay} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
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
                    <motion.button onClick={handlePauseResume} whileTap={{ scale: 0.97 }}
                      className="flex-1 py-3.5 rounded-2xl text-sm font-medium"
                      style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", color: "#fcd34d" }}
                    >
                      {isPaused ? "▶ Resume" : "⏸ Pause"}
                    </motion.button>
                    <motion.button onClick={handleStop} whileTap={{ scale: 0.97 }}
                      className="flex-1 py-3.5 rounded-2xl text-sm font-medium"
                      style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", color: "#fca5a5" }}
                    >
                      ■ Stop
                    </motion.button>
                  </div>
                )}

                <motion.button onClick={resetAll} whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-2xl text-sm font-medium"
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}
                >
                  ↩ Create New Visualization
                </motion.button>
              </div>

              <p className="text-center text-[11px] mt-5" style={{ color: "rgba(167,139,250,0.45)" }}>
                🎙 {ttsMode === "polly" ? "AWS Polly (Neural)" : `${selectedVoice?.name ?? "Browser"} TTS`} · {speed}× speed
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}