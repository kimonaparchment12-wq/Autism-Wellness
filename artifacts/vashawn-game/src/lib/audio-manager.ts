/**
 * Audio Manager handles the Web Audio API generative ambient music
 * and the playback queue for base64 voice chunks.
 */

class AudioManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  
  private voiceQueue: string[] = [];
  private isVoicePlaying: boolean = false;
  private currentAudioElement: HTMLAudioElement | null = null;

  private isMusicPlaying: boolean = false;
  private currentTrack: number = 0;
  private musicVolume: number = 0.15;

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.connect(this.audioCtx.destination);
      this.masterGain.gain.value = this.musicVolume;
    }
  }

  // --- Voice Playback ---
  
  queueVoiceChunk(base64Data: string) {
    this.voiceQueue.push(base64Data);
    if (!this.isVoicePlaying) {
      this.playNextVoiceChunk();
    }
  }

  private playNextVoiceChunk() {
    if (this.voiceQueue.length === 0) {
      this.isVoicePlaying = false;
      return;
    }

    this.isVoicePlaying = true;
    const base64Data = this.voiceQueue.shift();
    
    try {
      const audioSrc = `data:audio/mp3;base64,${base64Data}`;
      this.currentAudioElement = new Audio(audioSrc);
      
      this.currentAudioElement.onended = () => {
        this.playNextVoiceChunk();
      };
      
      this.currentAudioElement.onerror = (e) => {
        console.error("Audio playback error", e);
        this.playNextVoiceChunk();
      };

      this.currentAudioElement.play().catch(e => {
        console.error("Audio auto-play prevented", e);
        this.playNextVoiceChunk();
      });
    } catch (error) {
      console.error("Failed to construct audio source", error);
      this.playNextVoiceChunk();
    }
  }

  stopVoice() {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement = null;
    }
    this.voiceQueue = [];
    this.isVoicePlaying = false;
  }

  // --- Generative Ambient Music ---
  
  setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      // Smooth volume transition
      this.masterGain.gain.setTargetAtTime(this.musicVolume, this.audioCtx!.currentTime, 0.1);
    }
  }

  getMusicVolume() {
    return this.musicVolume;
  }

  playMusicTrack(trackIndex: number) {
    this.init();
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.stopMusic();
    this.currentTrack = trackIndex % 5;
    this.isMusicPlaying = true;

    // Frequencies for different soothing, therapeutic moods
    const tracks = [
      [174.61, 220.00, 261.63, 329.63], // F, A, C, E (Fmaj7) - Warm/Happy
      [196.00, 246.94, 293.66, 369.99], // G, B, D, F# (Gmaj7) - Bright/Uplifting
      [130.81, 164.81, 196.00, 246.94], // C, E, G, B (Cmaj7) - Grounded/Calm
      [146.83, 174.61, 220.00, 261.63], // D, F, A, C (Dmin7) - Gentle/Pensive
      [164.81, 207.65, 246.94, 311.13]  // E, G#, B, D# (Emaj7) - Ethereal/Dreamy
    ];

    const freqs = tracks[this.currentTrack];

    freqs.forEach((freq, i) => {
      if (!this.audioCtx || !this.masterGain) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const lfo = this.audioCtx.createOscillator();
      const lfoGain = this.audioCtx.createGain();

      // Soft sine waves
      osc.type = 'sine';
      osc.frequency.value = freq;

      // Slow LFO for gentle swelling
      lfo.type = 'sine';
      lfo.frequency.value = 0.05 + (i * 0.02); // Very slow, distinct rates
      
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfoGain.gain.value = 0.3; // Depth of swell

      // Base volume for this node
      gain.gain.value = 0.2;

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      lfo.start();

      this.oscillators.push(osc, lfo);
    });
  }

  stopMusic() {
    this.oscillators.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch (e) {}
    });
    this.oscillators = [];
    this.isMusicPlaying = false;
  }
}

export const audioManager = new AudioManager();
