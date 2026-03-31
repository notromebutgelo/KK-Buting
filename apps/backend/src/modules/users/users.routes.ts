import { Router } from "express";
import { listUsers, getMyProfile, updateMyProfile } from "./users.controller";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";

const router = Router();

router.get("/", verifyToken, requireRole("admin"), listUsers);
router.get("/me", verifyToken, getMyProfile);
router.patch("/me", verifyToken, updateMyProfile);

export default router;
