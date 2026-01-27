"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ttsManager } from "@/lib/tts";
import type { GenerateMeditationResponse } from "../types/meditation";

export default function MeditationGenerator() {
  const [goal, setGoal] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      setTimeout(() => window.speechSynthesis.getVoices(), 100);
    }
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setScript("");
    setLoading(true);
    setIsPlaying(false);
    setIsPaused(false);
    ttsManager.stop();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });

      const data: GenerateMeditationResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate meditation");
      }

      setScript(data.script || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (!script) return;

    setIsPlaying(true);
    setIsPaused(false);

    ttsManager.speak(script, () => {
      setIsPlaying(false);
      setIsPaused(false);
    });
  };

  const handlePauseResume = () => {
    if (isPaused) {
      ttsManager.resume();
      setIsPaused(false);
    } else {
      ttsManager.pause();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    ttsManager.stop();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const resetAll = () => {
    handleStop();
    setGoal("");
    setScript("");
    setError("");
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
