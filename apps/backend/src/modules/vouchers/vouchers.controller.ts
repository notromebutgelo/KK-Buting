import { Response } from "express";

import { AuthRequest } from "../../middleware/verifyToken";
import {
  claimVoucher,
  createVoucher,
  getMyVoucherClaim,
  getVoucher,
  getVoucherClaims,
  listAllVouchers,
  listYouthVouchers,
  redeemVoucherConfirm,
  redeemVoucherPreview,
  updateVoucher,
} from "./vouchers.service";

export async function handleListVouchers(req: AuthRequest, res: Response) {
  try {
    const role = String(req.user?.role || "");
    const uid = req.user!.uid;
    const vouchers = role === "superadmin" ? await listAllVouchers() : await listYouthVouchers(uid);
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

export async function handleGetMyVoucherClaim(req: AuthRequest, res: Response) {
  try {
    const claim = await getMyVoucherClaim(req.user!.uid, req.params.id);
    if (!claim) return res.status(404).json({ error: "No claim found for this voucher" });
    return res.json({ claim });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function handleRedeemVoucherPreview(req: AuthRequest, res: Response) {
  try {
    const result = await redeemVoucherPreview(String(req.body.token || ""));
    return res.json(result);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message });
  }
}

export async function handleRedeemVoucherConfirm(req: AuthRequest, res: Response) {
  try {
    const result = await redeemVoucherConfirm(String(req.body.token || ""), req.user!.uid);
    return res.json(result);
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message });
  }
}

export async function handleGetVoucherClaims(req: AuthRequest, res: Response) {
  try {
    const claims = await getVoucherClaims(req.params.id);
    return res.json({ claims });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
