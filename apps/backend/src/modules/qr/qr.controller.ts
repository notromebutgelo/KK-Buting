import { Response } from "express";
import { AuthRequest } from "../../middleware/verifyToken";
import { generateUserQr, processQrScan } from "./qr.service";

export async function generateQr(req: AuthRequest, res: Response) {
  try {
    const token = await generateUserQr(req.user!.uid);
    return res.json({ token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function scanQr(req: AuthRequest, res: Response) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token is required" });
  try {
    const result = await processQrScan(token, req.user!.uid);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}
