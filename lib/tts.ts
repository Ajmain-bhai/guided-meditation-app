export class TTSManager {
  private utterance: SpeechSynthesisUtterance | null = null;
  private isPaused: boolean = false;

  speak(
    text: string,
    onEnd?: () => void,
    onStart?: () => void
  ): void {
    this.stop(); // Stop any ongoing speech

    if (!text || text.trim().length === 0) {
      console.warn('TTS warning: Cannot speak empty text');
      return;
    }

    if ('speechSynthesis' in window) {
      this.utterance = new SpeechSynthesisUtterance(text);

      // Set voice parameters
      this.utterance.rate = 0.8;
      this.utterance.pitch = 1.0;
      this.utterance.volume = 1.0;

      // Safe voice selection
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (voice) =>
          voice.name.includes('Google') ||
          voice.name.includes('Enhanced') ||
          voice.lang.startsWith('en')
      );
      if (preferredVoice) {
        this.utterance.voice = preferredVoice;
      } else if (voices.length > 0) {
        // fallback to first available voice
        this.utterance.voice = voices[0];
      }

      // Event handlers
      this.utterance.onstart = () => {
        this.isPaused = false;
        if (onStart) onStart();
      };

      this.utterance.onend = () => {
        this.isPaused = false;
        if (onEnd) onEnd();
      };

      this.utterance.onerror = (event) => {
        console.error('TTS Error event:', event);
        if ((event as any).error) {
          console.error('TTS Error message:', (event as any).error);
        }
      };

      try {
        window.speechSynthesis.speak(this.utterance);
      } catch (err) {
        console.error('Failed to start speech synthesis:', err);
      }
    } else {
      console.error('TTS not supported in this browser.');
    }
  }

  pause(): void {
    if (window.speechSynthesis.speaking && !this.isPaused) {
      window.speechSynthesis.pause();
      this.isPaused = true;
    }
  }

  resume(): void {
    if (this.isPaused) {
      window.speechSynthesis.resume();
      this.isPaused = false;
    }
  }

  stop(): void {
    if (window.speechSynthesis.speaking || this.isPaused) {
      window.speechSynthesis.cancel();
      this.isPaused = false;
    }
  }
}

export const ttsManager = new TTSManager();
