import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/verifyToken";
import { getAllMerchants, getMerchantById, createMerchant } from "./merhcants.service";

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
