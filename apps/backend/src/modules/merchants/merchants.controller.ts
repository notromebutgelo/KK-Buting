import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/verifyToken";
import {
  getAllMerchants,
  getMerchantById,
  createMerchant,
  getMerchantByOwnerId,
  updateMerchantProfileByOwner,
  uploadMerchantAssetByOwner,
  getMerchantTransactionsByOwner,
  getMerchantPromotionsByOwner,
  createMerchantPromotionByOwner,
  updateMerchantPromotionByOwner,
  deleteMerchantPromotionByOwner,
  getMerchantProductsByOwner,
  createMerchantProductByOwner,
  updateMerchantProductByOwner,
  deleteMerchantProductByOwner,
} from "./merhcants.service";

export async function listMerchants(req: Request, res: Response) {
  try {
    const merchants = await getAllMerchants();
    return res.json(merchants);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getMerchant(req: Request, res: Response) {
  try {
    const merchant = await getMerchantById(req.params.id);
    if (!merchant) return res.status(404).json({ error: "Merchant not found" });
    return res.json(merchant);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function registerMerchant(req: AuthRequest, res: Response) {
  try {
    const id = await createMerchant({ ...req.body, ownerId: req.user!.uid });
    return res.status(201).json({ id, message: "Merchant registered, pending approval" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getMyMerchant(req: AuthRequest, res: Response) {
  try {
    const merchant = await getMerchantByOwnerId(req.user!.uid);
    if (!merchant) return res.status(404).json({ error: "Merchant profile not found" });
    return res.json({ merchant });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateMyMerchant(req: AuthRequest, res: Response) {
  try {
    const merchant = await updateMerchantProfileByOwner(req.user!.uid, req.body || {});
    return res.json({ merchant, message: "Merchant profile updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function uploadMyMerchantAsset(req: AuthRequest, res: Response) {
  const { assetType, fileData } = req.body || {};
  if (!assetType || !fileData) {
    return res.status(400).json({ error: "assetType and fileData are required" });
  }

  try {
    const asset = await uploadMerchantAssetByOwner(req.user!.uid, assetType, fileData);
    return res.status(201).json(asset);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listMyMerchantTransactions(req: AuthRequest, res: Response) {
  try {
    const transactions = await getMerchantTransactionsByOwner(req.user!.uid);
    return res.json({ transactions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listMyMerchantPromotions(req: AuthRequest, res: Response) {
  try {
    const promotions = await getMerchantPromotionsByOwner(req.user!.uid);
    return res.json({ promotions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createMyMerchantPromotion(req: AuthRequest, res: Response) {
  try {
    const promotion = await createMerchantPromotionByOwner(req.user!.uid, req.body || {});
    return res.status(201).json({ promotion });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateMyMerchantPromotion(req: AuthRequest, res: Response) {
  try {
    const promotion = await updateMerchantPromotionByOwner(req.user!.uid, req.params.promotionId, req.body || {});
    return res.json({ promotion, message: "Promotion updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteMyMerchantPromotion(req: AuthRequest, res: Response) {
  try {
    await deleteMerchantPromotionByOwner(req.user!.uid, req.params.promotionId);
    return res.json({ message: "Promotion deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listMyMerchantProducts(req: AuthRequest, res: Response) {
  try {
    const products = await getMerchantProductsByOwner(req.user!.uid);
    return res.json({ products });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createMyMerchantProduct(req: AuthRequest, res: Response) {
  try {
    const product = await createMerchantProductByOwner(req.user!.uid, req.body || {});
    return res.status(201).json({ product });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateMyMerchantProduct(req: AuthRequest, res: Response) {
  try {
    const product = await updateMerchantProductByOwner(req.user!.uid, req.params.productId, req.body || {});
    return res.json({ product, message: "Product updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteMyMerchantProduct(req: AuthRequest, res: Response) {
  try {
    await deleteMerchantProductByOwner(req.user!.uid, req.params.productId);
    return res.json({ message: "Product deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
