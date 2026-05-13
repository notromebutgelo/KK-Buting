import { Response } from "express";

import { AuthRequest } from "../../middleware/verifyToken";
import {
  createPhysicalIdRequest,
  listMyPhysicalIdRequests,
} from "./physicalIdRequests.service";

export async function listMyPhysicalIdRequestsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const result = await listMyPhysicalIdRequests(req.user!.uid);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createPhysicalIdRequestHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const request = await createPhysicalIdRequest(req.user!.uid, req.body);
    return res.status(201).json({
      message: "Physical ID request submitted",
      request,
    });
  } catch (err: any) {
    const message = String(err?.message || "Failed to submit physical ID request.");
    const statusCode =
      message.includes("not allowed") ||
      message.includes("must be") ||
      message.includes("already have")
        ? 400
        : 500;

    return res.status(statusCode).json({ error: message });
  }
}
