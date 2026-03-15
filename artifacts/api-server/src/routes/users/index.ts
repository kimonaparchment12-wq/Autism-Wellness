import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SaveUserProfileBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profile", async (_req, res) => {
  try {
    const users = await db.select().from(usersTable).limit(1);
    if (users.length === 0) {
      res.status(404).json({ error: "No profile found" });
      return;
    }
    const user = users[0];
    res.json({
      id: user.id,
      name: user.name,
      age: user.age,
      gender: user.gender,
      conversationCount: user.conversationCount,
      rank: user.rank,
      preferredVoice: user.preferredVoice,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function getRank(count: number): string {
  if (count >= 300) return "legendary";
  if (count >= 200) return "pro";
  if (count >= 150) return "beginner";
  if (count >= 100) return "rookie";
  return "noob";
}

router.post("/profile", async (req, res) => {
  try {
    const body = SaveUserProfileBody.parse(req.body);
    const existing = await db.select().from(usersTable).limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(usersTable)
        .set({
          name: body.name,
          age: body.age,
          gender: body.gender,
          preferredVoice: body.preferredVoice ?? existing[0].preferredVoice,
        })
        .where(eq(usersTable.id, existing[0].id))
        .returning();
      const user = updated[0];
      res.json({
        id: user.id,
        name: user.name,
        age: user.age,
        gender: user.gender,
        conversationCount: user.conversationCount,
        rank: user.rank,
        preferredVoice: user.preferredVoice,
        createdAt: user.createdAt.toISOString(),
      });
    } else {
      const created = await db
        .insert(usersTable)
        .values({
          name: body.name,
          age: body.age,
          gender: body.gender,
          conversationCount: 0,
          rank: "noob",
          preferredVoice: body.preferredVoice ?? "onyx",
        })
        .returning();
      const user = created[0];
      res.json({
        id: user.id,
        name: user.name,
        age: user.age,
        gender: user.gender,
        conversationCount: user.conversationCount,
        rank: user.rank,
        preferredVoice: user.preferredVoice,
        createdAt: user.createdAt.toISOString(),
      });
    }
  } catch (err) {
    console.error("Error saving profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/profile/increment-conversations", async (_req, res) => {
  try {
    const users = await db.select().from(usersTable).limit(1);
    if (users.length === 0) {
      res.status(404).json({ error: "No profile found" });
      return;
    }
    const user = users[0];
    const newCount = user.conversationCount + 1;
    const updated = await db
      .update(usersTable)
      .set({ conversationCount: newCount, rank: getRank(newCount) })
      .where(eq(usersTable.id, user.id))
      .returning();
    const u = updated[0];
    res.json({
      id: u.id,
      name: u.name,
      age: u.age,
      gender: u.gender,
      conversationCount: u.conversationCount,
      rank: u.rank,
      preferredVoice: u.preferredVoice,
      createdAt: u.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Error incrementing conversations:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
