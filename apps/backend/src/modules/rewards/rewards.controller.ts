import { Response } from "express";

import { AuthRequest } from "../../middleware/verifyToken";
import {
  getPublicReward,
  listMyRewardRedemptions,
  listPublicRewards,
  redeemPublicReward,
} from "./rewards.service";

export async function listRewards(req: AuthRequest, res: Response) {
  try {
    const rewards = await listPublicRewards({
      category: req.query.category as string | undefined,
      merchantId: req.query.merchantId as string | undefined,
      search: req.query.search as string | undefined,
    });
    return res.json({ rewards });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getReward(req: AuthRequest, res: Response) {
  try {
    const reward = await getPublicReward(req.params.rewardId);
    if (!reward) {
      return res.status(404).json({ error: "Reward not found" });
    }
    return res.json({ reward });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function redeemReward(req: AuthRequest, res: Response) {
  try {
    const redemption = await redeemPublicReward(req.user!.uid, req.params.rewardId);
    return res.json({ message: "Reward redeemed", redemption });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function getMyRedemptions(req: AuthRequest, res: Response) {
  try {
    const redemptions = await listMyRewardRedemptions(req.user!.uid, req.query.status as string | undefined);
    return res.json({ redemptions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
