import { Router } from "express";
import {
  registerUser,
  loginUser,
  getMe,
  markMerchantPasswordChangedHandler,
} from "./auth.controller";
import { verifyToken } from "../../middleware/verifyToken";
import { authRateLimit } from "../../middleware/rateLimit";
import { validateAuthLoginRequest, validateAuthRegisterRequest, validateRequest } from "../../middleware/validateRequest";

const router = Router();

router.post("/register", authRateLimit, verifyToken, validateRequest(validateAuthRegisterRequest), registerUser);
router.post("/login", authRateLimit, verifyToken, validateRequest(validateAuthLoginRequest), loginUser);
router.get("/me", verifyToken, getMe);
router.post("/password-changed", authRateLimit, verifyToken, validateRequest(validateAuthLoginRequest), markMerchantPasswordChangedHandler);

export default router;
