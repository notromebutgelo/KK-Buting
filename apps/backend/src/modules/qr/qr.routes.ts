import { Router } from "express";
import { generateQr, scanQr, redeemQr } from "./qr.controller";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import { qrRateLimit } from "../../middleware/rateLimit";
import { validateQrMutationRequest, validateRequest } from "../../middleware/validateRequest";

const router = Router();

// Youth generates their QR code
router.get("/generate", verifyToken, requireRole("youth"), generateQr);
// Merchant scans a QR code
router.post("/scan", verifyToken, qrRateLimit, requireRole("merchant"), validateRequest(validateQrMutationRequest), scanQr);
router.post("/redeem", verifyToken, qrRateLimit, requireRole("merchant"), validateRequest(validateQrMutationRequest), redeemQr);

export default router;
