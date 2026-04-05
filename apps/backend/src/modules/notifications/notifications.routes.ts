import { Router } from "express";

import { verifyToken } from "../../middleware/verifyToken";
import { getMyNotifications, markMyNotificationsRead } from "./notifications.controller";

const router = Router();

router.get("/me", verifyToken, getMyNotifications);
router.post("/me/read-all", verifyToken, markMyNotificationsRead);

export default router;
