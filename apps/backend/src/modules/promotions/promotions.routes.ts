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
import {
  validatePromotionMutationRequest,
  validatePromotionReviewRequest,
  validateRequest,
} from "../../middleware/validateRequest";

const router = Router();

router.use(verifyToken);

// Public-ish: any authenticated user can list or get promotions
router.get("/", handleListPromotions);
router.get("/by-merchant/:merchantId", handleListPromotionsByMerchant);
router.get("/:id", handleGetPromotion);

// Merchant: create / edit / delete their own pending promotions
router.post("/", requireRole("merchant"), validateRequest(validatePromotionMutationRequest()), handleCreatePromotion);
router.patch("/:id", requireRole("merchant"), validateRequest(validatePromotionMutationRequest({ partial: true })), handleUpdatePromotion);
router.delete("/:id", requireRole("merchant"), handleDeletePromotion);

// Superadmin: review (approve / reject)
router.patch("/:id/review", requireRole("superadmin"), validateRequest(validatePromotionReviewRequest), handleReviewPromotion);

export default router;
