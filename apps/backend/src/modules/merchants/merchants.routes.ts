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

const router = Router();

router.get("/me", verifyToken, requireRole("merchant"), getMyMerchant);
router.patch("/me", verifyToken, requireRole("merchant"), updateMyMerchant);
router.post("/me/assets", verifyToken, requireRole("merchant"), uploadMyMerchantAsset);
router.get("/me/transactions", verifyToken, requireRole("merchant"), listMyMerchantTransactions);
router.get("/me/promotions", verifyToken, requireRole("merchant"), listMyMerchantPromotions);
router.post("/me/promotions", verifyToken, requireRole("merchant"), createMyMerchantPromotion);
router.patch("/me/promotions/:promotionId", verifyToken, requireRole("merchant"), updateMyMerchantPromotion);
router.delete("/me/promotions/:promotionId", verifyToken, requireRole("merchant"), deleteMyMerchantPromotion);
router.get("/me/products", verifyToken, requireRole("merchant"), listMyMerchantProducts);
router.post("/me/products", verifyToken, requireRole("merchant"), createMyMerchantProduct);
router.patch("/me/products/:productId", verifyToken, requireRole("merchant"), updateMyMerchantProduct);
router.delete("/me/products/:productId", verifyToken, requireRole("merchant"), deleteMyMerchantProduct);
router.get("/", listMerchants);
router.get("/:id", getMerchant);
router.post("/", verifyToken, registerMerchant);

export default router;
