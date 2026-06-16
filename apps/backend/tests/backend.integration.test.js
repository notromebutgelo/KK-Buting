const assert = require("node:assert/strict");

const { FakeFirestore, FieldValue, FakeTimestamp } = require("./fake-firestore");
const { loadDistModuleWithMocks } = require("./test-utils");

const FIRESTORE_MODULE_MOCK = {
  FieldValue,
  Timestamp: FakeTimestamp,
};

function createFirebaseConfigMock(db) {
  return {
    db,
    storage: {
      bucket: () => ({
        name: "kkprofiling-c42b4.firebasestorage.app",
      }),
    },
    auth: {},
  };
}

async function loadNotificationsService(db) {
  return loadDistModuleWithMocks("dist/src/modules/notifications/notifications.service", {
    "dist/src/config/firebase": createFirebaseConfigMock(db),
    "module:firebase-admin/firestore": FIRESTORE_MODULE_MOCK,
  });
}

async function loadMerchantsService(db) {
  return loadDistModuleWithMocks("dist/src/modules/merchants/merhcants.service", {
    "dist/src/config/firebase": createFirebaseConfigMock(db),
    "module:firebase-admin/firestore": FIRESTORE_MODULE_MOCK,
    "dist/src/modules/auth/user.service": {
      setUserRole: async () => undefined,
    },
    "dist/src/modules/notifications/notifications.service": {
      createNotification: async () => undefined,
    },
  });
}

async function loadPointsService(db) {
  return loadDistModuleWithMocks("dist/src/modules/points/points.service", {
    "dist/src/config/firebase": createFirebaseConfigMock(db),
    "module:firebase-admin/firestore": FIRESTORE_MODULE_MOCK,
  });
}

async function loadAdminService(db, notificationEvents = null) {
  return loadDistModuleWithMocks("dist/src/modules/admin/admin.service", {
    "dist/src/config/firebase": createFirebaseConfigMock(db),
    "module:firebase-admin/firestore": FIRESTORE_MODULE_MOCK,
    "dist/src/modules/auth/user.service": {
      setUserRole: async () => undefined,
    },
    "dist/src/modules/auth/merchantPasswordPolicy.service": {
      createMerchantTemporaryPasswordPolicy: async () => undefined,
    },
    "dist/src/modules/merchants/merhcants.service": {
      getMerchantById: async () => null,
    },
    "dist/src/modules/notifications/notifications.service": {
      createNotification: async (notification) => {
        notificationEvents?.push({ kind: "direct", notification });
        return undefined;
      },
      createNotificationsForRoles: async (roles, notification) => {
        notificationEvents?.push({ kind: "roles", roles, notification });
        return undefined;
      },
    },
  });
}

async function loadDigitalIdService(db, notificationEvents = null) {
  return loadDistModuleWithMocks("dist/src/modules/digital-id/digitalId.service", {
    "dist/src/config/firebase": createFirebaseConfigMock(db),
    "module:firebase-admin/firestore": FIRESTORE_MODULE_MOCK,
    "dist/src/modules/notifications/notifications.service": {
      createNotificationsForRoles: async (roles, notification) => {
        notificationEvents?.push({ kind: "roles", roles, notification });
        return undefined;
      },
    },
  });
}

async function loadPhysicalIdRequestsService(db) {
  return loadDistModuleWithMocks(
    "dist/src/modules/physical-id-requests/physicalIdRequests.service",
    {
      "dist/src/config/firebase": createFirebaseConfigMock(db),
      "module:firebase-admin/firestore": FIRESTORE_MODULE_MOCK,
      "dist/src/modules/notifications/notifications.service": {
        createNotification: async () => undefined,
        createNotificationsForRoles: async () => undefined,
      },
    }
  );
}

async function loadVouchersService(db, notifications = []) {
  return loadDistModuleWithMocks("dist/src/modules/vouchers/vouchers.service", {
    "dist/src/config/firebase": createFirebaseConfigMock(db),
    "module:firebase-admin/firestore": FIRESTORE_MODULE_MOCK,
    "dist/src/modules/notifications/notifications.service": {
      createNotification: async (notification) => {
        notifications.push(notification);
        return `notification-${notifications.length}`;
      },
    },
    "dist/src/modules/vouchers/vouchers.tokens": {
      generateUniqueToken: async () => "KKB-ABC123",
    },
  });
}

