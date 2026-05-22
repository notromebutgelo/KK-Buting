import { Router } from "express";
import { submitProfilingHandler, getProfilingHandler, updateProfilingHandler } from "./profiling.controller";
import { validateRequest, validateYouthProfileUpdateRequest } from "../../middleware/validateRequest";
import { verifyToken } from "../../middleware/verifyToken";

const router = Router();

router.post("/", verifyToken, validateRequest(validateYouthProfileUpdateRequest), submitProfilingHandler);
router.get("/me", verifyToken, getProfilingHandler);
router.patch("/me", verifyToken, validateRequest(validateYouthProfileUpdateRequest), updateProfilingHandler);

export default router;
