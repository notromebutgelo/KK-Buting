import { Response } from "express";
import { AuthRequest } from "../../middleware/verifyToken";
import { getPoints, addPoints, redeemPoints } from "./points.service";

export async function getPointsBalance(req: AuthRequest, res: Response) {
  try {
    const balance = await getPoints(req.user!.uid);
    return res.json({ balance });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function earnPoints(req: AuthRequest, res: Response) {
  const { amount, merchantId } = req.body;
  if (!amount || !merchantId) return res.status(400).json({ error: "amount and merchantId are required" });
  try {
    await addPoints(req.user!.uid, Number(amount), merchantId);
    return res.json({ message: "Points added" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function redeemPointsHandler(req: AuthRequest, res: Response) {
  const { amount, rewardId } = req.body;
  if (!amount || !rewardId) return res.status(400).json({ error: "amount and rewardId are required" });
  try {
    await redeemPoints(req.user!.uid, Number(amount), rewardId);
    return res.json({ message: "Points redeemed" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}
