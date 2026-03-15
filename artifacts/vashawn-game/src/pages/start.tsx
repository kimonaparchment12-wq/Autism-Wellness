import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetUserProfile } from "@workspace/api-client-react";
import { audioManager } from "@/lib/audio-manager";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function StartScreen() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = useGetUserProfile({ query: { retry: false } });

  useEffect(() => {
    // Stop any music when returning to start screen
    audioManager.stopMusic();
    audioManager.stopVoice();
  }, []);

  const handleStart = () => {
    // Start ambient music softly
    audioManager.playMusicTrack(0);
    
    if (profile) {
      setLocation("/game");
    } else {
      setLocation("/profile");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image & Overlay */}
      <img 
        src={`${import.meta.env.BASE_URL}images/bg-painting.png`} 
        alt="Two people having a gentle conversation in a cozy sunlit room" 
        className="absolute inset-0 w-full h-full object-cover scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-orange-50/40 via-peach-100/30 to-background/80 backdrop-blur-[2px]"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12"
        >
          <h1 className="text-7xl md:text-9xl font-display font-extrabold text-foreground drop-shadow-lg tracking-tight">
            Vashawn
          </h1>
          <p className="mt-4 text-xl md:text-2xl font-medium text-foreground/80 max-w-md mx-auto">
            Your friendly space to practice conversations and build confidence.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
            onClick={handleStart}
            className="glass-button-primary px-16 py-6 text-3xl md:text-4xl tracking-widest uppercase"
          >
            START
          </motion.button>
        )}
      </div>
    </div>
  );
}
