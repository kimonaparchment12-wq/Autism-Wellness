import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai", openaiRouter);
router.use("/users", usersRouter);

export default router;
