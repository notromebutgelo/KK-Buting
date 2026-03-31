import { Router } from "express";
import {
  getDashboard,
  listVerificationProfiles,
  getVerificationProfileHandler,
  approveVerificationHandler,
  rejectVerificationHandler,
  reviewVerificationDocumentHandler,
  requestVerificationResubmissionHandler,
  bulkApproveVerificationHandler,
  listRewards,
  addReward,
  updateRewardHandler,
  listRewardRedemptionsHandler,
  markRewardRedemptionClaimedHandler,
  listMerchants,
  getMerchantHandler,
  listPendingMerchants,
  approveMerchantHandler,
  updateMerchantHandler,
  updateMerchantStatusHandler,
  listMerchantTransactionsHandler,
  getPointsTransactionsOverviewHandler,
  updatePointsConversionRateHandler,
  listYouth,
  getYouthHandler,
  updateYouthProfileHandler,
  updateYouthStatusHandler,
  archiveYouthHandler,
  adjustYouthPointsHandler,
  listDigitalIds,
  getDigitalIdMemberHandler,
  generateDigitalIdHandler,
  submitDigitalIdForApprovalHandler,
  approveDigitalIdHandler,
  deactivateDigitalIdHandler,
  regenerateDigitalIdHandler,
  getReportsHandler,
} from "./admin.controller";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";

const router = Router();

const adminOrSuperadmin = [verifyToken, requireRole("admin", "superadmin")];
const superadminOnly = [verifyToken, requireRole("superadmin")];

router.get("/dashboard", ...adminOrSuperadmin, getDashboard);
router.get("/verification", ...adminOrSuperadmin, listVerificationProfiles);
router.post("/verification/bulk-approve", ...superadminOnly, bulkApproveVerificationHandler);
router.get("/verification/:userId", ...adminOrSuperadmin, getVerificationProfileHandler);
router.patch("/verification/:userId/approve", ...adminOrSuperadmin, approveVerificationHandler);
router.patch("/verification/:userId/reject", ...adminOrSuperadmin, rejectVerificationHandler);
router.patch(
  "/verification/:userId/documents/:documentId/review",
  ...adminOrSuperadmin,
  reviewVerificationDocumentHandler
);
router.patch(
  "/verification/:userId/request-resubmission",
  ...adminOrSuperadmin,
  requestVerificationResubmissionHandler
);
router.get("/rewards", ...adminOrSuperadmin, listRewards);
router.post("/rewards", ...adminOrSuperadmin, addReward);
router.patch("/rewards/:rewardId", ...adminOrSuperadmin, updateRewardHandler);
router.get("/rewards/redemptions", ...adminOrSuperadmin, listRewardRedemptionsHandler);
router.patch("/rewards/redemptions/:transactionId/claim", ...adminOrSuperadmin, markRewardRedemptionClaimedHandler);
router.get("/merchants", ...adminOrSuperadmin, listMerchants);
router.get("/merchants/:merchantId", ...adminOrSuperadmin, getMerchantHandler);
router.get("/merchants/pending", ...adminOrSuperadmin, listPendingMerchants);
router.patch("/merchants/:merchantId/approve", ...adminOrSuperadmin, approveMerchantHandler);
router.patch("/merchants/:merchantId", ...adminOrSuperadmin, updateMerchantHandler);
router.patch("/merchants/:merchantId/status", ...superadminOnly, updateMerchantStatusHandler);
router.get("/merchants/:merchantId/transactions", ...adminOrSuperadmin, listMerchantTransactionsHandler);
router.get("/points-transactions", ...adminOrSuperadmin, getPointsTransactionsOverviewHandler);
router.patch("/points-transactions/conversion-rate", ...superadminOnly, updatePointsConversionRateHandler);
router.get("/youth", ...adminOrSuperadmin, listYouth);
router.get("/youth/:userId", ...adminOrSuperadmin, getYouthHandler);
router.patch("/youth/:userId/status", ...adminOrSuperadmin, updateYouthStatusHandler);
router.patch("/youth/:userId/profile", ...adminOrSuperadmin, updateYouthProfileHandler);
router.patch("/youth/:userId/archive", ...superadminOnly, archiveYouthHandler);
router.post("/youth/:userId/points-adjustments", ...superadminOnly, adjustYouthPointsHandler);
router.get("/digital-ids", ...adminOrSuperadmin, listDigitalIds);
router.get("/digital-ids/:userId", ...adminOrSuperadmin, getDigitalIdMemberHandler);
router.post("/digital-ids/:userId/generate", ...adminOrSuperadmin, generateDigitalIdHandler);
router.post("/digital-ids/:userId/submit", ...adminOrSuperadmin, submitDigitalIdForApprovalHandler);
router.post("/digital-ids/:userId/approve", ...superadminOnly, approveDigitalIdHandler);
router.patch("/digital-ids/:userId/deactivate", ...superadminOnly, deactivateDigitalIdHandler);
router.post("/digital-ids/:userId/regenerate", ...superadminOnly, regenerateDigitalIdHandler);
router.get("/reports", ...adminOrSuperadmin, getReportsHandler);

export default router;
