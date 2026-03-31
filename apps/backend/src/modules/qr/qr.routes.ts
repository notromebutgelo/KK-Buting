import { Router } from "express";
import { generateQr, scanQr } from "./qr.controller";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";

const router = Router();

// Youth generates their QR code
router.get("/generate", verifyToken, requireRole("youth"), generateQr);
// Merchant scans a QR code
router.post("/scan", verifyToken, requireRole("merchant"), scanQr);

export default router;
