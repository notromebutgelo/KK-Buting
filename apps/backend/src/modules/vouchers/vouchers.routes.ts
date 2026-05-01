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
import {
  validateRequest,
  validateVoucherMutationRequest,
  validateVoucherTokenRequest,
} from "../../middleware/validateRequest";

const router = Router();

router.use(verifyToken);

// Static paths — must come before /:id to avoid param capture
router.get("/", handleListVouchers);
router.post("/redeem", requireRole("admin", "superadmin"), validateRequest(validateVoucherTokenRequest), handleRedeemVoucherPreview);
router.post("/redeem/confirm", requireRole("admin", "superadmin"), validateRequest(validateVoucherTokenRequest), handleRedeemVoucherConfirm);
router.post("/", requireRole("superadmin"), validateRequest(validateVoucherMutationRequest()), handleCreateVoucher);

// Parameterized paths
router.get("/:id", handleGetVoucher);
router.get("/:id/my-claim", requireRole("youth"), handleGetMyVoucherClaim);
router.get("/:id/claims", requireRole("superadmin"), handleGetVoucherClaims);
router.post("/:id/claim", requireRole("youth"), handleClaimVoucher);
router.patch("/:id", requireRole("superadmin"), validateRequest(validateVoucherMutationRequest({ partial: true })), handleUpdateVoucher);

export default router;
