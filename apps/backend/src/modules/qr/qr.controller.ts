import { Response } from "express";
import { AuthRequest } from "../../middleware/verifyToken";
import { generateUserQr, processQrScan, processQrRedeem } from "./qr.service";

export async function generateQr(req: AuthRequest, res: Response) {
  try {
    const token = await generateUserQr(req.user!.uid);
    return res.json({ token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function scanQr(req: AuthRequest, res: Response) {
  const token = req.body?.token || req.body?.qrData;
  const amountSpent = Number(req.body?.amountSpent || req.body?.amount || 0);

  if (!token) return res.status(400).json({ error: "token is required" });
  if (!Number.isFinite(amountSpent) || amountSpent <= 0) {
    return res.status(400).json({
      error: "amountSpent must be greater than 0. Use the amount-based QR flow for all points awards.",
    });
  }

  try {
    const result = await processQrScan(token, req.user!.uid, amountSpent);
    return res.json(result);
  } catch (err: any) {
    const statusCode = Number(err?.status || err?.statusCode || 400);
    return res.status(statusCode).json({ error: err.message });
  }
}

export async function redeemQr(req: AuthRequest, res: Response) {
  const token = req.body?.token || req.body?.qrData;
  const amountSpent = Number(req.body?.amountSpent || req.body?.amount || 0);

  if (!token) return res.status(400).json({ error: "token is required" });
  if (!Number.isFinite(amountSpent) || amountSpent <= 0) {
    return res.status(400).json({ error: "amountSpent must be greater than 0" });
  }

  try {
    const result = await processQrRedeem(token, req.user!.uid, amountSpent);
    return res.json(result);
  } catch (err: any) {
    const statusCode = Number(err?.status || err?.statusCode || 400);
    return res.status(statusCode).json({ error: err.message });
  }
}
