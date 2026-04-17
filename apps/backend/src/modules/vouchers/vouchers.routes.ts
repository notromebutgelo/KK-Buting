import { Router } from "express";

import { requireRole } from "../../middleware/requireRole";
import { verifyToken } from "../../middleware/verifyToken";
import {
  handleClaimVoucher,
  handleCreateVoucher,
  handleGetMyVoucherClaim,
  handleGetVoucher,
  handleGetVoucherClaims,
  handleListVouchers,
  handleRedeemVoucherConfirm,
  handleRedeemVoucherPreview,
  handleUpdateVoucher,
} from "./vouchers.controller";

const router = Router();

router.use(verifyToken);

// Static paths — must come before /:id to avoid param capture
router.get("/", handleListVouchers);
router.post("/redeem", requireRole("admin", "superadmin"), handleRedeemVoucherPreview);
router.post("/redeem/confirm", requireRole("admin", "superadmin"), handleRedeemVoucherConfirm);
router.post("/", requireRole("superadmin"), handleCreateVoucher);

// Parameterized paths
router.get("/:id", handleGetVoucher);
router.get("/:id/my-claim", requireRole("youth"), handleGetMyVoucherClaim);
router.get("/:id/claims", requireRole("superadmin"), handleGetVoucherClaims);
router.post("/:id/claim", requireRole("youth"), handleClaimVoucher);
router.patch("/:id", requireRole("superadmin"), handleUpdateVoucher);

export default router;
