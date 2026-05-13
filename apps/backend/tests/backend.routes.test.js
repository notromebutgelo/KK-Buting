const assert = require("node:assert/strict");

const {
  loadDistModuleWithMocks,
  requestJson,
  withExpressServer,
} = require("./test-utils");

function createVerifyTokenMock() {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    req.user = {
      uid: req.headers["x-test-uid"] || "user-1",
      email: req.headers["x-test-email"] || "user@example.com",
      role: req.headers["x-test-role"] || "youth",
    };
    next();
  };
}

const tests = [
  {
    name: "notifications routes return notifications and mark them read",
    async run() {
      const serviceCalls = [];
      const router = loadDistModuleWithMocks(
        "dist/src/modules/notifications/notifications.routes",
        {
          "dist/src/middleware/verifyToken": {
            verifyToken: createVerifyTokenMock(),
          },
          "dist/src/modules/notifications/notifications.service": {
            listNotificationsForUser: async (uid) => {
              serviceCalls.push(["list", uid]);
              return [{ id: "notif-1", title: "Hello", read: false }];
            },
            markNotificationRead: async (notificationId, uid) => {
              serviceCalls.push(["mark-one", notificationId, uid]);
              return { id: notificationId, read: true };
            },
            markAllNotificationsRead: async (uid) => {
              serviceCalls.push(["mark", uid]);
              return { updated: 1 };
            },
          },
        }
      ).default;

      await withExpressServer(router, async (baseUrl) => {
        const listResponse = await requestJson(baseUrl, "/me", {
          headers: {
            Authorization: "Bearer test-token",
            "x-test-uid": "user-42",
          },
        });
        assert.equal(listResponse.status, 200);
        assert.deepEqual(listResponse.body, {
          notifications: [{ id: "notif-1", title: "Hello", read: false }],
        });

        const markResponse = await requestJson(baseUrl, "/me/read-all", {
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "x-test-uid": "user-42",
          },
        });
        assert.equal(markResponse.status, 200);
        assert.deepEqual(markResponse.body, {
          message: "Notifications marked as read",
          updated: 1,
        });

        const singleMarkResponse = await requestJson(baseUrl, "/notif-1/read", {
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "x-test-uid": "user-42",
          },
        });
        assert.equal(singleMarkResponse.status, 200);
        assert.deepEqual(singleMarkResponse.body, {
          message: "Notification marked as read",
          notification: { id: "notif-1", read: true },
        });
      });

      assert.deepEqual(serviceCalls, [
        ["list", "user-42"],
        ["mark", "user-42"],
        ["mark-one", "notif-1", "user-42"],
      ]);
    },
  },
  {
    name: "notifications routes reject unauthenticated requests",
    async run() {
      const router = loadDistModuleWithMocks(
        "dist/src/modules/notifications/notifications.routes",
        {
          "dist/src/middleware/verifyToken": {
            verifyToken: createVerifyTokenMock(),
          },
        }
      ).default;

      await withExpressServer(router, async (baseUrl) => {
        const response = await requestJson(baseUrl, "/me");
        assert.equal(response.status, 401);
        assert.deepEqual(response.body, {
          error: "Unauthorized: No token provided",
        });
      });
    },
  },
  {
    name: "qr redeem route validates role, required fields, and success payload",
    async run() {
      const calls = [];
      const router = loadDistModuleWithMocks("dist/src/modules/qr/qr.routes", {
        "dist/src/middleware/verifyToken": {
          verifyToken: createVerifyTokenMock(),
        },
        "dist/src/modules/qr/qr.service": {
          generateUserQr: async () => "token",
          processQrScan: async () => ({}),
          processQrRedeem: async (token, uid, amountSpent) => {
            calls.push({ token, uid, amountSpent });
            return {
              userId: "youth-1",
              userName: "Juan Dela Cruz",
              memberId: "KK-001",
              merchantId: "merchant-1",
              merchantName: "Cafe Buting",
              amountSpent,
              pointsRate: 10,
              pointsAwarded: 9,
            };
          },
        },
      }).default;

      await withExpressServer(router, async (baseUrl) => {
        const forbidden = await requestJson(baseUrl, "/redeem", {
          method: "POST",
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "youth",
          },
          body: { token: "signed-token", amountSpent: 95 },
        });
        assert.equal(forbidden.status, 403);
        assert.deepEqual(forbidden.body, {
          error: "Forbidden: Insufficient permissions",
        });

        const missingToken = await requestJson(baseUrl, "/redeem", {
          method: "POST",
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "merchant",
          },
          body: { amountSpent: 95 },
        });
        assert.equal(missingToken.status, 400);
        assert.equal(missingToken.body.error, "Invalid request payload.");
        assert.ok(missingToken.body.details.includes("Either token or qrData is required."));

        const success = await requestJson(baseUrl, "/redeem", {
          method: "POST",
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "merchant",
            "x-test-uid": "merchant-owner-1",
          },
          body: { token: "signed-token", amountSpent: 95 },
        });
        assert.equal(success.status, 200);
        assert.deepEqual(success.body, {
          userId: "youth-1",
          userName: "Juan Dela Cruz",
          memberId: "KK-001",
          merchantId: "merchant-1",
          merchantName: "Cafe Buting",
          amountSpent: 95,
          pointsRate: 10,
          pointsAwarded: 9,
        });
      });

      assert.deepEqual(calls, [
        {
          token: "signed-token",
          uid: "merchant-owner-1",
          amountSpent: 95,
        },
      ]);
    },
  },
  {
    name: "rewards routes enforce youth role and return expected response envelopes",
    async run() {
      const calls = [];
      const router = loadDistModuleWithMocks("dist/src/modules/rewards/rewards.routes", {
        "dist/src/middleware/verifyToken": {
          verifyToken: createVerifyTokenMock(),
        },
        "dist/src/modules/rewards/rewards.service": {
          listPublicRewards: async (filters) => {
            calls.push(["list", filters]);
            return [{ id: "reward-1", title: "Free Drink" }];
          },
          getPublicReward: async (rewardId) => {
            calls.push(["get", rewardId]);
            return { id: rewardId, title: "Free Drink" };
          },
          redeemPublicReward: async (uid, rewardId) => {
            calls.push(["redeem", uid, rewardId]);
            return { id: "tx-1", rewardId, status: "active" };
          },
          listMyRewardRedemptions: async (uid, status) => {
            calls.push(["redemptions", uid, status]);
            return [{ id: "tx-1", status: status || "active" }];
          },
        },
      }).default;

      await withExpressServer(router, async (baseUrl) => {
        const forbidden = await requestJson(baseUrl, "/", {
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "merchant",
          },
        });
        assert.equal(forbidden.status, 403);
        assert.deepEqual(forbidden.body, {
          error: "Forbidden: Insufficient permissions",
        });

        const listResponse = await requestJson(baseUrl, "/?category=food&search=drink", {
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "youth",
          },
        });
        assert.equal(listResponse.status, 200);
        assert.deepEqual(listResponse.body, {
          rewards: [{ id: "reward-1", title: "Free Drink" }],
        });

        const redeemResponse = await requestJson(baseUrl, "/reward-1/redeem", {
          method: "POST",
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "youth",
            "x-test-uid": "youth-1",
          },
        });
        assert.equal(redeemResponse.status, 200);
        assert.deepEqual(redeemResponse.body, {
          message: "Reward redeemed",
          redemption: { id: "tx-1", rewardId: "reward-1", status: "active" },
        });

        const redemptionsResponse = await requestJson(baseUrl, "/my-redemptions?status=claimed", {
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "youth",
            "x-test-uid": "youth-1",
          },
        });
        assert.equal(redemptionsResponse.status, 200);
        assert.deepEqual(redemptionsResponse.body, {
          redemptions: [{ id: "tx-1", status: "claimed" }],
        });
      });

      assert.deepEqual(calls, [
        ["list", { category: "food", merchantId: undefined, search: "drink" }],
        ["redeem", "youth-1", "reward-1"],
        ["redemptions", "youth-1", "claimed"],
      ]);
    },
  },
  {
    name: "promotions routes reject malformed create payloads before controller execution",
    async run() {
      let controllerCalled = false;
      const router = loadDistModuleWithMocks("dist/src/modules/promotions/promotions.routes", {
        "dist/src/middleware/verifyToken": {
          verifyToken: createVerifyTokenMock(),
        },
        "dist/src/modules/promotions/promotions.controller": {
          handleCreatePromotion: async (_req, res) => {
            controllerCalled = true;
            res.status(201).json({ promotion: { id: "promo-1" } });
          },
          handleDeletePromotion: async (_req, res) => res.json({ deleted: true }),
          handleGetPromotion: async (_req, res) => res.json({ promotion: { id: "promo-1" } }),
          handleListPromotions: async (_req, res) => res.json({ promotions: [] }),
          handleListPromotionsByMerchant: async (_req, res) => res.json({ promotions: [] }),
          handleReviewPromotion: async (_req, res) => res.json({ promotion: { id: "promo-1" } }),
          handleUpdatePromotion: async (_req, res) => res.json({ promotion: { id: "promo-1" } }),
        },
      }).default;

      await withExpressServer(router, async (baseUrl) => {
        const invalid = await requestJson(baseUrl, "/", {
          method: "POST",
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "merchant",
          },
          body: {
            description: "Short promo copy",
            type: "discount",
            value: 10,
          },
        });

        assert.equal(invalid.status, 400);
        assert.equal(invalid.body.error, "Invalid request payload.");
        assert.ok(Array.isArray(invalid.body.details));
        assert.ok(invalid.body.details.includes("title is required."));
      });

      assert.equal(controllerCalled, false);
    },
  },
  {
    name: "admin merchant creation rejects invalid email payloads before controller execution",
    async run() {
      let controllerCalled = false;
      const router = loadDistModuleWithMocks("dist/src/modules/admin/admin.routes", {
        "dist/src/middleware/verifyToken": {
          verifyToken: createVerifyTokenMock(),
        },
        "dist/src/modules/admin/admin.controller": {
          getDashboard: async (_req, res) => res.json({}),
          listVerificationProfiles: async (_req, res) => res.json({ profiles: [] }),
          getVerificationProfileHandler: async (_req, res) => res.json({ profile: {} }),
          approveVerificationHandler: async (_req, res) => res.json({ message: "ok" }),
          rejectVerificationHandler: async (_req, res) => res.json({ message: "ok" }),
          reviewVerificationDocumentHandler: async (_req, res) => res.json({ message: "ok" }),
          requestVerificationResubmissionHandler: async (_req, res) => res.json({ message: "ok" }),
          bulkApproveVerificationHandler: async (_req, res) => res.json({ approved: 1 }),
          listRewards: async (_req, res) => res.json({ rewards: [] }),
          addReward: async (_req, res) => res.status(201).json({ id: "reward-1" }),
          updateRewardHandler: async (_req, res) => res.json({ message: "ok" }),
          listRewardRedemptionsHandler: async (_req, res) => res.json({ redemptions: [] }),
          markRewardRedemptionClaimedHandler: async (_req, res) => res.json({ message: "ok" }),
          listMerchants: async (_req, res) => res.json({ merchants: [] }),
          getMerchantHandler: async (_req, res) => res.json({ merchant: {} }),
          listPendingMerchants: async (_req, res) => res.json({ merchants: [] }),
          approveMerchantHandler: async (_req, res) => res.json({ message: "ok" }),
          updateMerchantHandler: async (_req, res) => res.json({ message: "ok" }),
          updateMerchantStatusHandler: async (_req, res) => res.json({ message: "ok" }),
          listMerchantTransactionsHandler: async (_req, res) => res.json({ transactions: [] }),
          getPointsTransactionsOverviewHandler: async (_req, res) => res.json({ transactions: [] }),
          updatePointsConversionRateHandler: async (_req, res) => res.json({ message: "ok" }),
          listYouth: async (_req, res) => res.json({ users: [] }),
          getYouthHandler: async (_req, res) => res.json({ user: {} }),
          updateYouthProfileHandler: async (_req, res) => res.json({ message: "ok" }),
          updateYouthStatusHandler: async (_req, res) => res.json({ message: "ok" }),
          archiveYouthHandler: async (_req, res) => res.json({ message: "ok" }),
          adjustYouthPointsHandler: async (_req, res) => res.json({ message: "ok" }),
          listDigitalIds: async (_req, res) => res.json({ members: [] }),
          getDigitalIdMemberHandler: async (_req, res) => res.json({ member: {} }),
          generateDigitalIdHandler: async (_req, res) => res.status(201).json({ memberId: "user-1" }),
          submitDigitalIdForApprovalHandler: async (_req, res) => res.json({ message: "ok" }),
          approveDigitalIdHandler: async (_req, res) => res.json({ message: "ok" }),
          deactivateDigitalIdHandler: async (_req, res) => res.json({ message: "ok" }),
          regenerateDigitalIdHandler: async (_req, res) => res.json({ memberId: "user-1" }),
          listPhysicalIdRequestsHandler: async (_req, res) => res.json({ requests: [] }),
          getPhysicalIdRequestHandler: async (_req, res) => res.json({ request: {} }),
          updatePhysicalIdRequestHandler: async (_req, res) => res.json({ message: "ok", request: {} }),
          getReportsHandler: async (_req, res) => res.json({}),
          createMerchantAccountHandler: async (_req, res) => {
            controllerCalled = true;
            res.status(201).json({ merchant: { merchantId: "merchant-1" } });
          },
        },
      }).default;

      await withExpressServer(router, async (baseUrl) => {
        const invalid = await requestJson(baseUrl, "/merchants/create", {
          method: "POST",
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "superadmin",
          },
          body: {
            name: "Cafe Buting",
            email: "not-an-email",
            password: "temp-pass-123",
          },
        });

        assert.equal(invalid.status, 400);
        assert.equal(invalid.body.error, "Invalid request payload.");
        assert.ok(invalid.body.details.includes("email must be a valid email address."));
      });

      assert.equal(controllerCalled, false);
    },
  },
  {
    name: "admin document review route returns the review success payload",
    async run() {
      const calls = [];
      const router = loadDistModuleWithMocks("dist/src/modules/admin/admin.routes", {
        "dist/src/middleware/verifyToken": {
          verifyToken: createVerifyTokenMock(),
        },
        "dist/src/modules/admin/admin.controller": {
          getDashboard: async (_req, res) => res.json({}),
          listVerificationProfiles: async (_req, res) => res.json({ profiles: [] }),
          getVerificationProfileHandler: async (_req, res) => res.json({ profile: {} }),
          approveVerificationHandler: async (_req, res) => res.json({ message: "ok" }),
          rejectVerificationHandler: async (_req, res) => res.json({ message: "ok" }),
          reviewVerificationDocumentHandler: async (req, res) => {
            calls.push({
              userId: req.params.userId,
              documentId: req.params.documentId,
              action: req.body.action,
              note: req.body.note,
            });
            res.json({
              message: "Document review updated",
              review: {
                userId: req.params.userId,
                documentId: req.params.documentId,
                action: req.body.action,
                note: req.body.note,
              },
            });
          },
          requestVerificationResubmissionHandler: async (_req, res) => res.json({ message: "ok" }),
          bulkApproveVerificationHandler: async (_req, res) => res.json({ approved: 1 }),
          listRewards: async (_req, res) => res.json({ rewards: [] }),
          addReward: async (_req, res) => res.status(201).json({ id: "reward-1" }),
          updateRewardHandler: async (_req, res) => res.json({ message: "ok" }),
          listRewardRedemptionsHandler: async (_req, res) => res.json({ redemptions: [] }),
          markRewardRedemptionClaimedHandler: async (_req, res) => res.json({ message: "ok" }),
          listMerchants: async (_req, res) => res.json({ merchants: [] }),
          getMerchantHandler: async (_req, res) => res.json({ merchant: {} }),
          listPendingMerchants: async (_req, res) => res.json({ merchants: [] }),
          approveMerchantHandler: async (_req, res) => res.json({ message: "ok" }),
          updateMerchantHandler: async (_req, res) => res.json({ message: "ok" }),
          updateMerchantStatusHandler: async (_req, res) => res.json({ message: "ok" }),
          listMerchantTransactionsHandler: async (_req, res) => res.json({ transactions: [] }),
          getPointsTransactionsOverviewHandler: async (_req, res) => res.json({ transactions: [] }),
          updatePointsConversionRateHandler: async (_req, res) => res.json({ message: "ok" }),
          listYouth: async (_req, res) => res.json({ users: [] }),
          getYouthHandler: async (_req, res) => res.json({ user: {} }),
          updateYouthProfileHandler: async (_req, res) => res.json({ message: "ok" }),
          updateYouthStatusHandler: async (_req, res) => res.json({ message: "ok" }),
          archiveYouthHandler: async (_req, res) => res.json({ message: "ok" }),
          adjustYouthPointsHandler: async (_req, res) => res.json({ message: "ok" }),
          listDigitalIds: async (_req, res) => res.json({ members: [] }),
          getDigitalIdMemberHandler: async (_req, res) => res.json({ member: {} }),
          generateDigitalIdHandler: async (_req, res) => res.status(201).json({ memberId: "user-1" }),
          submitDigitalIdForApprovalHandler: async (_req, res) => res.json({ message: "ok" }),
          approveDigitalIdHandler: async (_req, res) => res.json({ message: "ok" }),
          deactivateDigitalIdHandler: async (_req, res) => res.json({ message: "ok" }),
          regenerateDigitalIdHandler: async (_req, res) => res.json({ memberId: "user-1" }),
          listPhysicalIdRequestsHandler: async (_req, res) => res.json({ requests: [] }),
          getPhysicalIdRequestHandler: async (_req, res) => res.json({ request: {} }),
          updatePhysicalIdRequestHandler: async (_req, res) => res.json({ message: "ok", request: {} }),
          getReportsHandler: async (_req, res) => res.json({}),
          createMerchantAccountHandler: async (_req, res) => res.status(201).json({ merchant: { merchantId: "merchant-1" } }),
        },
      }).default;

      await withExpressServer(router, async (baseUrl) => {
        const response = await requestJson(baseUrl, "/verification/user-1/documents/doc-1/review", {
          method: "PATCH",
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "admin",
            "x-test-email": "admin@example.com",
          },
          body: {
            action: "approved",
            note: "Looks good",
          },
        });

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, {
          message: "Document review updated",
          review: {
            userId: "user-1",
            documentId: "doc-1",
            action: "approved",
            note: "Looks good",
          },
        });
      });

      assert.deepEqual(calls, [
        {
          userId: "user-1",
          documentId: "doc-1",
          action: "approved",
          note: "Looks good",
        },
      ]);
    },
  },
  {
    name: "merchant profile update accepts text terms and conditions payloads",
    async run() {
      let controllerCalled = false;
      const roleGuard = (requiredRole) => (req, res, next) => {
        if (req.user?.role !== requiredRole) {
          return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        }
        next();
      };

      const router = loadDistModuleWithMocks("dist/src/modules/merchants/merchants.routes", {
        "dist/src/middleware/verifyToken": {
          verifyToken: createVerifyTokenMock(),
        },
        "dist/src/middleware/requireRole": {
          requireRole: roleGuard,
        },
        "dist/src/modules/merchants/merchants.controller": {
          listMerchants: async (_req, res) => res.json({ merchants: [] }),
          getMerchant: async (_req, res) => res.json({ merchant: {} }),
          registerMerchant: async (_req, res) => res.status(201).json({ merchantId: "merchant-1" }),
          getMyMerchant: async (_req, res) => res.json({ merchant: {} }),
          updateMyMerchant: async (req, res) => {
            controllerCalled = true;
            res.json({ merchant: req.body });
          },
          uploadMyMerchantAsset: async (_req, res) => res.json({ fileUrl: "https://example.com/logo.jpg" }),
          listMyMerchantTransactions: async (_req, res) => res.json({ transactions: [] }),
          listMyMerchantPromotions: async (_req, res) => res.json({ promotions: [] }),
          createMyMerchantPromotion: async (_req, res) => res.status(201).json({ promotion: { id: "promo-1" } }),
          updateMyMerchantPromotion: async (_req, res) => res.json({ promotion: { id: "promo-1" } }),
          deleteMyMerchantPromotion: async (_req, res) => res.json({ deleted: true }),
          listMyMerchantProducts: async (_req, res) => res.json({ products: [] }),
          createMyMerchantProduct: async (_req, res) => res.status(201).json({ product: { id: "product-1" } }),
          updateMyMerchantProduct: async (_req, res) => res.json({ product: { id: "product-1" } }),
          deleteMyMerchantProduct: async (_req, res) => res.json({ deleted: true }),
        },
      }).default;

      await withExpressServer(router, async (baseUrl) => {
        const response = await requestJson(baseUrl, "/me", {
          method: "PATCH",
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "merchant",
          },
          body: {
            businessName: "Cafe Buting",
            shortDescription: "Friendly neighborhood drinks and snacks.",
            termsAndConditions: "Present your youth QR before checkout.\nPromo cannot be combined with other offers.",
          },
        });

        assert.equal(response.status, 200);
        assert.equal(response.body.merchant.businessName, "Cafe Buting");
        assert.equal(
          response.body.merchant.termsAndConditions,
          "Present your youth QR before checkout.\nPromo cannot be combined with other offers."
        );
      });

      assert.equal(controllerCalled, true);
    },
  },
  {
    name: "merchant profile update also accepts string-array terms payloads",
    async run() {
      let controllerCalled = false;
      const roleGuard = (requiredRole) => (req, res, next) => {
        if (req.user?.role !== requiredRole) {
          return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        }
        next();
      };

      const router = loadDistModuleWithMocks("dist/src/modules/merchants/merchants.routes", {
        "dist/src/middleware/verifyToken": {
          verifyToken: createVerifyTokenMock(),
        },
        "dist/src/middleware/requireRole": {
          requireRole: roleGuard,
        },
        "dist/src/modules/merchants/merchants.controller": {
          listMerchants: async (_req, res) => res.json({ merchants: [] }),
          getMerchant: async (_req, res) => res.json({ merchant: {} }),
          registerMerchant: async (_req, res) => res.status(201).json({ merchantId: "merchant-1" }),
          getMyMerchant: async (_req, res) => res.json({ merchant: {} }),
          updateMyMerchant: async (req, res) => {
            controllerCalled = true;
            res.json({ merchant: req.body });
          },
          uploadMyMerchantAsset: async (_req, res) => res.json({ fileUrl: "https://example.com/logo.jpg" }),
          listMyMerchantTransactions: async (_req, res) => res.json({ transactions: [] }),
          listMyMerchantPromotions: async (_req, res) => res.json({ promotions: [] }),
          createMyMerchantPromotion: async (_req, res) => res.status(201).json({ promotion: { id: "promo-1" } }),
          updateMyMerchantPromotion: async (_req, res) => res.json({ promotion: { id: "promo-1" } }),
          deleteMyMerchantPromotion: async (_req, res) => res.json({ deleted: true }),
          listMyMerchantProducts: async (_req, res) => res.json({ products: [] }),
          createMyMerchantProduct: async (_req, res) => res.status(201).json({ product: { id: "product-1" } }),
          updateMyMerchantProduct: async (_req, res) => res.json({ product: { id: "product-1" } }),
          deleteMyMerchantProduct: async (_req, res) => res.json({ deleted: true }),
        },
      }).default;

      await withExpressServer(router, async (baseUrl) => {
        const response = await requestJson(baseUrl, "/me", {
          method: "PATCH",
          headers: {
            Authorization: "Bearer token",
            "x-test-role": "merchant",
          },
          body: {
            businessName: "Cafe Buting",
            termsAndConditions: ["Present your youth QR before checkout.", "Promo cannot be combined with other offers."],
          },
        });

        assert.equal(response.status, 200);
        assert.deepEqual(response.body.merchant.termsAndConditions, [
          "Present your youth QR before checkout.",
          "Promo cannot be combined with other offers.",
        ]);
      });

      assert.equal(controllerCalled, true);
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
    console.log(`\n${passed}/${tests.length} backend route tests passed.`);
  }
})();
