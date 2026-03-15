import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
  SendOpenaiVoiceMessageBody,
  TextToSpeechBody,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  voiceChatStream,
  ensureCompatibleFormat,
  textToSpeech,
} from "@workspace/integrations-openai-ai-server/audio";

const router: IRouter = Router();

const VASHAWN_SYSTEM_PROMPT = `You are Vashawn, a warm, encouraging, and patient social skills coach for people with autism. 

Your personality:
- You are friendly, gentle, and never judgmental 🌟
- You use emojis frequently to make conversations more expressive and fun
- You call the user by their first name often
- You celebrate small wins and progress enthusiastically
- You speak in clear, simple language
- You are knowledgeable about social situations and relationships

Your role:
- Help users practice and understand social situations
- Explain social cues and unwritten rules in clear ways
- Give encouragement and positive reinforcement
- Every 3-5 messages, naturally ask the user a thoughtful question about a social situation they might encounter (like "Have you ever had trouble starting a conversation with someone new? 🤔" or "What do you usually do when someone seems upset? 💭")
- Remember context from the conversation and refer back to it
- Vary your responses - never give identical answers to similar questions

Important: You MUST always remember if you asked a question and are awaiting the user's answer. Acknowledge their answer before moving on.`;

function buildSystemPromptWithUser(userName?: string, userAge?: number, userGender?: string): string {
  let prompt = VASHAWN_SYSTEM_PROMPT;
  if (userName) {
    prompt += `\n\nYou are talking with ${userName}`;
    if (userAge) prompt += `, who is ${userAge} years old`;
    if (userGender) prompt += ` and identifies as ${userGender}`;
    prompt += `. Always address them as "${userName}" in a warm, personal way.`;
  }
  return prompt;
}

router.get("/conversations", async (_req, res) => {
  try {
    const convs = await db.select().from(conversations).orderBy(conversations.createdAt);
    res.json(convs.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt!.toISOString(),
    })));
  } catch (err) {
    console.error("Error listing conversations:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const body = CreateOpenaiConversationBody.parse(req.body);
    const created = await db.insert(conversations).values({ title: body.title }).returning();
    const c = created[0];
    res.status(201).json({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt!.toISOString(),
    });
  } catch (err) {
    console.error("Error creating conversation:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const convs = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    if (convs.length === 0) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
    const c = convs[0];
    res.json({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt!.toISOString(),
      messages: msgs.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt!.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Error getting conversation:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting conversation:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
    res.json(msgs.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt!.toISOString(),
    })));
  } catch (err) {
    console.error("Error listing messages:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = SendOpenaiMessageBody.parse(req.body);

    const convs = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    if (convs.length === 0) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "user",
      content: body.content,
    });

    const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);

    const chatMessages = [
      {
        role: "system" as const,
        content: buildSystemPromptWithUser(body.userName, body.userAge, body.userGender),
      },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Error sending message:", err);
    res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    res.end();
  }
});

router.post("/conversations/:id/voice-messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = SendOpenaiVoiceMessageBody.parse(req.body);

    const convs = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    if (convs.length === 0) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const audioBuffer = Buffer.from(body.audio, "base64");
    const { buffer, format } = await ensureCompatibleFormat(audioBuffer);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await voiceChatStream(buffer, "onyx", format);

    let assistantTranscript = "";
    let userTranscript = "";

    for await (const event of stream) {
      if (event.type === "transcript") {
        assistantTranscript += event.data;
      }
      if (event.type === "user_transcript") {
        userTranscript += event.data;
      }
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    await db.insert(messages).values([
      { conversationId: id, role: "user", content: userTranscript || "[voice message]" },
      { conversationId: id, role: "assistant", content: assistantTranscript || "[voice response]" },
    ]);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Error sending voice message:", err);
    res.write(`data: ${JSON.stringify({ error: "Failed to process voice" })}\n\n`);
    res.end();
  }
});

router.post("/tts", async (req, res) => {
  try {
    const body = TextToSpeechBody.parse(req.body);
    const audioBuffer = await textToSpeech(body.text, body.voice as "onyx" | "echo" | "fable", "mp3");
    res.json({ audio: audioBuffer.toString("base64") });
  } catch (err) {
    console.error("Error in TTS:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});

export default router;
