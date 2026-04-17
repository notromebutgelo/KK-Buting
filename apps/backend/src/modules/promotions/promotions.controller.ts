import { Response } from "express";

import { AuthRequest } from "../../middleware/verifyToken";
import {
  createPromotion,
  deletePromotion,
  getPromotion,
  listActivePromotionsByMerchant,
  listPromotions,
  reviewPromotion,
  updatePromotion,
} from "./promotions.service";

async function resolveMerchantId(req: AuthRequest): Promise<string> {
  const role = String(req.user?.role || "");
  if (role === "merchant") {
    // look up their merchant record
    const { db } = await import("../../config/firebase");
    const snap = await db.collection("merchants").where("ownerId", "==", req.user!.uid).limit(1).get();
    if (!snap.empty) return snap.docs[0].id;
  }
  return "";
}

export async function handleListPromotions(req: AuthRequest, res: Response) {
  try {
    const role = String(req.user?.role || "");
    const merchantId = await resolveMerchantId(req);
    const promotions = await listPromotions(role, merchantId);
    return res.json({ promotions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function handleListPromotionsByMerchant(req: AuthRequest, res: Response) {
  try {
    const { merchantId } = req.params;
    const promotions = await listActivePromotionsByMerchant(merchantId);
    return res.json({ promotions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function handleGetPromotion(req: AuthRequest, res: Response) {
  try {
    const promotion = await getPromotion(req.params.id);
    if (!promotion) return res.status(404).json({ error: "Promotion not found" });
    return res.json({ promotion });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function handleCreatePromotion(req: AuthRequest, res: Response) {
  try {
    const merchantId = await resolveMerchantId(req);
    if (!merchantId) return res.status(400).json({ error: "Merchant record not found for this account" });
    const promotion = await createPromotion(merchantId, req.body);
    return res.status(201).json({ promotion });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function handleReviewPromotion(req: AuthRequest, res: Response) {
  try {
    const { decision, reviewNote } = req.body as { decision: "approved" | "rejected"; reviewNote?: string };
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'" });
    }
    const promotion = await reviewPromotion(req.user!.uid, req.params.id, decision, reviewNote);
    return res.json({ promotion });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function handleUpdatePromotion(req: AuthRequest, res: Response) {
  try {
    const merchantId = await resolveMerchantId(req);
    if (!merchantId) return res.status(403).json({ error: "Forbidden" });
    const promotion = await updatePromotion(merchantId, req.params.id, req.body);
    return res.json({ promotion });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function handleDeletePromotion(req: AuthRequest, res: Response) {
  try {
    const merchantId = await resolveMerchantId(req);
    if (!merchantId) return res.status(403).json({ error: "Forbidden" });
    const result = await deletePromotion(merchantId, req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}
