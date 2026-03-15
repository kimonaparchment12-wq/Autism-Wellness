import React, { useState, useEffect } from 'react';
import { Settings, Volume2, X, Music } from 'lucide-react';
import { audioManager } from '@/lib/audio-manager';
import { useSaveUserProfile, UserProfile } from '@workspace/api-client-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SettingsPanel({ profile }: { profile?: UserProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [volume, setVolume] = useState(15); // 0-100 scale
  const [selectedVoice, setSelectedVoice] = useState(profile?.preferredVoice || "onyx");
  const { mutateAsync: saveProfile } = useSaveUserProfile();

  useEffect(() => {
    audioManager.setMusicVolume(volume / 100);
  }, [volume]);

  const handleVoiceChange = async (voice: string) => {
    setSelectedVoice(voice);
    if (profile) {
      await saveProfile({
        data: {
          name: profile.name,
          age: profile.age,
          gender: profile.gender,
          preferredVoice: voice
        }
      });
    }
  };

  const toggleMusic = () => {
    const newTrack = Math.floor(Math.random() * 5);
    audioManager.playMusicTrack(newTrack);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="glass-button p-3 text-foreground/80 hover:text-primary"
      >
        <Settings className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/40 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed bottom-4 sm:bottom-auto sm:top-24 right-4 sm:right-8 w-[calc(100vw-32px)] sm:w-80 glass-card p-6 z-50 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-display font-bold">Settings</h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Voice Selection */}
                <div>
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                    Vashawn's Voice
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: "onyx", label: "Voice 1 (Deep & Warm)" },
                      { id: "echo", label: "Voice 2 (Soft & Gentle)" },
                      { id: "fable", label: "Voice 3 (Bright & Cheerful)" }
                    ].map(v => (
                      <button
                        key={v.id}
                        onClick={() => handleVoiceChange(v.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          selectedVoice === v.id 
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-sm" 
                            : "bg-white/50 border-white/60 hover:bg-white/80"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Music Controls */}
                <div>
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex justify-between items-center">
                    <span>Background Music</span>
                    <button onClick={toggleMusic} className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs bg-primary/10 px-2 py-1 rounded-lg">
                      <Music className="w-3 h-3" /> Change Track
                    </button>
                  </label>
                  <div className="flex items-center gap-4 bg-white/50 p-4 rounded-xl border border-white/60">
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value))}
                      className="w-full accent-primary h-2 bg-black/5 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
