import { Router } from "express";
import { getPointsBalance, earnPoints, redeemPointsHandler } from "./points.controller";
import { verifyToken } from "../../middleware/verifyToken";

const router = Router();

router.get("/", verifyToken, getPointsBalance);
router.post("/earn", verifyToken, earnPoints);
router.post("/redeem", verifyToken, redeemPointsHandler);

export default router;
