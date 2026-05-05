import { Router } from "express";
import {
  getDigitalIdHandler,
  getMyVerificationStatusHandler,
  uploadDigitalIdSignatureHandler,
  uploadDocumentHandler,
} from "./digitalId.controller";
import { verifyToken } from "../../middleware/verifyToken";
import {
  validateDigitalIdSignatureUploadRequest,
  validateRequest,
} from "../../middleware/validateRequest";

const router = Router();

router.get("/", verifyToken, getDigitalIdHandler);
router.get("/me", verifyToken, getDigitalIdHandler);
router.get("/verification-status", verifyToken, getMyVerificationStatusHandler);
router.post("/documents", verifyToken, uploadDocumentHandler);
router.post(
  "/signature",
  verifyToken,
  validateRequest(validateDigitalIdSignatureUploadRequest),
  uploadDigitalIdSignatureHandler
);

export default router;
