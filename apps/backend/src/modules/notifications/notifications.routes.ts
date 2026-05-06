import { Router } from "express";

import { verifyToken } from "../../middleware/verifyToken";
import {
  getMyNotifications,
  markMyNotificationsRead,
  markSingleNotificationRead,
} from "./notifications.controller";

const router = Router();

router.get("/me", verifyToken, getMyNotifications);
router.post("/me/read-all", verifyToken, markMyNotificationsRead);
router.post("/:notificationId/read", verifyToken, markSingleNotificationRead);

export default router;
