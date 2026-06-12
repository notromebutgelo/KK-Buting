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
  uploadMerchantAssetHandler,
  removeMerchantAssetHandler,
  createMerchantPromotionHandler,
  updateMerchantPromotionHandler,
  deleteMerchantPromotionHandler,
  createMerchantProductHandler,
  updateMerchantProductHandler,
  deleteMerchantProductHandler,
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
  createMerchantAccountHandler,
  listAdminAccountsHandler,
  createAdminAccountHandler,
  resetAdminPasswordHandler,
  updateAdminAccountStatusHandler,
  listAuditLogsHandler,
  exportAuditLogsHandler,
  listPhysicalIdRequestsHandler,
  getPhysicalIdRequestHandler,
  updatePhysicalIdRequestHandler,
} from "./admin.controller";
import { auditAdminMutation } from "./audit.service";
import { verifyToken } from "../../middleware/verifyToken";
import { requireRole } from "../../middleware/requireRole";
import {
  validateAdminAccountRequest,
  validateAdminAccountStatusRequest,
  validateAdjustYouthPointsRequest,
  validateArchiveYouthRequest,
  validateBulkUserIdsRequest,
  validateDigitalIdDeactivationRequest,
  validateMerchantAccountRequest,
  validateMerchantProfileUpdateRequest,
  validateMerchantAssetDeleteRequest,
  validateMerchantAssetUploadRequest,
  validateMerchantProductRequest,
  validateMerchantSubPromotionRequest,
  validateMerchantStatusRequest,
  validatePointsConversionRequest,
  validateRequest,
  validateRewardMutationRequest,
  validateVerificationDocumentReviewRequest,
  validateVerificationRejectRequest,
  validateVerificationResubmissionRequest,
  validatePhysicalIdRequestAdminUpdateRequest,
  validateYouthProfileUpdateRequest,
  validateYouthStatusRequest,
} from "../../middleware/validateRequest";

const router = Router();

const adminOrSuperadmin = [verifyToken, requireRole("admin", "superadmin"), auditAdminMutation];
const adminOnly = [verifyToken, requireRole("admin"), auditAdminMutation];
const superadminOnly = [verifyToken, requireRole("superadmin"), auditAdminMutation];