const tests = [
  {
    name: "notifications integration writes, lists, and marks records as read in fake Firestore",
    async run() {
      const db = new FakeFirestore();
      const notificationsService = await loadNotificationsService(db);

      const id = await notificationsService.createNotification({
        recipientUid: "youth-1",
        audience: "youth",
        type: "success",
        title: "Reward redeemed",
        body: "You redeemed a reward.",
        link: "/rewards/my-redemptions",
      });

      assert.ok(id);
      assert.equal(db.listDocData("notifications").length, 1);

      const listed = await notificationsService.listNotificationsForUser("youth-1");
      assert.equal(listed.length, 1);
      assert.equal(listed[0].title, "Reward redeemed");
      assert.equal(listed[0].read, false);

      const result = await notificationsService.markAllNotificationsRead("youth-1");
      assert.deepEqual(result, { updated: 1 });

      const after = await notificationsService.listNotificationsForUser("youth-1");
      assert.equal(after[0].read, true);
      assert.ok(after[0].readAt);
    },
  },
  {
    name: "targeted vouchers stay private to selected youth through listing, claim, and redemption",
    async run() {
      const notifications = [];
      const db = new FakeFirestore({
        users: {
          "youth-1": {
            role: "youth",
            UserName: "Selected Member",
            email: "selected@example.com",
          },
          "youth-2": {
            role: "youth",
            UserName: "Other Member",
            email: "other@example.com",
          },
          "super-1": {
            role: "superadmin",
            UserName: "Super Admin",
            email: "super@example.com",
          },
        },
        kkProfiling: {
          "youth-1": {
            age: 19,
            youthAgeGroup: "Core Youth",
            status: "verified",
            verified: true,
          },
          "youth-2": {
            age: 20,
            youthAgeGroup: "Core Youth",
            status: "verified",
            verified: true,
          },
        },
        points: {
          "youth-1": { balance: 100, redeemedPoints: 0 },
          "youth-2": { balance: 100, redeemedPoints: 0 },
        },
        vouchers: {
          "legacy-public": {
            title: "Community Voucher",
            description: "Available to everyone",
            type: "community",
            pointsCost: 0,
            stock: null,
            claimedBy: [],
            status: "active",
          },
        },
      });
      const vouchersService = await loadVouchersService(db, notifications);

      const created = await vouchersService.createVoucher("super-1", {
        title: "School Supplies",
        description: "Selected students only",
        type: "school_supplies",
        pointsCost: 0,
        stock: 2,
        status: "active",
        visibilityType: "targeted",
        targetUserIds: ["youth-1"],
        notificationsEnabled: true,
        eligibilityConditions: {
          isVerified: true,
          ageGroup: "Core Youth",
        },
      });

      assert.equal(created.visibilityType, "targeted");
      assert.deepEqual(created.targetUserIds, ["youth-1"]);
      assert.equal(created.targetedRecipientCount, 1);
      assert.deepEqual(
        notifications.map((notification) => notification.recipientUid),
        ["youth-1"]
      );

      const selectedList = await vouchersService.listYouthVouchers("youth-1");
      const otherList = await vouchersService.listYouthVouchers("youth-2");
      assert.deepEqual(
        selectedList.map((voucher) => voucher.title).sort(),
        ["Community Voucher", "School Supplies"]
      );
      assert.deepEqual(
        otherList.map((voucher) => voucher.title),
        ["Community Voucher"]
      );
      assert.equal(
        selectedList.find((voucher) => voucher.id === created.id).targetUserIds,
        undefined
      );

      const hiddenDetail = await vouchersService.getVoucher(created.id, {
        uid: "youth-2",
        role: "youth",
      });
      const adminDetail = await vouchersService.getVoucher(created.id, {
        uid: "super-1",
        role: "superadmin",
      });
      assert.equal(hiddenDetail, null);
      assert.deepEqual(adminDetail.targetUserIds, ["youth-1"]);
      assert.equal(adminDetail.targetRecipients[0].fullName, "Selected Member");

      await assert.rejects(
        vouchersService.claimVoucher("youth-2", created.id),
        /not available to your account/
      );

      const claim = await vouchersService.claimVoucher("youth-1", created.id);
      assert.equal(claim.token, "KKB-ABC123");
      assert.equal(
        notifications.filter((notification) => notification.title === "Voucher Claimed").length,
        1
      );

      const listedForAdmin = await vouchersService.listAllVouchers();
      const targetedVoucher = listedForAdmin.find((voucher) => voucher.id === created.id);
      assert.equal(targetedVoucher.claimedCount, 1);
      assert.equal(targetedVoucher.targetedRecipientCount, 1);

      await vouchersService.updateVoucher(created.id, {
        targetUserIds: ["youth-2"],
        notificationsEnabled: false,
      });

      assert.equal(
        await vouchersService.getMyVoucherClaim("youth-1", created.id),
        null
      );
      await assert.rejects(
        vouchersService.redeemVoucherPreview("KKB-ABC123"),
        /no longer available/
      );
      await assert.rejects(
        vouchersService.redeemVoucherConfirm("KKB-ABC123", "super-1"),
        /no longer available/
      );
    },
  },
  {
    name: "rewards integration redeems a reward, updates balances, and writes notification history",
    async run() {
      const db = new FakeFirestore({
        rewards: {
          "reward-1": {
            title: "Free Drink",
            description: "One free drink",
            points: 100,
            stock: 5,
            merchantId: "merchant-1",
            validDays: 30,
            isActive: true,
            category: "food",
          },
        },
        merchants: {
          "merchant-1": {
            businessName: "Cafe Buting",
            logoUrl: "https://cdn.example.com/logo.png",
            bannerUrl: "https://cdn.example.com/banner.png",
          },
        },
        points: {
          "youth-1": {
            balance: 250,
            redeemedPoints: 0,
          },
        },
        kkProfiling: {
          "youth-1": {
            idNumber: "KK-001",
          },
        },
        users: {
          "youth-1": {
            memberId: "KK-001",
            UserName: "Juan Dela Cruz",
          },
        },
      });

      const notificationsService = await loadNotificationsService(db);
      const rewardsService = loadDistModuleWithMocks("dist/src/modules/rewards/rewards.service", {
        "dist/src/config/firebase": createFirebaseConfigMock(db),
        "module:firebase-admin/firestore": FIRESTORE_MODULE_MOCK,
        "dist/src/modules/notifications/notifications.service": notificationsService,
      });

      const redemption = await rewardsService.redeemPublicReward("youth-1", "reward-1");

      assert.equal(redemption.rewardId, "reward-1");
      assert.equal(redemption.pointsCost, 100);
      assert.equal(redemption.remainingPoints, 150);
      assert.match(redemption.code, /^KK-[A-F0-9]{6}$/);

      const pointsDoc = db.getDocData("points", "youth-1");
      assert.equal(pointsDoc.balance, 150);
      assert.equal(pointsDoc.redeemedPoints, 100);

      const rewardDoc = db.getDocData("rewards", "reward-1");
      assert.equal(rewardDoc.stock, 4);

      const transactions = db.listDocData("transactions");
      assert.equal(transactions.length, 1);
      assert.equal(transactions[0].type, "redeem");
      assert.equal(transactions[0].rewardId, "reward-1");

      const pointsHistory = db.listDocData("users/youth-1/pointsHistory");
      assert.equal(pointsHistory.length, 1);
      assert.equal(pointsHistory[0].pointsDelta, -100);

      const notifications = db.listDocData("notifications");
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0].recipientUid, "youth-1");
      assert.match(notifications[0].body, /You redeemed Free Drink/);

      const redemptions = await rewardsService.listMyRewardRedemptions("youth-1", "active");
      assert.equal(redemptions.length, 1);
      assert.equal(redemptions[0].status, "active");
      assert.equal(redemptions[0].rewardTitle, "Free Drink");
    },
  },
  {
    name: "QR integration awards points and writes merchant and member transaction history",
    async run() {
      const db = new FakeFirestore({
        merchants: {
          "merchant-1": {
            ownerId: "owner-1",
            status: "approved",
            name: "Cafe Buting",
            businessName: "Cafe Buting",
            pointsRate: 10,
          },
        },
        kkProfiling: {
          "youth-1": {
            digitalIdStatus: "active",
            digitalIdRevision: 3,
            idNumber: "KK-001",
            firstName: "Juan",
            lastName: "Dela Cruz",
          },
        },
        users: {
          "youth-1": {
            UserName: "Juan Dela Cruz",
            email: "juan@example.com",
          },
        },
      });

      const pointsService = await loadPointsService(db);
      const merchantsService = await loadMerchantsService(db);
      const qrService = loadDistModuleWithMocks("dist/src/modules/qr/qr.service", {
        "dist/src/config/firebase": createFirebaseConfigMock(db),
        "dist/utils/renerateQrToken": {
          generateQrToken: () => "generated-token",
          QR_TOKEN_TTL_MS: 600000,
          verifyQrToken: () => ({
            userId: "youth-1",
            revision: 3,
            timestamp: Date.now(),
            expiresAt: Date.now() + 600000,
          }),
          verifyQrTokenDetailed: () => ({
            valid: true,
            userId: "youth-1",
            revision: 3,
            timestamp: Date.now(),
            expiresAt: Date.now() + 600000,
          }),
        },
        "dist/src/modules/points/points.service": pointsService,
        "dist/src/modules/merchants/merhcants.service": merchantsService,
      });

      const result = await qrService.processQrRedeem("signed-token", "owner-1", 105);

      assert.deepEqual(result, {
        userId: "youth-1",
        userName: "Juan Dela Cruz",
        memberId: "KK-001",
        merchantId: "merchant-1",
        merchantName: "Cafe Buting",
        amountSpent: 105,
        pointsRate: 10,
        pointsAwarded: 10,
      });

      const pointsDoc = db.getDocData("points", "youth-1");
      assert.equal(pointsDoc.balance, 10);
      assert.equal(pointsDoc.earnedPoints, 10);

      const transactions = db.listDocData("transactions");
      assert.equal(transactions.length, 1);
      assert.equal(transactions[0].type, "earn");
      assert.equal(transactions[0].merchantId, "merchant-1");
      assert.equal(transactions[0].amountSpent, 105);

      const merchantTransactions = db.listDocData("merchants/merchant-1/transactions");
      assert.equal(merchantTransactions.length, 1);
      assert.equal(merchantTransactions[0].points, 10);

      const userPointsHistory = db.listDocData("users/youth-1/pointsHistory");
      assert.equal(userPointsHistory.length, 1);
      assert.equal(userPointsHistory[0].pointsDelta, 10);
    },
  },
  {
    name: "QR integration prevents redeeming the same token twice",
    async run() {
      const db = new FakeFirestore({
        merchants: {
          "merchant-1": {
            ownerId: "owner-1",
            status: "approved",
            name: "Cafe Buting",
            businessName: "Cafe Buting",
            pointsRate: 10,
          },
        },
        kkProfiling: {
          "youth-1": {
            digitalIdStatus: "active",
            digitalIdRevision: 3,
            idNumber: "KK-001",
            firstName: "Juan",
            lastName: "Dela Cruz",
          },
        },
        users: {
          "youth-1": {
            UserName: "Juan Dela Cruz",
            email: "juan@example.com",
          },
        },
      });

      const merchantsService = await loadMerchantsService(db);
      const qrService = loadDistModuleWithMocks("dist/src/modules/qr/qr.service", {
        "dist/src/config/firebase": createFirebaseConfigMock(db),
        "module:firebase-admin/firestore": FIRESTORE_MODULE_MOCK,
        "dist/utils/renerateQrToken": {
          generateQrToken: () => "generated-token",
          QR_TOKEN_TTL_MS: 600000,
          verifyQrToken: () => ({
            userId: "youth-1",
            revision: 3,
            timestamp: Date.now(),
            expiresAt: Date.now() + 600000,
          }),
          verifyQrTokenDetailed: () => ({
            valid: true,
            userId: "youth-1",
            revision: 3,
            timestamp: Date.now(),
            expiresAt: Date.now() + 600000,
          }),
        },
        "dist/src/modules/points/points.service": {
          logMerchantScanFailure: async () => undefined,
        },
        "dist/src/modules/merchants/merhcants.service": merchantsService,
      });

      const first = await qrService.processQrRedeem("signed-token", "owner-1", 120);

      assert.equal(first.pointsAwarded, 12);
      assert.equal(db.listDocData("usedQrTokens").length, 1);

      await assert.rejects(
        qrService.processQrRedeem("signed-token", "owner-1", 120),
        /already been used/
      );

      const transactions = db.listDocData("transactions");
      assert.equal(transactions.length, 1);

      const pointsDoc = db.getDocData("points", "youth-1");
      assert.equal(pointsDoc.balance, 12);
      assert.equal(pointsDoc.earnedPoints, 12);
    },
  },
  {
    name: "merchant storefront integration keeps derived image and description fields aligned",
    async run() {
      const db = new FakeFirestore({
        merchants: {
          "merchant-1": {
            ownerId: "owner-1",
            status: "approved",
            name: "Cafe Buting",
            businessName: "Cafe Buting",
            imageUrl: "",
            bannerUrl: "",
            logoUrl: "",
            description: "",
            shortDescription: "",
          },
        },
      });

      const merchantsService = await loadMerchantsService(db);
      const updated = await merchantsService.updateMerchantProfileByOwner("owner-1", {
        bannerUrl: "https://cdn.example.com/banner.png",
        shortDescription: "Neighborhood cafe favorites",
        pointsPolicy: "Earn 1 point for every PHP 10 spent.",
      });

      assert.equal(updated.bannerUrl, "https://cdn.example.com/banner.png");
      assert.equal(updated.imageUrl, "https://cdn.example.com/banner.png");
      assert.equal(updated.shortDescription, "Neighborhood cafe favorites");
      assert.equal(updated.description, "Neighborhood cafe favorites");
      assert.equal(updated.pointsPolicy, "Earn 1 point for every PHP 10 spent.");

      const stored = db.getDocData("merchants", "merchant-1");
      assert.equal(stored.imageUrl, "https://cdn.example.com/banner.png");
      assert.equal(stored.shortDescription, "Neighborhood cafe favorites");
    },
  },
  {
    name: "admin verification queue excludes profiling-only youth without uploaded documents",
    async run() {
      const db = new FakeFirestore({
        users: {
          "youth-profile-only": {
            role: "youth",
            UserName: "Maria Profile",
            email: "maria@example.com",
            createdAt: "2026-05-06T03:00:00.000Z",
          },
          "youth-with-docs": {
            role: "youth",
            UserName: "Leo Documents",
            email: "leo@example.com",
            createdAt: "2026-05-06T03:05:00.000Z",
          },
        },
        kkProfiling: {
          "youth-profile-only": {
            firstName: "Maria",
            lastName: "Profile",
            youthAgeGroup: "Core Youth",
            submittedAt: "2026-05-06T04:00:00.000Z",
            status: "pending",
            verified: false,
          },
          "youth-with-docs": {
            firstName: "Leo",
            lastName: "Documents",
            youthAgeGroup: "Core Youth",
            documentsSubmitted: true,
            submittedAt: "2026-05-06T04:05:00.000Z",
            status: "pending",
            verified: false,
            verificationQueueStatus: "pending",
          },
        },
        documents: {
          "doc-1": {
            profileId: "youth-with-docs",
            documentType: "proof_of_voter_registration",
            reviewStatus: "pending",
            uploadedAt: "2026-05-06T04:05:10.000Z",
          },
        },
      });

      const adminService = await loadAdminService(db);
      const queue = await adminService.getVerificationProfiles({ pageSize: 10 });

      assert.deepEqual(
        queue.profiles.map((profile) => profile.userId),
        ["youth-with-docs"]
      );
      assert.equal(queue.summary.total, 1);
      assert.equal(queue.profiles[0].queueStatus, "pending");
      assert.equal(queue.profiles[0].documentCounts.pending, 1);
      assert.equal(Object.hasOwn(queue.profiles[0], "hasQueueActivity"), false);
    },
  },
  {
    name: "admin verification reset to pending rewinds document review statuses and queue state",
    async run() {
      const db = new FakeFirestore({
        users: {
          "youth-1": {
            role: "youth",
            UserName: "Jerome Alison",
            email: "jerome@example.com",
          },
        },
        kkProfiling: {
          "youth-1": {
            firstName: "Jerome",
            lastName: "Alison",
            youthAgeGroup: "Core Youth",
            documentsSubmitted: true,
            submittedAt: "2026-05-06T04:01:37.000Z",
            status: "verified",
            verified: true,
            verificationQueueStatus: "verified",
            verificationDocumentsApprovedAt: "2026-05-06T04:10:00.000Z",
            verificationDocumentsApprovedBy: "admin@kk.local",
            verificationReferredToSuperadminAt: "2026-05-06T04:11:00.000Z",
            verificationReferredToSuperadminBy: "admin@kk.local",
            digitalIdApprovalRequestedAt: "2026-05-06T04:11:00.000Z",
            digitalIdApprovalRequestedBy: "admin@kk.local",
          },
        },
        documents: {
          "doc-1": {
            profileId: "youth-1",
            documentType: "proof_of_voter_registration",
            reviewStatus: "approved",
            uploadedAt: "2026-05-06T04:00:00.000Z",
          },
          "doc-2": {
            profileId: "youth-1",
            documentType: "valid_government_id",
            reviewStatus: "approved",
            uploadedAt: "2026-05-06T04:00:01.000Z",
          },
          "doc-3": {
            profileId: "youth-1",
            documentType: "id_photo",
            reviewStatus: "approved",
            uploadedAt: "2026-05-06T04:00:02.000Z",
          },
        },
      });

      const adminService = await loadAdminService(db);

      await adminService.updateYouthVerificationStatus(
        "youth-1",
        "pending",
        "admin@kk.local"
      );

      const profile = db.getDocData("kkProfiling", "youth-1");
      assert.equal(profile.status, "pending");
      assert.equal(profile.verified, false);
      assert.equal(profile.verifiedAt, null);
      assert.equal(profile.verificationQueueStatus, null);
      assert.equal(profile.verificationDocumentsApprovedAt, null);
      assert.equal(profile.verificationReferredToSuperadminAt, null);
      assert.equal(profile.digitalIdApprovalRequestedAt, null);

      const docs = db.listDocData("documents");
      assert.equal(docs.length, 3);
      for (const document of docs) {
        assert.equal(document.reviewStatus, "pending");
        assert.equal(document.reviewNote, null);
        assert.equal(document.reviewedAt, null);
        assert.equal(document.reviewedBy, null);
        assert.equal(document.reviewRequestedAt, null);
      }

      const queue = await adminService.getVerificationProfiles({ pageSize: 10 });
      assert.equal(queue.profiles.length, 1);
      assert.equal(queue.profiles[0].status, "pending");
      assert.equal(queue.profiles[0].queueStatus, "pending");
      assert.deepEqual(
        queue.profiles[0].requiredDocuments.map((document) => document.reviewStatus),
        ["pending", "pending", "pending"]
      );
    },
  },
  {
    name: "superadmin re-verification feedback is routed to admin before admin rejection reaches youth",
    async run() {
      const notifications = [];
      const db = new FakeFirestore({
        users: {
          "youth-1": {
            role: "youth",
            UserName: "Jerome Alison",
            email: "jerome@example.com",
          },
        },
        kkProfiling: {
          "youth-1": {
            firstName: "Jerome",
            lastName: "Alison",
            email: "jerome@example.com",
            youthAgeGroup: "Core Youth",
            documentsSubmitted: true,
            status: "verified",
            verified: true,
            verificationQueueStatus: "pending_superadmin_id_generation",
            verificationDocumentsApprovedAt: "2026-05-06T04:10:00.000Z",
            verificationDocumentsApprovedBy: "admin@kk.local",
            verificationReferredToSuperadminAt: "2026-05-06T04:11:00.000Z",
            verificationReferredToSuperadminBy: "admin@kk.local",
            digitalIdApprovalRequestedAt: "2026-05-06T04:11:00.000Z",
            digitalIdApprovalRequestedBy: "admin@kk.local",
            digitalIdStatus: "pending_approval",
          },
        },
        documents: {
          "doc-1": {
            profileId: "youth-1",
            documentType: "proof_of_voter_registration",
            reviewStatus: "approved",
            uploadedAt: "2026-05-06T04:00:00.000Z",
          },
          "doc-2": {
            profileId: "youth-1",
            documentType: "valid_government_id",
            reviewStatus: "approved",
            uploadedAt: "2026-05-06T04:00:01.000Z",
          },
          "doc-3": {
            profileId: "youth-1",
            documentType: "id_photo",
            reviewStatus: "approved",
            uploadedAt: "2026-05-06T04:00:02.000Z",
          },
        },
      });

      const adminService = await loadAdminService(db, notifications);
      const result = await adminService.requestVerificationResubmission(
        "youth-1",
        ["doc-1"],
        "Please verify the voter registration document again.",
        "superadmin@kk.local",
        "superadmin"
      );

      assert.equal(result.destination, "admin");
      const pendingProfile = db.getDocData("kkProfiling", "youth-1");
      assert.equal(pendingProfile.status, "pending");
      assert.equal(
        pendingProfile.verificationQueueStatus,
        "admin_reverification_requested"
      );
      assert.equal(pendingProfile.verificationResubmissionMessage, null);
      assert.equal(db.getDocData("documents", "doc-1").reviewStatus, "approved");

      const handoff = db.getDocData("verificationAdminHandoffs", "youth-1");
      assert.equal(
        handoff.message,
        "Please verify the voter registration document again."
      );
      assert.deepEqual(handoff.documentIds, ["doc-1"]);
      assert.equal(handoff.status, "pending");

      assert.equal(notifications.length, 1);
      assert.equal(notifications[0].kind, "roles");
      assert.deepEqual(notifications[0].roles, ["admin"]);

      const detail = await adminService.getVerificationProfile("youth-1");
      assert.equal(detail.queueStatus, "admin_reverification_requested");
      assert.equal(
        detail.verificationAdminReviewMessage,
        "Please verify the voter registration document again."
      );

      await adminService.rejectVerification(
        "youth-1",
        "admin@kk.local",
        "The voter registration proof could not be validated.",
        "Upload a clearer and current copy."
      );

      const rejectedProfile = db.getDocData("kkProfiling", "youth-1");
      assert.equal(rejectedProfile.status, "rejected");
      assert.equal(
        rejectedProfile.verificationRejectReason,
        "The voter registration proof could not be validated."
      );
      assert.equal(db.getDocData("documents", "doc-1").reviewStatus, "rejected");
      assert.equal(
        db.getDocData("documents", "doc-1").reviewNote,
        "Upload a clearer and current copy."
      );
      assert.equal(db.getDocData("documents", "doc-2").reviewStatus, "approved");
      assert.equal(
        db.getDocData("verificationAdminHandoffs", "youth-1").resolution,
        "rejected"
      );

      assert.equal(notifications.length, 2);
      assert.equal(notifications[1].kind, "direct");
      assert.equal(notifications[1].notification.recipientUid, "youth-1");
    },
  },
  {
    name: "verification queue includes rejected profiles even when an old Digital ID is still active",
    async run() {
      const db = new FakeFirestore({
        users: {
          "youth-1": {
            role: "youth",
            UserName: "Jerome Angelo Alison",
            email: "qjadcalison@tip.edu.ph",
          },
        },
        kkProfiling: {
          "youth-1": {
            firstName: "Jerome Angelo",
            middleName: "Dela Cruz",
            lastName: "Alison",
            email: "qjadcalison@tip.edu.ph",
            youthAgeGroup: "Core Youth",
            documentsSubmitted: true,
            submittedAt: "2026-05-09T16:04:15.105Z",
            status: "rejected",
            verified: false,
            verificationQueueStatus: "rejected",
            verificationRejectReason: "reject",
            digitalIdStatus: "active",
            digitalIdGeneratedAt: "2026-05-09T16:12:00.000Z",
            digitalIdApprovedAt: "2026-05-09T16:16:42.306Z",
          },
        },
        documents: {
          "doc-1": {
            profileId: "youth-1",
            documentType: "proof_of_voter_registration",
            reviewStatus: "approved",
            uploadedAt: "2026-05-09T16:04:11.050Z",
          },
          "doc-2": {
            profileId: "youth-1",
            documentType: "valid_government_id",
            reviewStatus: "approved",
            uploadedAt: "2026-05-09T16:04:12.644Z",
          },
          "doc-3": {
            profileId: "youth-1",
            documentType: "id_photo",
            reviewStatus: "approved",
            uploadedAt: "2026-05-09T16:04:14.898Z",
          },
        },
      });

      const adminService = await loadAdminService(db);
      const queue = await adminService.getVerificationProfiles({
        search: "qjadcalison@tip.edu.ph",
        pageSize: 10,
      });

      assert.equal(queue.pagination.total, 1);
      assert.equal(queue.profiles[0].userId, "youth-1");
      assert.equal(queue.profiles[0].queueStatus, "rejected");
      assert.equal(queue.profiles[0].digitalIdStatus, "active");
    },
  },
  {
    name: "re-uploading rejected verification documents clears a stale active Digital ID",
    async run() {
      const notifications = [];
      const db = new FakeFirestore({
        users: {
          "youth-1": {
            role: "youth",
            UserName: "Jerome Angelo Alison",
            email: "qjadcalison@tip.edu.ph",
          },
        },
        kkProfiling: {
          "youth-1": {
            firstName: "Jerome Angelo",
            lastName: "Alison",
            email: "qjadcalison@tip.edu.ph",
            youthAgeGroup: "Core Youth",
            status: "rejected",
            verified: false,
            verificationQueueStatus: "rejected",
            digitalIdStatus: "active",
            digitalIdGeneratedAt: "2026-05-09T16:12:00.000Z",
            digitalIdApprovedAt: "2026-05-09T16:16:42.306Z",
            digitalIdEmergencyContactName: "Wanda Rodrigaso",
            digitalIdEmergencyContactRelationship: "Mother",
            digitalIdEmergencyContactPhone: "09125485424",
          },
        },
        documents: {
          "doc-1": {
            profileId: "youth-1",
            documentType: "proof_of_voter_registration",
            reviewStatus: "approved",
            uploadedAt: "2026-05-09T16:04:11.050Z",
          },
          "doc-2": {
            profileId: "youth-1",
            documentType: "valid_government_id",
            reviewStatus: "approved",
            uploadedAt: "2026-05-09T16:04:12.644Z",
          },
          "doc-3": {
            profileId: "youth-1",
            documentType: "id_photo",
            reviewStatus: "approved",
            uploadedAt: "2026-05-09T16:04:14.898Z",
          },
        },
      });

      const digitalIdService = await loadDigitalIdService(db, notifications);
      await digitalIdService.uploadDocument(
        "youth-1",
        "id_photo",
        "https://cdn.example.com/replacement-id-photo.png"
      );

      const profile = db.getDocData("kkProfiling", "youth-1");
      assert.equal(profile.status, "pending");
      assert.equal(profile.verified, false);
      assert.equal(profile.verificationQueueStatus, "pending");
      assert.equal(profile.digitalIdStatus, "draft");
      assert.equal(profile.digitalIdApprovalRequestedAt, null);
      assert.equal(profile.verificationReferredToSuperadminAt, null);
      assert.equal(notifications.length, 1);
      assert.deepEqual(notifications[0].roles, ["admin", "superadmin"]);
    },
  },
  {
    name: "rejecting a verification clears active Digital ID issuance state",
    async run() {
      const db = new FakeFirestore({
        users: {
          "youth-1": {
            role: "youth",
            UserName: "Jerome Angelo Alison",
            email: "qjadcalison@tip.edu.ph",
          },
        },
        kkProfiling: {
          "youth-1": {
            firstName: "Jerome Angelo",
            lastName: "Alison",
            email: "qjadcalison@tip.edu.ph",
            youthAgeGroup: "Core Youth",
            documentsSubmitted: true,
            status: "verified",
            verified: true,
            verificationQueueStatus: "verified",
            verificationDocumentsApprovedAt: "2026-05-09T16:10:28.375Z",
            verificationDocumentsApprovedBy: "admin@kk.local",
            verificationReferredToSuperadminAt: "2026-05-09T16:10:40.450Z",
            verificationReferredToSuperadminBy: "admin@kk.local",
            digitalIdApprovalRequestedAt: "2026-05-09T16:10:40.450Z",
            digitalIdApprovalRequestedBy: "admin@kk.local",
            digitalIdStatus: "active",
            digitalIdApprovedAt: "2026-05-09T16:16:42.306Z",
          },
        },
        documents: {
          "doc-1": {
            profileId: "youth-1",
            documentType: "proof_of_voter_registration",
            reviewStatus: "approved",
            uploadedAt: "2026-05-09T16:04:11.050Z",
          },
          "doc-2": {
            profileId: "youth-1",
            documentType: "valid_government_id",
            reviewStatus: "approved",
            uploadedAt: "2026-05-09T16:04:12.644Z",
          },
          "doc-3": {
            profileId: "youth-1",
            documentType: "id_photo",
            reviewStatus: "approved",
            uploadedAt: "2026-05-09T16:04:14.898Z",
          },
        },
      });

      const adminService = await loadAdminService(db, []);
      await adminService.rejectVerification(
        "youth-1",
        "admin@kk.local",
        "Unable to validate submitted information.",
        "Please submit updated documents."
      );

      const profile = db.getDocData("kkProfiling", "youth-1");
      assert.equal(profile.status, "rejected");
      assert.equal(profile.verified, false);
      assert.equal(profile.digitalIdStatus, "draft");
      assert.equal(profile.digitalIdApprovalRequestedAt, null);
      assert.equal(profile.verificationReferredToSuperadminAt, null);
      assert.equal(profile.verificationDocumentsApprovedAt, null);
    },
  },
  {
    name: "digital ID issuance moves the verification queue from pending superadmin to verified",
    async run() {
      const db = new FakeFirestore({
        users: {
          "youth-1": {
            role: "youth",
            UserName: "Angeline Flores",
            email: "angeline@example.com",
          },
        },
        kkProfiling: {
          "youth-1": {
            firstName: "Angeline",
            lastName: "Flores",
            email: "angeline@example.com",
            youthAgeGroup: "Core Youth",
            documentsSubmitted: true,
            submittedAt: "2026-05-06T04:01:37.000Z",
            status: "verified",
            verified: true,
            verifiedAt: "2026-05-06T04:10:00.000Z",
            verificationQueueStatus: "pending_superadmin_id_generation",
            verificationDocumentsApprovedAt: "2026-05-06T04:10:00.000Z",
            verificationDocumentsApprovedBy: "admin@kk.local",
            verificationReferredToSuperadminAt: "2026-05-06T04:11:00.000Z",
            verificationReferredToSuperadminBy: "admin@kk.local",
            digitalIdApprovalRequestedAt: "2026-05-06T04:11:00.000Z",
            digitalIdApprovalRequestedBy: "admin@kk.local",
            digitalIdStatus: "pending_approval",
            digitalIdEmergencyContactName: "Maria Flores",
            digitalIdEmergencyContactRelationship: "Mother",
            digitalIdEmergencyContactPhone: "09171234567",
            digitalIdSignatureUrl: "https://cdn.example.com/signature.png",
          },
        },
        documents: {
          "doc-1": {
            profileId: "youth-1",
            documentType: "proof_of_voter_registration",
            reviewStatus: "approved",
            uploadedAt: "2026-05-06T04:00:00.000Z",
          },
          "doc-2": {
            profileId: "youth-1",
            documentType: "valid_government_id",
            reviewStatus: "approved",
            uploadedAt: "2026-05-06T04:00:01.000Z",
          },
          "doc-3": {
            profileId: "youth-1",
            documentType: "id_photo",
            reviewStatus: "approved",
            uploadedAt: "2026-05-06T04:00:02.000Z",
          },
        },
      });

      const adminService = await loadAdminService(db);
      const before = await adminService.getVerificationProfiles({ pageSize: 10 });

      assert.equal(before.profiles[0].queueStatus, "pending_superadmin_id_generation");

      await adminService.approveDigitalId("youth-1", "superadmin@kk.local");

      const storedProfile = db.getDocData("kkProfiling", "youth-1");
      assert.equal(storedProfile.status, "verified");
      assert.equal(storedProfile.verificationQueueStatus, "verified");
      assert.equal(storedProfile.digitalIdStatus, "active");
      assert.equal(storedProfile.verificationLastAction, "digital_id_issued");
      assert.equal(
        storedProfile.verificationReferredToSuperadminAt,
        "2026-05-06T04:11:00.000Z"
      );

      const after = await adminService.getVerificationProfiles({ pageSize: 10 });
      assert.equal(after.profiles.length, 0);
      assert.equal(after.summary.pendingSuperadmin, 0);

      const generatedArchive = await adminService.getVerificationProfiles({
        pageSize: 10,
        status: "verified",
      });
      assert.equal(generatedArchive.profiles[0].queueStatus, "verified");
      assert.equal(generatedArchive.profiles[0].digitalIdStatus, "active");

      const detail = await adminService.getVerificationProfile("youth-1");
      assert.equal(detail.queueStatus, "verified");
      assert.equal(detail.digitalIdStatus, "active");
    },
  },
  {
    name: "physical ID requests created by youth remain visible in the admin queue when default all-filters are used",
    async run() {
      const db = new FakeFirestore({
        kkProfiling: {
          "youth-1": {
            firstName: "Jerome Angelo",
            lastName: "Alison",
            barangay: "Bagong Ilog",
            purok: "Ilaya",
            status: "verified",
            verified: true,
            digitalIdStatus: "active",
            digitalIdGeneratedAt: "2026-05-10T02:00:00.000Z",
            digitalIdApprovedAt: "2026-05-10T02:10:00.000Z",
            idNumber: "KKB-2026-JG22",
          },
        },
        users: {
          "youth-1": {
            UserName: "Jerome Angelo Dela Cruz Alison",
            email: "jerome@example.com",
          },
        },
      });

      const physicalIdRequestsService = await loadPhysicalIdRequestsService(db);

      const created = await physicalIdRequestsService.createPhysicalIdRequest("youth-1", {
        reason: "My current Digital ID is damaged.",
        contactNumber: "09123456789",
        notes: "Requesting one replacement copy for pick-up.",
      });

      assert.equal(created.status, "pending");
      assert.equal(created.purok, "Ilaya");
      assert.equal(db.listDocData("physicalIdRequests").length, 1);

      const queue = await physicalIdRequestsService.listPhysicalIdRequestsForAdmin({
        status: "all",
        purok: "all",
        page: 1,
        pageSize: 10,
      });

      assert.equal(queue.requests.length, 1);
      assert.equal(queue.summary.total, 1);
      assert.equal(queue.summary.pending, 1);
      assert.equal(queue.requests[0].id, created.id);
      assert.equal(queue.requests[0].purok, "Ilaya");
      assert.deepEqual(queue.filters.purokOptions, ["Ilaya"]);

      const filteredQueue = await physicalIdRequestsService.listPhysicalIdRequestsForAdmin({
        status: "all",
        purok: "Ilaya",
        page: 1,
        pageSize: 10,
      });

      assert.equal(filteredQueue.requests.length, 1);
    },
  },
  {
    name: "reports integration returns demographic, employment, civic, and month-sorted profiling analytics",
    async run() {
      const db = new FakeFirestore({
        kkProfiling: {
          "youth-1": {
            youthAgeGroup: "Core Youth",
            status: "verified",
            educationalBackground: "College Graduate",
            gender: "Male",
            barangay: "Buting",
            workStatus: "Employed",
            registeredSkVoter: true,
            registeredNationalVoter: true,
            attendedKkAssembly: true,
            csoMemberOrVolunteer: "Yes (Oo)",
            submittedAt: "2026-03-05T08:00:00.000Z",
            verifiedAt: "2026-03-10T08:00:00.000Z",
          },
          "youth-2": {
            youthAgeGroup: "Child Youth",
            status: "pending",
            educationalBackground: "Senior High School Graduate",
            gender: "Female",
            barangay: "Bagong Katipunan",
            currentlyStudyingOrEnrolled: "No (Hindi)",
            employmentStatus: "No, I am currently not employed (Hindi, ako ay kasalukuyang hindi employed)",
            mainReasonNotInSchool: "Employment (Pagtatrabaho o paghahanap ng trabaho kahit hindi pa tapos sa pag-aaral)",
            votedDuring2023BarangayAndSkElections: "No (Hindi)",
            votedDuring2025MidtermAndLocalElections: "No (Hindi)",
            attendedKkAssemblySinceJanuary2024: "No (Hindi)",
            csoMemberOrVolunteer: "No (Hindi)",
            submittedAt: "2026-02-08T08:00:00.000Z",
          },
          "youth-3": {
            youthAgeGroup: "Adult Youth",
            status: "verified",
            educationalBackground: "College Level",
            sexAssignedAtBirth: "Male",
            barangay: "Buting",
            employmentStatus: "No, but I am currently looking for work (Hindi, ngunit ako ay kasalukuyang naghahanap ng trabaho)",
            votedDuring2023BarangayAndSkElections: "Yes (Oo)",
            votedDuring2025MidtermAndLocalElections: "No; I was not eligible to vote yet (Hindi; Hindi pa ako eligible bumoto noon)",
            attendedKkAssemblySinceJanuary2024: "Yes (Oo)",
            csoMemberOrVolunteer: "No (Hindi)",
            submittedAt: "2025-12-12T08:00:00.000Z",
            verifiedAt: "2026-01-05T08:00:00.000Z",
          },
        },
        merchants: {
          "merchant-1": {
            status: "approved",
          },
          "merchant-2": {
            status: "paused",
          },
        },
      });

      const adminService = await loadAdminService(db);
      const reports = await adminService.getReports();

      assert.deepEqual(reports.summary, {
        totalRegisteredUsers: 3,
        verifiedUsers: 2,
        pendingVerifications: 1,
        activeMerchants: 1,
        monthlyGrowthPercent: 0,
        surveyCompletionRate: 100,
        verificationRate: 67,
        currentMonthRegistered: 1,
        currentMonthVerified: 1,
        currentMonthLabel: "Mar 2026",
      });

      assert.deepEqual(reports.filters.applied, {
        dateFrom: "",
        dateTo: "",
        barangay: "all",
        ageGroup: "all",
        gender: "all",
        status: "all",
      });

      assert.deepEqual(reports.filters.options, {
        barangays: ["Bagong Katipunan", "Buting"],
        ageGroups: ["Adult Youth", "Child Youth", "Core Youth"],
        genders: ["Female", "Male"],
        statuses: ["pending", "verified"],
      });

      assert.deepEqual(reports.monthlySummary.map((item) => item.month), [
        "Dec 2025",
        "Jan 2026",
        "Feb 2026",
        "Mar 2026",
      ]);

      assert.deepEqual(
        Object.fromEntries(reports.byGender.map((item) => [item.name, item.value])),
        {
          Male: 2,
          Female: 1,
        }
      );

      assert.deepEqual(
        Object.fromEntries(reports.byBarangay.map((item) => [item.name, item.value])),
        {
          Buting: 2,
          "Bagong Katipunan": 1,
        }
      );

      assert.deepEqual(
        Object.fromEntries(reports.byWorkStatus.map((item) => [item.name, item.value])),
        {
          Employed: 1,
          Unemployed: 1,
          "Looking for Work": 1,
        }
      );

      assert.deepEqual(
        Object.fromEntries(reports.byStudyStatus.map((item) => [item.name, item.value])),
        {
          "In-school / enrolled": 0,
          "Out-of-school / not enrolled": 1,
        }
      );

      assert.deepEqual(
        Object.fromEntries(reports.learningPathways.map((item) => [item.name, item.value])),
        {
          "Scholarship-supported": 0,
          "Academic track": 0,
          "TVL or vocational": 0,
          "Business aspirants": 0,
        }
      );

      assert.deepEqual(
        Object.fromEntries(reports.civicEngagement.map((item) => [item.name, item.value])),
        {
          "2023 SK voters": 2,
          "2025 local voters": 1,
          "KK assembly attendees": 2,
          "CSO volunteers": 1,
        }
      );

      assert.deepEqual(
        reports.outOfSchoolReasons.map((item) => item.name),
        ["Employment (Pagtatrabaho o paghahanap ng trabaho kahit hindi pa tapos sa pag-aaral)"]
      );

      const filteredReports = await adminService.getReports({
        barangay: "Buting",
        status: "verified",
      });

      assert.deepEqual(filteredReports.summary, {
        totalRegisteredUsers: 2,
        verifiedUsers: 2,
        pendingVerifications: 0,
        activeMerchants: 1,
        monthlyGrowthPercent: 100,
        surveyCompletionRate: 100,
        verificationRate: 100,
        currentMonthRegistered: 1,
        currentMonthVerified: 1,
        currentMonthLabel: "Mar 2026",
      });

      assert.deepEqual(
        Object.fromEntries(filteredReports.byBarangay.map((item) => [item.name, item.value])),
        {
          Buting: 2,
        }
      );
    },
  },
];

(async () => {
  let passed = 0;

  for (const entry of tests) {
    try {
      await entry.run();
      passed += 1;
      console.log(`PASS ${entry.name}`);
    } catch (error) {
      console.error(`FAIL ${entry.name}`);
      console.error(error);
      process.exitCode = 1;
    }
  }

  if (!process.exitCode) {
    console.log(`\n${passed}/${tests.length} backend integration tests passed.`);
  }
})();
