import { Response } from "express";

import { AuthRequest } from "../../middleware/verifyToken";
import { listNotificationsForUser, markAllNotificationsRead } from "./notifications.service";

export async function getMyNotifications(req: AuthRequest, res: Response) {
  try {
    const notifications = await listNotificationsForUser(req.user!.uid);
    return res.json({ notifications });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function markMyNotificationsRead(req: AuthRequest, res: Response) {
  try {
    const result = await markAllNotificationsRead(req.user!.uid);
    return res.json({ message: "Notifications marked as read", ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
