import { Router } from "express";
import { registerUser, loginUser, getMe } from "./auth.controller";
import { verifyToken } from "../../middleware/verifyToken";

const router = Router();

router.post("/register", verifyToken, registerUser);
router.post("/login", verifyToken, loginUser);
router.get("/me", verifyToken, getMe);

export default router;
