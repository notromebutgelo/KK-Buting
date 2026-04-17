import { Response } from "express";

import { AuthRequest } from "../../middleware/verifyToken";
import {
  claimVoucher,
  createVoucher,
  getVoucher,
  listActiveVouchers,
  listAllVouchers,
  updateVoucher,
} from "./vouchers.service";

export async function handleListVouchers(req: AuthRequest, res: Response) {
  try {
    const role = String(req.user?.role || "");
    const vouchers = role === "superadmin" ? await listAllVouchers() : await listActiveVouchers();
    return res.json({ vouchers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function handleGetVoucher(req: AuthRequest, res: Response) {
  try {
    const voucher = await getVoucher(req.params.id);
    if (!voucher) return res.status(404).json({ error: "Voucher not found" });
    return res.json({ voucher });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function handleCreateVoucher(req: AuthRequest, res: Response) {
  try {
    const voucher = await createVoucher(req.user!.uid, req.body);
    return res.status(201).json({ voucher });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function handleUpdateVoucher(req: AuthRequest, res: Response) {
  try {
    const voucher = await updateVoucher(req.params.id, req.body);
    return res.json({ voucher });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function handleClaimVoucher(req: AuthRequest, res: Response) {
  try {
    const result = await claimVoucher(req.user!.uid, req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}
