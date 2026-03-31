import { Router } from "express";
import { listMerchants, getMerchant, registerMerchant } from "./merchants.controller";
import { verifyToken } from "../../middleware/verifyToken";

const router = Router();

router.get("/", listMerchants);
router.get("/:id", getMerchant);
router.post("/", verifyToken, registerMerchant);

export default router;
