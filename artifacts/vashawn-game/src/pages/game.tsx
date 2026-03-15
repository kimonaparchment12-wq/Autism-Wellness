import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Send, Mic, Square, Loader2 } from "lucide-react";
import { useGameLogic, useVoiceRecording } from "@/hooks/use-game-logic";
import { RankBadge } from "@/components/RankBadge";
import { SettingsPanel } from "@/components/SettingsPanel";
import { audioManager } from "@/lib/audio-manager";

export default function GameScreen() {
  const [, setLocation] = useLocation();
  const { 
    profile, 
    messages, 
    streamingMessage, 
    isStreaming, 
    localConversationCount,
    sendTextMessage,
    sendVoiceMessage
  } = useGameLogic();

  const { isRecording, startRecording, stopRecording } = useVoiceRecording();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming || isRecording) return;
    const text = inputText.trim();
    setInputText("");
    await sendTextMessage(text);
  };

  const handleToggleVoice = async () => {
    if (isStreaming) return;
    if (isRecording) {
      try {
        const base64Audio = await stopRecording();
        await sendVoiceMessage(base64Audio);
      } catch (e) {
        console.error("Failed to stop/send recording", e);
      }
    } else {
      audioManager.stopVoice(); // Stop playback before recording
      await startRecording();
    }
  };

  // Ensure music plays when starting game
  useEffect(() => {
    audioManager.init();
    if (audioManager.getMusicVolume() === 0) {
       audioManager.setMusicVolume(0.15);
    }
  }, []);

  return (
    <div className="relative h-[100dvh] w-full flex flex-col overflow-hidden bg-background">
      {/* Blurred Environment Background */}
      <img 
        src={`${import.meta.env.BASE_URL}images/bg-painting.png`} 
        alt="" aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-125"
      />

      {/* Top Header */}
      <header className="relative z-20 flex justify-between items-center p-4 sm:p-6 pb-2">
        <button 
          onClick={() => setLocation("/")}
          className="glass-button flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider"
        >
          <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
        </button>

        <RankBadge count={localConversationCount} />

        <SettingsPanel profile={profile} />
      </header>

      {/* Main Chat Area */}
      <main className="relative z-10 flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-6 flex flex-col gap-6">
        {/* Intro Banner */}
        {messages.length === 0 && !isStreaming && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="m-auto text-center max-w-md p-8 bg-white/40 backdrop-blur-lg rounded-3xl border border-white/60 shadow-xl"
          >
            <img 
              src={`${import.meta.env.BASE_URL}images/vashawn-avatar.png`} 
              alt="Vashawn Avatar" 
              className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white shadow-md object-cover"
            />
            <h2 className="text-2xl font-display font-bold mb-2">Hi {profile?.name}! 👋</h2>
            <p className="text-muted-foreground font-medium">I'm Vashawn. I'm so glad you're here. We can talk about anything you'd like. Send a message to start!</p>
          </motion.div>
        )}

        {/* Message History */}
        {messages.map((msg, idx) => (
          <MessageBubble key={msg.id || idx} role={msg.role} content={msg.content} />
        ))}

        {/* Streaming Assistant Message */}
        {isStreaming && streamingMessage && (
          <MessageBubble role="assistant" content={streamingMessage} isStreaming />
        )}

        {/* Loading Indicator for when streaming hasn't yielded text yet */}
        {isStreaming && !streamingMessage && (
          <div className="flex gap-4 max-w-[85%] self-start items-end">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-white/50 overflow-hidden flex-shrink-0 flex items-center justify-center">
               <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
            <div className="bg-white/80 backdrop-blur-md px-6 py-4 rounded-3xl rounded-bl-sm border border-white/60 shadow-sm">
               <span className="flex gap-1">
                 <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                 <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                 <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
               </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </main>

      {/* Input Area */}
      <footer className="relative z-20 p-4 sm:p-6 bg-gradient-to-t from-background via-background/90 to-transparent pt-12">
        <div className="max-w-4xl mx-auto flex gap-2 sm:gap-4 items-end">
          <form 
            onSubmit={handleSendText} 
            className="flex-1 bg-white/70 backdrop-blur-xl border border-white/80 shadow-lg rounded-3xl p-2 flex items-center transition-all focus-within:bg-white focus-within:shadow-xl focus-within:border-primary/30"
          >
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              disabled={isStreaming || isRecording}
              className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-foreground placeholder:text-muted-foreground/70 font-medium"
            />
            <button 
              type="submit"
              disabled={!inputText.trim() || isStreaming || isRecording}
              className="p-3 bg-primary text-white rounded-2xl hover:bg-primary/90 disabled:opacity-50 disabled:bg-muted-foreground transition-all shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          <button
            onClick={handleToggleVoice}
            disabled={isStreaming}
            className={`p-5 rounded-3xl flex-shrink-0 shadow-lg transition-all duration-300 ${
              isRecording 
                ? "bg-destructive text-white shadow-destructive/30 animate-pulse" 
                : "bg-white/80 backdrop-blur-xl border border-white text-primary hover:bg-white"
            } disabled:opacity-50`}
          >
            {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" />}
          </button>
        </div>
      </footer>
    </div>
  );
}

function MessageBubble({ role, content, isStreaming }: { role: string, content: string, isStreaming?: boolean }) {
  const isAssistant = role === "assistant";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex gap-3 sm:gap-4 max-w-[90%] sm:max-w-[80%] ${isAssistant ? "self-start" : "self-end flex-row-reverse"}`}
    >
      {/* Avatar for Vashawn */}
      {isAssistant && (
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-md border-2 border-white/80 overflow-hidden flex-shrink-0 mt-auto hidden sm:block">
          <img 
            src={`${import.meta.env.BASE_URL}images/vashawn-avatar.png`} 
            alt="Vashawn" 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className={`px-5 py-4 sm:px-6 sm:py-5 rounded-3xl shadow-sm border ${
        isAssistant 
          ? "bg-white/90 backdrop-blur-md border-white rounded-bl-sm text-foreground" 
          : "bg-gradient-to-br from-primary to-[hsl(340,80%,60%)] border-primary/20 rounded-br-sm text-white font-medium shadow-primary/20"
      }`}>
        <p className="whitespace-pre-wrap leading-relaxed text-base sm:text-lg">
          {content}
          {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-primary/40 animate-pulse align-middle" />}
        </p>
      </div>
    </motion.div>
  );
}
