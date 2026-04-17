import { Router } from "express";

import { requireRole } from "../../middleware/requireRole";
import { verifyToken } from "../../middleware/verifyToken";
import {
  handleCreatePromotion,
  handleDeletePromotion,
  handleGetPromotion,
  handleListPromotions,
  handleListPromotionsByMerchant,
  handleReviewPromotion,
  handleUpdatePromotion,
} from "./promotions.controller";

const router = Router();

router.use(verifyToken);

// Public-ish: any authenticated user can list or get promotions
router.get("/", handleListPromotions);
router.get("/by-merchant/:merchantId", handleListPromotionsByMerchant);
router.get("/:id", handleGetPromotion);

// Merchant: create / edit / delete their own pending promotions
router.post("/", requireRole("merchant"), handleCreatePromotion);
router.patch("/:id", requireRole("merchant"), handleUpdatePromotion);
router.delete("/:id", requireRole("merchant"), handleDeletePromotion);

// Superadmin: review (approve / reject)
router.patch("/:id/review", requireRole("superadmin"), handleReviewPromotion);

export default router;
