import { Router } from "express";

import { requireRole } from "../../middleware/requireRole";
import { verifyToken } from "../../middleware/verifyToken";
import { getMyRedemptions, getReward, listRewards, redeemReward } from "./rewards.controller";

const router = Router();

router.use(verifyToken, requireRole("youth"));
router.get("/", listRewards);
router.get("/my-redemptions", getMyRedemptions);
router.get("/:rewardId", getReward);
router.post("/:rewardId/redeem", redeemReward);

export default router;
