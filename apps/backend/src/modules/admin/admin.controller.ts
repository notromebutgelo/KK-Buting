import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/verifyToken";
import {
  getDashboardStats,
  getVerificationProfiles,
  getVerificationProfile,
  approveVerification,
  rejectVerification,
  reviewVerificationDocument,
  requestVerificationResubmission,
  bulkApproveVerifications,
  getAllRewards,
  createReward,
  updateReward,
  getRewardRedemptions,
  markRewardRedemptionClaimed,
  getMerchants,
  getMerchantDetails,
  getPendingMerchants,
  approveMerchant,
  updateMerchant,
  updateMerchantStatus,
  getMerchantTransactions,
  getPointsTransactionsOverview,
  updatePointsConversionRate,
  getYouthMembers,
  getYouthMember,
  updateYouthMemberProfile,
  updateYouthVerificationStatus,
  archiveYouthMember,
  adjustYouthPoints,
  getDigitalIds,
  getDigitalIdMembers,
  getDigitalIdMember,
  generateDigitalIdDraft,
  submitDigitalIdForApproval,
  approveDigitalId,
  deactivateDigitalId,
  regenerateDigitalId,
  getReports,
} from "./admin.service";

export async function getDashboard(req: AuthRequest, res: Response) {
  try {
    const stats = await getDashboardStats();
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listVerificationProfiles(req: AuthRequest, res: Response) {
  try {
    const result = await getVerificationProfiles({
      search: req.query.search as string | undefined,
      ageGroup: req.query.ageGroup as string | undefined,
      documentType: req.query.documentType as string | undefined,
      dateSubmitted: req.query.dateSubmitted as string | undefined,
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getVerificationProfileHandler(req: AuthRequest, res: Response) {
  try {
    const profile = await getVerificationProfile(req.params.userId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    return res.json({ profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function approveVerificationHandler(req: AuthRequest, res: Response) {
  const { userId } = req.params;
  try {
    await approveVerification(userId, req.user!.email || "admin");
    return res.json({ message: "Verification approved" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function rejectVerificationHandler(req: AuthRequest, res: Response) {
  const { userId } = req.params;
  const { reason, note } = req.body;
  if (!reason) return res.status(400).json({ error: "reason is required" });
  try {
    await rejectVerification(userId, req.user!.email || "admin", reason, note);
    return res.json({ message: "Verification rejected" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function reviewVerificationDocumentHandler(req: AuthRequest, res: Response) {
  const { action, note } = req.body;

  if (!["approved", "rejected"].includes(action)) {
    return res.status(400).json({ error: "action must be approved or rejected" });
  }

  try {
    await reviewVerificationDocument(
      req.params.userId,
      req.params.documentId,
      action,
      req.user!.email || "admin",
      note
    );
    return res.json({ message: "Document review updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function requestVerificationResubmissionHandler(req: AuthRequest, res: Response) {
  const documentIds = Array.isArray(req.body?.documentIds) ? req.body.documentIds : [];
  const message = String(req.body?.message || "").trim();

  if (!documentIds.length) {
    return res.status(400).json({ error: "documentIds are required" });
  }

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    await requestVerificationResubmission(
      req.params.userId,
      documentIds,
      message,
      req.user!.email || "admin"
    );
    return res.json({ message: "Resubmission requested" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function bulkApproveVerificationHandler(req: AuthRequest, res: Response) {
  const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];

  if (!userIds.length) {
    return res.status(400).json({ error: "userIds are required" });
  }

  try {
    const result = await bulkApproveVerifications(userIds, req.user!.email || "admin");
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listRewards(req: Request, res: Response) {
  try {
    const rewards = await getAllRewards();
    return res.json({ rewards });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function addReward(req: AuthRequest, res: Response) {
  try {
    const id = await createReward(req.body);
    return res.status(201).json({ id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateRewardHandler(req: AuthRequest, res: Response) {
  try {
    await updateReward(req.params.rewardId, req.body);
    return res.json({ message: "Reward updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listRewardRedemptionsHandler(req: AuthRequest, res: Response) {
  try {
    const redemptions = await getRewardRedemptions({
      rewardId: req.query.rewardId as string | undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    });
    return res.json({ redemptions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function markRewardRedemptionClaimedHandler(req: AuthRequest, res: Response) {
  try {
    await markRewardRedemptionClaimed(req.params.transactionId, req.user?.email || "admin");
    return res.json({ message: "Redemption marked as claimed" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listMerchants(req: AuthRequest, res: Response) {
  try {
    const merchants = await getMerchants(req.query.status as string | undefined);
    return res.json({ merchants });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getMerchantHandler(req: AuthRequest, res: Response) {
  try {
    const merchant = await getMerchantDetails(req.params.merchantId);
    if (!merchant) return res.status(404).json({ error: "Merchant not found" });
    return res.json({ merchant });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listPendingMerchants(req: AuthRequest, res: Response) {
  try {
    const merchants = await getPendingMerchants();
    return res.json({ merchants });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function approveMerchantHandler(req: AuthRequest, res: Response) {
  try {
    await approveMerchant(req.params.merchantId);
    return res.json({ message: "Merchant approved" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateMerchantHandler(req: AuthRequest, res: Response) {
  try {
    await updateMerchant(req.params.merchantId, req.body, req.user?.email || "admin");
    return res.json({ message: "Merchant updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateMerchantStatusHandler(req: AuthRequest, res: Response) {
  const status = String(req.body?.status || "");
  if (!["approved", "rejected", "suspended"].includes(status)) {
    return res.status(400).json({ error: "status must be approved, rejected, or suspended" });
  }

  try {
    await updateMerchantStatus(req.params.merchantId, status as "approved" | "rejected" | "suspended", req.user?.email || "superadmin");
    return res.json({ message: "Merchant status updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listMerchantTransactionsHandler(req: AuthRequest, res: Response) {
  try {
    const transactions = await getMerchantTransactions(req.params.merchantId);
    return res.json({ transactions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getPointsTransactionsOverviewHandler(req: AuthRequest, res: Response) {
  try {
    const data = await getPointsTransactionsOverview({
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      merchantId: req.query.merchantId as string | undefined,
      userId: req.query.userId as string | undefined,
      status: req.query.status as string | undefined,
      minPoints: req.query.minPoints ? Number(req.query.minPoints) : undefined,
      maxPoints: req.query.maxPoints ? Number(req.query.maxPoints) : undefined,
      search: req.query.search as string | undefined,
    });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updatePointsConversionRateHandler(req: AuthRequest, res: Response) {
  const pesosPerPoint = Number(req.body?.pesosPerPoint);
  if (!Number.isFinite(pesosPerPoint) || pesosPerPoint <= 0) {
    return res.status(400).json({ error: "pesosPerPoint must be a positive number" });
  }

  try {
    await updatePointsConversionRate(pesosPerPoint, req.user?.email || "superadmin");
    return res.json({ message: "Conversion rate updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listYouth(req: AuthRequest, res: Response) {
  try {
    const result = await getYouthMembers({
      search: req.query.search as string | undefined,
      verificationStatus: req.query.verificationStatus as string | undefined,
      profilingStatus: req.query.profilingStatus as string | undefined,
      ageGroup: req.query.ageGroup as string | undefined,
      gender: req.query.gender as string | undefined,
      purok: req.query.purok as string | undefined,
      archiveScope: req.query.archiveScope as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      sortKey: req.query.sortKey as string | undefined,
      sortDir: req.query.sortDir as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getYouthHandler(req: AuthRequest, res: Response) {
  try {
    const user = await getYouthMember(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateYouthProfileHandler(req: AuthRequest, res: Response) {
  try {
    await updateYouthMemberProfile(req.params.userId, req.body, req.user?.email || "admin");
    return res.json({ message: "Youth profile updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateYouthStatusHandler(req: AuthRequest, res: Response) {
  const { status, reason, note } = req.body;
  if (!["pending", "verified", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  if (status === "rejected" && !reason) {
    return res.status(400).json({ error: "reason is required when rejecting a user" });
  }

  try {
    await updateYouthVerificationStatus(
      req.params.userId,
      status,
      req.user?.email || "admin",
      reason,
      note
    );
    return res.json({ message: "Youth status updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function archiveYouthHandler(req: AuthRequest, res: Response) {
  try {
    await archiveYouthMember(req.params.userId, req.user?.email || "admin", req.body?.note);
    return res.json({ message: "Youth archived" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function adjustYouthPointsHandler(req: AuthRequest, res: Response) {
  const amount = Number(req.body?.amount);
  const reason = String(req.body?.reason || "").trim();

  if (!Number.isFinite(amount) || amount === 0) {
    return res.status(400).json({ error: "amount must be a non-zero number" });
  }

  if (!reason) {
    return res.status(400).json({ error: "reason is required" });
  }

  try {
    await adjustYouthPoints(req.params.userId, amount, reason, req.user?.email || "admin");
    return res.json({ message: "Points adjusted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listDigitalIds(req: AuthRequest, res: Response) {
  try {
    const result = await getDigitalIdMembers({
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function generateDigitalIdHandler(req: AuthRequest, res: Response) {
  try {
    const memberId = await generateDigitalIdDraft(req.params.userId, req.user?.email || "admin");
    return res.status(201).json({ memberId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getDigitalIdMemberHandler(req: AuthRequest, res: Response) {
  try {
    const member = await getDigitalIdMember(req.params.userId);
    if (!member) return res.status(404).json({ error: "Member not found" });
    return res.json({ member });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function submitDigitalIdForApprovalHandler(req: AuthRequest, res: Response) {
  try {
    await submitDigitalIdForApproval(req.params.userId, req.user?.email || "admin");
    return res.json({ message: "Digital ID sent for approval" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function approveDigitalIdHandler(req: AuthRequest, res: Response) {
  try {
    await approveDigitalId(req.params.userId, req.user?.email || "superadmin");
    return res.json({ message: "Digital ID approved" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deactivateDigitalIdHandler(req: AuthRequest, res: Response) {
  try {
    await deactivateDigitalId(req.params.userId, req.user?.email || "superadmin", req.body?.reason);
    return res.json({ message: "Digital ID deactivated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function regenerateDigitalIdHandler(req: AuthRequest, res: Response) {
  try {
    const memberId = await regenerateDigitalId(req.params.userId, req.user?.email || "superadmin");
    return res.json({ memberId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getReportsHandler(req: AuthRequest, res: Response) {
  try {
    const reports = await getReports();
    return res.json(reports);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
