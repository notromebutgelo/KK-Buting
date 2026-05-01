import { Router } from "express";
import {
  listMerchants,
  getMerchant,
  registerMerchant,
  getMyMerchant,
  updateMyMerchant,
  uploadMyMerchantAsset,
  listMyMerchantTransactions,
  listMyMerchantPromotions,
  createMyMerchantPromotion,
  updateMyMerchantPromotion,
  deleteMyMerchantPromotion,
  listMyMerchantProducts,
  createMyMerchantProduct,
  updateMyMerchantProduct,
  deleteMyMerchantProduct,
} from "./merchants.controller";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import {
  validateMerchantAssetUploadRequest,
  validateMerchantProductRequest,
  validateMerchantProfileUpdateRequest,
  validateMerchantRegisterRequest,
  validateMerchantSubPromotionRequest,
  validateRequest,
} from "../../middleware/validateRequest";

const router = Router();

router.get("/me", verifyToken, requireRole("merchant"), getMyMerchant);
router.patch("/me", verifyToken, requireRole("merchant"), validateRequest(validateMerchantProfileUpdateRequest), updateMyMerchant);
router.post("/me/assets", verifyToken, requireRole("merchant"), validateRequest(validateMerchantAssetUploadRequest), uploadMyMerchantAsset);
router.get("/me/transactions", verifyToken, requireRole("merchant"), listMyMerchantTransactions);
router.get("/me/promotions", verifyToken, requireRole("merchant"), listMyMerchantPromotions);
router.post("/me/promotions", verifyToken, requireRole("merchant"), validateRequest(validateMerchantSubPromotionRequest()), createMyMerchantPromotion);
router.patch("/me/promotions/:promotionId", verifyToken, requireRole("merchant"), validateRequest(validateMerchantSubPromotionRequest({ partial: true })), updateMyMerchantPromotion);
router.delete("/me/promotions/:promotionId", verifyToken, requireRole("merchant"), deleteMyMerchantPromotion);
router.get("/me/products", verifyToken, requireRole("merchant"), listMyMerchantProducts);
router.post("/me/products", verifyToken, requireRole("merchant"), validateRequest(validateMerchantProductRequest()), createMyMerchantProduct);
router.patch("/me/products/:productId", verifyToken, requireRole("merchant"), validateRequest(validateMerchantProductRequest({ partial: true })), updateMyMerchantProduct);
router.delete("/me/products/:productId", verifyToken, requireRole("merchant"), deleteMyMerchantProduct);
router.get("/", listMerchants);
router.get("/:id", getMerchant);
router.post("/", verifyToken, validateRequest(validateMerchantRegisterRequest), registerMerchant);

export default router;
