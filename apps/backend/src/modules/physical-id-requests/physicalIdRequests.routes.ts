import { Router } from "express";

import { verifyToken } from "../../middleware/verifyToken";
import {
  validatePhysicalIdRequestCreateRequest,
  validateRequest,
} from "../../middleware/validateRequest";
import {
  createPhysicalIdRequestHandler,
  listMyPhysicalIdRequestsHandler,
} from "./physicalIdRequests.controller";

const router = Router();

router.get("/me", verifyToken, listMyPhysicalIdRequestsHandler);
router.post(
  "/",
  verifyToken,
  validateRequest(validatePhysicalIdRequestCreateRequest),
  createPhysicalIdRequestHandler
);

export default router;
