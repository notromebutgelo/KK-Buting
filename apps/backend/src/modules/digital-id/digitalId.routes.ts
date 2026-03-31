import { Router } from "express";
import {
  getDigitalIdHandler,
  getMyVerificationStatusHandler,
  uploadDocumentHandler,
} from "./digitalId.controller";
import { verifyToken } from "../../middleware/verifyToken";

const router = Router();

router.get("/", verifyToken, getDigitalIdHandler);
router.get("/me", verifyToken, getDigitalIdHandler);
router.get("/verification-status", verifyToken, getMyVerificationStatusHandler);
router.post("/documents", verifyToken, uploadDocumentHandler);

export default router;
