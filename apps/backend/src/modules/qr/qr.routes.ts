import { Router } from "express";
import { generateQr, scanQr, redeemQr } from "./qr.controller";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";

const router = Router();

// Youth generates their QR code
router.get("/generate", verifyToken, requireRole("youth"), generateQr);
// Merchant scans a QR code
router.post("/scan", verifyToken, requireRole("merchant"), scanQr);
router.post("/redeem", verifyToken, requireRole("merchant"), redeemQr);

export default router;
