const assert = require("node:assert/strict");

const { createDoc, loadDistModuleWithMocks } = require("./test-utils");

const tests = [
  {
    name: "notifications.service creates, lists, and marks notifications as read",
    async run() {
      const notificationDocs = [
        createDoc("n-1", {
          recipientUid: "user-1",
          audience: "youth",
          type: "success",
          title: "Welcome",
          body: "First notification",
          createdAt: "2026-04-28T08:00:00.000Z",
          readAt: null,
        }),
        createDoc("n-2", {
          recipientUid: "user-1",
          audience: "youth",
          type: "transaction",
          title: "Points earned",
          body: "Second notification",
          createdAt: "2026-04-29T08:00:00.000Z",
          readAt: "2026-04-29T09:00:00.000Z",
        }),
      ];

      const state = {
        added: null,
        batchUpdates: [],
        committed: false,
        directUpdates: [],
      };

      const db = {
        collection(name) {
          assert.equal(name, "notifications");
          return {
            add: async (payload) => {
              state.added = payload;
              return { id: "n-3" };
            },
            doc(id) {
              return {
                id,
                async get() {
                  const doc = notificationDocs.find((entry) => entry.id === id);
                  return {
                    exists: Boolean(doc),
                    data: () => (doc ? doc.data() : undefined),
                  };
                },
                async set(payload, options) {
                  state.directUpdates.push({ id, payload, options });
                },
              };
            },
            where(field, operator, value) {
              assert.equal(field, "recipientUid");
              assert.equal(operator, "==");
              return {
                async get() {
                  return {
                    docs: notificationDocs.filter(
                      (doc) => doc.data().recipientUid === value
                    ),
                  };
                },
              };
            },
          };
        },
        batch() {
          return {
            set(ref, payload, options) {
              state.batchUpdates.push({ ref, payload, options });
            },
            async commit() {
              state.committed = true;
            },
          };
        },
      };

      const service = loadDistModuleWithMocks("dist/src/modules/notifications/notifications.service", {
        "dist/src/config/firebase": { db },
      });

      const createdId = await service.createNotification({
        recipientUid: "user-1",
        audience: "youth",
        type: "success",
        title: "Reward redeemed",
        body: "You redeemed a reward.",
        link: "/rewards",
      });
      assert.equal(createdId, "n-3");
      assert.equal(state.added.recipientUid, "user-1");
      assert.equal(state.added.title, "Reward redeemed");
      assert.equal(state.added.link, "/rewards");

      const notifications = await service.listNotificationsForUser("user-1");
      assert.deepEqual(
        notifications.map((entry) => entry.id),
        ["n-2", "n-1"]
      );

      const result = await service.markAllNotificationsRead("user-1");
      assert.deepEqual(result, { updated: 1 });
      assert.equal(state.batchUpdates.length, 1);
      assert.equal(state.batchUpdates[0].ref.id, "n-1");
      assert.equal(state.committed, true);

      const single = await service.markNotificationRead("n-1", "user-1");
      assert.equal(single.id, "n-1");
      assert.equal(single.read, true);
      assert.equal(state.directUpdates.length, 1);
      assert.equal(state.directUpdates[0].id, "n-1");

      const missing = await service.markNotificationRead("missing", "user-1");
      assert.equal(missing, null);
    },
  },
  {
    name: "qr.service awards points for a valid merchant QR redemption",
    async run() {
      const addPointsCalls = [];
      const failureCalls = [];

      const db = {
        collection(name) {
          if (name === "kkProfiling") {
            return {
              doc(id) {
                return {
                  async get() {
                    assert.equal(id, "youth-1");
                    return {
                      data: () => ({
                        digitalIdStatus: "active",
                        digitalIdRevision: 2,
                        idNumber: "KK-001",
                        firstName: "Juan",
                        lastName: "Dela Cruz",
                      }),
                    };
                  },
                };
              },
            };
          }

          if (name === "users") {
            return {
              doc(id) {
                return {
                  async get() {
                    assert.equal(id, "youth-1");
                    return {
                      data: () => ({
                        UserName: "Juan Dela Cruz",
                        email: "juan@example.com",
                      }),
                    };
                  },
                };
              },
            };
          }

          throw new Error(`Unexpected collection ${name}`);
        },
      };

      const service = loadDistModuleWithMocks("dist/src/modules/qr/qr.service", {
        "dist/src/config/firebase": { db },
        "dist/utils/renerateQrToken": {
          generateQrToken: () => "generated-token",
          verifyQrToken: () => ({ userId: "youth-1", revision: 2, timestamp: Date.now() }),
        },
        "dist/src/modules/points/points.service": {
          addPoints: async (...args) => {
            addPointsCalls.push(args);
          },
          logMerchantScanFailure: async (...args) => {
            failureCalls.push(args);
          },
        },
        "dist/src/modules/merchants/merhcants.service": {
          getMerchantByOwnerId: async () => ({
            id: "merchant-1",
            name: "Cafe Buting",
            status: "approved",
            pointsRate: 10,
          }),
        },
      });

      const result = await service.processQrRedeem(
        JSON.stringify({ token: "signed-token" }),
        "owner-1",
        95
      );

      assert.deepEqual(result, {
        userId: "youth-1",
        userName: "Juan Dela Cruz",
        memberId: "KK-001",
        merchantId: "merchant-1",
        merchantName: "Cafe Buting",
        amountSpent: 95,
        pointsRate: 10,
        pointsAwarded: 9,
      });

      assert.deepEqual(addPointsCalls, [
        [
          "youth-1",
          9,
          "merchant-1",
          {
            amountSpent: 95,
            memberId: "KK-001",
            transactionStatus: "success",
            reason: "Merchant QR redeem",
          },
        ],
      ]);
      assert.equal(failureCalls.length, 0);
    },
  },
  {
    name: "qr.service logs a failed scan when QR validation fails after merchant resolution",
    async run() {
      const failureCalls = [];

      const db = {
        collection() {
          return {
            doc() {
              return {
                async get() {
                  return { data: () => ({}) };
                },
              };
            },
          };
        },
      };

      const service = loadDistModuleWithMocks("dist/src/modules/qr/qr.service", {
        "dist/src/config/firebase": { db },
        "dist/utils/renerateQrToken": {
          generateQrToken: () => "generated-token",
          verifyQrToken: () => null,
        },
        "dist/src/modules/points/points.service": {
          addPoints: async () => {
            throw new Error("addPoints should not run");
          },
          logMerchantScanFailure: async (...args) => {
            failureCalls.push(args);
          },
        },
        "dist/src/modules/merchants/merhcants.service": {
          getMerchantByOwnerId: async () => ({
            id: "merchant-1",
            name: "Cafe Buting",
            status: "approved",
            pointsRate: 10,
          }),
        },
      });

      await assert.rejects(
        service.processQrRedeem("bad-token", "owner-1", 100),
        /Invalid or expired QR code/
      );

      assert.deepEqual(failureCalls, [
        [
          "merchant-1",
          {
            amountSpent: 100,
            reason: "Invalid or expired QR code",
          },
        ],
      ]);
    },
  },
  {
    name: "merchants.service updateMerchantProfileByOwner keeps storefront image fallbacks in sync",
    async run() {
      const merchantStore = new Map([
        [
          "merchant-1",
          {
            ownerId: "owner-1",
            status: "approved",
            name: "Cafe Buting",
            businessName: "Cafe Buting",
            imageUrl: "",
            logoUrl: "",
            bannerUrl: "",
            description: "",
            shortDescription: "",
          },
        ],
      ]);

      function createMerchantDocRef(id) {
        return {
          id,
          async get() {
            const data = merchantStore.get(id);
            return {
              exists: Boolean(data),
              id,
              data: () => data,
            };
          },
          async set(payload, options) {
            const current = merchantStore.get(id) || {};
            merchantStore.set(id, options && options.merge ? { ...current, ...payload } : payload);
          },
          collection() {
            return {
              async get() {
                return { docs: [] };
              },
            };
          },
        };
      }

      const db = {
        collection(name) {
          if (name !== "merchants") {
            throw new Error(`Unexpected collection ${name}`);
          }

          return {
            where(field, operator, value) {
              assert.equal(field, "ownerId");
              assert.equal(operator, "==");
              return {
                limit() {
                  return {
                    async get() {
                      const match = [...merchantStore.entries()].find(
                        ([, merchant]) => merchant.ownerId === value
                      );
                      return {
                        empty: !match,
                        docs: match ? [createDoc(match[0], match[1], { ref: createMerchantDocRef(match[0]) })] : [],
                      };
                    },
                  };
                },
              };
            },
            doc(id) {
              return createMerchantDocRef(id);
            },
          };
        },
      };

      const service = loadDistModuleWithMocks("dist/src/modules/merchants/merhcants.service", {
        "dist/src/config/firebase": {
          db,
          storage: {
            bucket: () => ({ name: "kkprofiling-c42b4.firebasestorage.app" }),
          },
        },
        "dist/src/modules/auth/user.service": {
          setUserRole: async () => undefined,
        },
        "dist/src/modules/notifications/notifications.service": {
          createNotification: async () => undefined,
        },
      });

      const updated = await service.updateMerchantProfileByOwner("owner-1", {
        logoUrl: "https://cdn.example.com/logo.png",
        shortDescription: "Fresh local coffee",
      });

      assert.equal(updated.logoUrl, "https://cdn.example.com/logo.png");
      assert.equal(updated.imageUrl, "https://cdn.example.com/logo.png");
      assert.equal(updated.description, "Fresh local coffee");
      assert.equal(updated.shortDescription, "Fresh local coffee");
    },
  },
  {
    name: "rewards.service listMyRewardRedemptions computes statuses and supports filtering",
    async run() {
      const transactions = [
        createDoc("tx-active", {
          userId: "youth-1",
          rewardId: "reward-1",
          rewardTitle: "Free Drink",
          merchantId: "merchant-1",
          merchantName: "Cafe Buting",
          rewardImageUrl: "",
          points: 50,
          type: "redeem",
          redemptionStatus: "active",
          redemptionCode: "KK-ACTIVE",
          createdAt: "2026-04-29T12:00:00.000Z",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }),
        createDoc("tx-claimed", {
          userId: "youth-1",
          rewardId: "reward-2",
          rewardTitle: "Burger Combo",
          merchantId: "merchant-2",
          rewardImageUrl: "",
          points: 80,
          type: "redeem",
          redemptionStatus: "claimed",
          redemptionCode: "KK-CLAIMED",
          createdAt: "2026-04-28T12:00:00.000Z",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }),
        createDoc("tx-expired", {
          userId: "youth-1",
          rewardId: "reward-3",
          rewardTitle: "Movie Ticket",
          merchantId: "merchant-3",
          rewardImageUrl: "",
          points: 120,
          type: "redeem",
          redemptionStatus: "active",
          redemptionCode: "KK-EXPIRED",
          createdAt: "2026-04-27T12:00:00.000Z",
          expiresAt: "2020-01-01T00:00:00.000Z",
        }),
      ];

      const rewards = [
        createDoc("reward-1", { merchantId: "merchant-1", title: "Free Drink" }),
        createDoc("reward-2", { merchantId: "merchant-2", title: "Burger Combo" }),
        createDoc("reward-3", { merchantId: "merchant-3", title: "Movie Ticket" }),
      ];

      const merchants = [
        createDoc("merchant-1", { businessName: "Cafe Buting", logoUrl: "https://cdn/1.png" }),
        createDoc("merchant-2", { businessName: "Buting Burgers", logoUrl: "https://cdn/2.png" }),
        createDoc("merchant-3", { businessName: "Buting Cinema", logoUrl: "https://cdn/3.png" }),
      ];

      const db = {
        collection(name) {
          if (name === "transactions") {
            return {
              where(field, operator, value) {
                assert.equal(field, "userId");
                assert.equal(operator, "==");
                return {
                  async get() {
                    return {
                      docs: transactions.filter((doc) => doc.data().userId === value),
                    };
                  },
                };
              },
            };
          }

          if (name === "rewards") {
            return {
              async get() {
                return { docs: rewards };
              },
            };
          }

          if (name === "merchants") {
            return {
              async get() {
                return { docs: merchants };
              },
            };
          }

          throw new Error(`Unexpected collection ${name}`);
        },
      };

      const service = loadDistModuleWithMocks("dist/src/modules/rewards/rewards.service", {
        "dist/src/config/firebase": { db },
        "dist/src/modules/notifications/notifications.service": {
          createNotification: async () => undefined,
        },
      });

      const all = await service.listMyRewardRedemptions("youth-1");
      assert.deepEqual(
        all.map((entry) => ({ id: entry.id, status: entry.status })),
        [
          { id: "tx-active", status: "active" },
          { id: "tx-claimed", status: "claimed" },
          { id: "tx-expired", status: "expired" },
        ]
      );

      const claimedOnly = await service.listMyRewardRedemptions("youth-1", "claimed");
      assert.deepEqual(
        claimedOnly.map((entry) => entry.id),
        ["tx-claimed"]
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
    console.log(`\n${passed}/${tests.length} backend service tests passed.`);
  }
})();
