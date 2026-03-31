import { Router } from "express";
import { submitProfilingHandler, getProfilingHandler, updateProfilingHandler } from "./profiling.controller";
import { verifyToken } from "../../middleware/verifyToken";

const router = Router();

router.post("/", verifyToken, submitProfilingHandler);
router.get("/me", verifyToken, getProfilingHandler);
router.patch("/me", verifyToken, updateProfilingHandler);

export default router;
