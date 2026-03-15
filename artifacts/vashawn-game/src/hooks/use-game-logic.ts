import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { audioManager } from "@/lib/audio-manager";
import { 
  useGetUserProfile, 
  useListOpenaiConversations, 
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  UserProfile,
  OpenaiMessage
} from "@workspace/api-client-react";
import confetti from "canvas-confetti";

export type Rank = "Noob" | "Rookie" | "Beginner" | "Pro" | "Legendary";

export function getRankDetails(count: number): { rank: Rank, progress: number, nextAt: number } {
  if (count < 50) return { rank: "Noob", progress: count, nextAt: 50 };
  if (count < 100) return { rank: "Rookie", progress: count - 50, nextAt: 50 };
  if (count < 150) return { rank: "Beginner", progress: count - 100, nextAt: 50 };
  if (count < 200) return { rank: "Pro", progress: count - 150, nextAt: 50 };
  return { rank: "Legendary", progress: count - 200, nextAt: 100 }; // Caps at 300 visually
}

export function useGameLogic() {
  const queryClient = useQueryClient();
  
  // -- Data Fetching --
  const { data: profile } = useGetUserProfile({ query: { retry: false } });
  const { data: conversations } = useListOpenaiConversations();
  const { mutateAsync: createConversation } = useCreateOpenaiConversation();
  
  // -- Local State --
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [localConversationCount, setLocalConversationCount] = useState(0);
  
  // Synchronize local count with profile initially
  useEffect(() => {
    if (profile?.conversationCount !== undefined) {
      setLocalConversationCount(profile.conversationCount);
    }
  }, [profile?.conversationCount]);

  // Fetch active conversation messages
  const { data: activeConvoData } = useGetOpenaiConversation(
    activeConversationId || 0,
    { query: { enabled: !!activeConversationId } }
  );

  const messages = activeConvoData?.messages || [];

  // Initialize or fetch conversation
  useEffect(() => {
    async function initConvo() {
      if (conversations && conversations.length > 0) {
        setActiveConversationId(conversations[0].id);
      } else if (conversations && conversations.length === 0) {
        try {
          const newConvo = await createConversation({ data: { title: "Chat with Vashawn" } });
          setActiveConversationId(newConvo.id);
          queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
        } catch (e) {
          console.error("Failed to create conversation", e);
        }
      }
    }
    initConvo();
  }, [conversations, createConversation, queryClient]);

  // -- Celebration Logic --
  const triggerLevelUp = useCallback(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  }, []);

  const incrementCount = useCallback(() => {
    setLocalConversationCount(prev => {
      const next = prev + 1;
      // Check for rank up (50, 100, 150, 200)
      if ([50, 100, 150, 200].includes(next)) {
        triggerLevelUp();
      }
      return next;
    });
  }, [triggerLevelUp]);

  // -- Text Streaming --
  const sendTextMessage = async (content: string) => {
    if (!activeConversationId || !profile) return;
    
    // Optimistically update UI could go here, but SSE is fast
    setIsStreaming(true);
    setStreamingMessage("");

    try {
      const res = await fetch(`/api/openai/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          userName: profile.name, 
          userAge: profile.age, 
          userGender: profile.gender 
        })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let doneReading = false;
      let fullText = "";

      while (!doneReading) {
        const { value, done } = await reader.read();
        doneReading = done;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (!dataStr || dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.content) {
                  fullText += data.content;
                  setStreamingMessage(fullText);
                }
                if (data.done) {
                  doneReading = true;
                }
              } catch (e) {
                // Ignore parse errors on incomplete chunks
              }
            }
          }
        }
      }

      // Finish
      incrementCount();
      queryClient.invalidateQueries({ queryKey: [`/api/openai/conversations/${activeConversationId}`] });
    } catch (e) {
      console.error("Text chat error", e);
    } finally {
      setIsStreaming(false);
      setStreamingMessage("");
    }
  };

  // -- Voice Streaming --
  const sendVoiceMessage = async (base64Audio: string) => {
    if (!activeConversationId) return;
    
    setIsStreaming(true);
    setStreamingMessage("");
    audioManager.init();

    try {
      const res = await fetch(`/api/openai/conversations/${activeConversationId}/voice-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let doneReading = false;
      let fullTranscript = "";

      while (!doneReading) {
        const { value, done } = await reader.read();
        doneReading = done;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (!dataStr || dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.type === "transcript" && data.data) {
                  fullTranscript += data.data;
                  setStreamingMessage(fullTranscript);
                } else if (data.type === "audio" && data.data) {
                  audioManager.queueVoiceChunk(data.data);
                } else if (data.done) {
                  doneReading = true;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      incrementCount();
      queryClient.invalidateQueries({ queryKey: [`/api/openai/conversations/${activeConversationId}`] });
    } catch (e) {
      console.error("Voice chat error", e);
    } finally {
      setIsStreaming(false);
      setStreamingMessage("");
    }
  };

  return {
    profile,
    messages,
    streamingMessage,
    isStreaming,
    localConversationCount,
    sendTextMessage,
    sendVoiceMessage
  };
}

// -- Media Recorder Hook --
export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required for voice chat.");
    }
  };

  const stopRecording = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject("No active recorder");
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);

        // Stop all tracks to release mic
        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
      };

      mediaRecorderRef.current.stop();
    });
  };

  return { isRecording, startRecording, stopRecording };
}