router.get("/dashboard", ...adminOrSuperadmin, getDashboard);
router.get("/verification", ...adminOrSuperadmin, listVerificationProfiles);
router.post("/verification/bulk-approve", ...adminOrSuperadmin, validateRequest(validateBulkUserIdsRequest), bulkApproveVerificationHandler);
router.get("/verification/:userId", ...adminOrSuperadmin, getVerificationProfileHandler);
router.patch("/verification/:userId/approve", ...adminOrSuperadmin, approveVerificationHandler);
router.patch("/verification/:userId/reject", ...adminOnly, validateRequest(validateVerificationRejectRequest), rejectVerificationHandler);
router.patch(
  "/verification/:userId/documents/:documentId/review",
  ...adminOnly,
  validateRequest(validateVerificationDocumentReviewRequest),
  reviewVerificationDocumentHandler
);
router.patch(
  "/verification/:userId/request-resubmission",
  ...adminOrSuperadmin,
  validateRequest(validateVerificationResubmissionRequest),
  requestVerificationResubmissionHandler
);
router.get("/rewards", ...adminOrSuperadmin, listRewards);
router.post("/rewards", ...adminOrSuperadmin, validateRequest(validateRewardMutationRequest()), addReward);
router.patch("/rewards/:rewardId", ...adminOrSuperadmin, validateRequest(validateRewardMutationRequest({ partial: true })), updateRewardHandler);
router.get("/rewards/redemptions", ...adminOrSuperadmin, listRewardRedemptionsHandler);
router.patch("/rewards/redemptions/:transactionId/claim", ...adminOrSuperadmin, markRewardRedemptionClaimedHandler);
router.post("/merchants/create", ...superadminOnly, validateRequest(validateMerchantAccountRequest), createMerchantAccountHandler);
router.get("/merchants", ...adminOrSuperadmin, listMerchants);
router.get("/merchants/pending", ...adminOrSuperadmin, listPendingMerchants);
router.get("/merchants/:merchantId", ...adminOrSuperadmin, getMerchantHandler);
router.patch("/merchants/:merchantId/approve", ...superadminOnly, approveMerchantHandler);
router.patch("/merchants/:merchantId", ...adminOrSuperadmin, validateRequest(validateMerchantProfileUpdateRequest), updateMerchantHandler);
router.post(
  "/merchants/:merchantId/assets",
  ...superadminOnly,
  validateRequest(validateMerchantAssetUploadRequest),
  uploadMerchantAssetHandler
);
router.delete(
  "/merchants/:merchantId/assets",
  ...superadminOnly,
  validateRequest(validateMerchantAssetDeleteRequest),
  removeMerchantAssetHandler
);
router.post(
  "/merchants/:merchantId/promotions",
  ...superadminOnly,
  validateRequest(validateMerchantSubPromotionRequest()),
  createMerchantPromotionHandler
);
router.patch(
  "/merchants/:merchantId/promotions/:promotionId",
  ...superadminOnly,
  validateRequest(validateMerchantSubPromotionRequest({ partial: true })),
  updateMerchantPromotionHandler
);
router.delete(
  "/merchants/:merchantId/promotions/:promotionId",
  ...superadminOnly,
  deleteMerchantPromotionHandler
);
router.post(
  "/merchants/:merchantId/products",
  ...superadminOnly,
  validateRequest(validateMerchantProductRequest()),
  createMerchantProductHandler
);
router.patch(
  "/merchants/:merchantId/products/:productId",
  ...superadminOnly,
  validateRequest(validateMerchantProductRequest({ partial: true })),
  updateMerchantProductHandler
);
router.delete(
  "/merchants/:merchantId/products/:productId",
  ...superadminOnly,
  deleteMerchantProductHandler
);
router.patch("/merchants/:merchantId/status", ...superadminOnly, validateRequest(validateMerchantStatusRequest), updateMerchantStatusHandler);
router.get("/merchants/:merchantId/transactions", ...adminOrSuperadmin, listMerchantTransactionsHandler);
router.get("/points-transactions", ...adminOrSuperadmin, getPointsTransactionsOverviewHandler);
router.patch("/points-transactions/conversion-rate", ...superadminOnly, validateRequest(validatePointsConversionRequest), updatePointsConversionRateHandler);
router.get("/admin-accounts", ...superadminOnly, listAdminAccountsHandler);
router.post("/admin-accounts", ...superadminOnly, validateRequest(validateAdminAccountRequest), createAdminAccountHandler);
router.post("/admin-accounts/:uid/reset-password", ...superadminOnly, resetAdminPasswordHandler);
router.patch("/admin-accounts/:uid/status", ...superadminOnly, validateRequest(validateAdminAccountStatusRequest), updateAdminAccountStatusHandler);
router.get("/audit-logs", ...superadminOnly, listAuditLogsHandler);
router.get("/audit-logs/export", ...superadminOnly, exportAuditLogsHandler);
router.get("/youth", ...adminOrSuperadmin, listYouth);
router.get("/youth/:userId", ...adminOrSuperadmin, getYouthHandler);
router.patch("/youth/:userId/status", ...adminOrSuperadmin, validateRequest(validateYouthStatusRequest), updateYouthStatusHandler);
router.patch("/youth/:userId/profile", ...superadminOnly, validateRequest(validateYouthProfileUpdateRequest), updateYouthProfileHandler);
router.patch("/youth/:userId/archive", ...superadminOnly, validateRequest(validateArchiveYouthRequest), archiveYouthHandler);
router.post("/youth/:userId/points-adjustments", ...superadminOnly, validateRequest(validateAdjustYouthPointsRequest), adjustYouthPointsHandler);
router.get("/digital-ids", ...adminOrSuperadmin, listDigitalIds);
router.get("/digital-ids/:userId", ...adminOrSuperadmin, getDigitalIdMemberHandler);
router.post("/digital-ids/:userId/generate", ...superadminOnly, generateDigitalIdHandler);
router.post("/digital-ids/:userId/submit", ...adminOrSuperadmin, submitDigitalIdForApprovalHandler);
router.post("/digital-ids/:userId/approve", ...superadminOnly, approveDigitalIdHandler);
router.patch("/digital-ids/:userId/deactivate", ...superadminOnly, validateRequest(validateDigitalIdDeactivationRequest), deactivateDigitalIdHandler);
router.post("/digital-ids/:userId/regenerate", ...superadminOnly, regenerateDigitalIdHandler);
router.get("/physical-id-requests", ...adminOrSuperadmin, listPhysicalIdRequestsHandler);
router.get("/physical-id-requests/:requestId", ...adminOrSuperadmin, getPhysicalIdRequestHandler);
router.patch(
  "/physical-id-requests/:requestId",
  ...adminOrSuperadmin,
  validateRequest(validatePhysicalIdRequestAdminUpdateRequest),
  updatePhysicalIdRequestHandler
);
router.get("/reports", ...adminOrSuperadmin, getReportsHandler);

export default router;
