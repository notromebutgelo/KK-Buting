import { Router } from "express";

import { requireRole } from "../../middleware/requireRole";
import { verifyToken } from "../../middleware/verifyToken";
import {
  handleClaimVoucher,
  handleCreateVoucher,
  handleGetVoucher,
  handleListVouchers,
  handleUpdateVoucher,
} from "./vouchers.controller";

const router = Router();

// All voucher routes require authentication
router.use(verifyToken);

// Authenticated read routes (youth, admin, superadmin, merchant)
router.get("/", handleListVouchers);
router.get("/:id", handleGetVoucher);

// Youth-only claim
router.post("/:id/claim", requireRole("youth"), handleClaimVoucher);

// Superadmin-only writes
router.post("/", requireRole("superadmin"), handleCreateVoucher);
router.patch("/:id", requireRole("superadmin"), handleUpdateVoucher);

export default router;
