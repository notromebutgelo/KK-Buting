const assert = require("node:assert/strict");

const {
  normalizeNotificationRecord,
  sortNotificationsNewestFirst,
} = require("../dist/src/modules/notifications/notifications.helpers");
const {
  assertMerchantCanRedeem,
  extractScanToken,
  getPointsFromAmount,
} = require("../dist/src/modules/qr/qr.helpers");
const {
  buildMerchantPayload,
  getInlineAssetLimit,
  normalizeMerchant,
  normalizeMerchantAssetType,
} = require("../dist/src/modules/merchants/merchants.helpers");
const {
  computeVoucherExpiry,
  resolveRewardRedemptionStatus,
  resolveRewardStatus,
} = require("../dist/src/modules/rewards/rewards.helpers");

const tests = [
  {
    name: "notifications normalize defaults and read state",
    run() {
      const createdAt = new Date("2026-04-29T12:00:00.000Z");
      const readAt = new Date("2026-04-29T13:00:00.000Z");

      const record = normalizeNotificationRecord("notif-1", {
        recipientUid: "user-1",
        title: "Reward redeemed",
        body: "You redeemed a reward.",
        createdAt,
        readAt,
      });

      assert.deepEqual(record, {
        id: "notif-1",
        recipientUid: "user-1",
        audience: "system",
        type: "info",
        title: "Reward redeemed",
        body: "You redeemed a reward.",
        link: null,
        metadata: null,
        read: true,
        readAt: readAt.toISOString(),
        createdAt: createdAt.toISOString(),
      });
    },
  },
  {
    name: "notifications sort newest first",
    run() {
      const sorted = sortNotificationsNewestFirst([
        { id: "old", createdAt: "2026-04-28T09:00:00.000Z" },
        { id: "new", createdAt: "2026-04-29T09:00:00.000Z" },
        { id: "middle", createdAt: "2026-04-28T12:00:00.000Z" },
      ]);

      assert.deepEqual(
        sorted.map((entry) => entry.id),
        ["new", "middle", "old"]
      );
    },
  },
  {
    name: "QR token extraction supports plain and JSON payloads",
    run() {
      assert.equal(extractScanToken("plain-token"), "plain-token");
      assert.equal(
        extractScanToken(JSON.stringify({ token: "signed-token" })),
        "signed-token"
      );
      assert.equal(
        extractScanToken(JSON.stringify({ qrToken: "qr-token" })),
        "qr-token"
      );
    },
  },
  {
    name: "points conversion floors by rate and never returns less than one",
    run() {
      assert.equal(getPointsFromAmount(100, 10), 10);
      assert.equal(getPointsFromAmount(99, 10), 9);
      assert.equal(getPointsFromAmount(5, 10), 1);
      assert.equal(getPointsFromAmount(100, 0), 100);
    },
  },
  {
    name: "merchant QR awarding rejects non-approved merchant states",
    run() {
      assert.throws(
        () => assertMerchantCanRedeem({ status: "pending" }),
        /pending approval/
      );
      assert.throws(
        () => assertMerchantCanRedeem({ status: "suspended" }),
        /suspended/
      );
      assert.throws(
        () => assertMerchantCanRedeem({ status: "rejected" }),
        /not approved/
      );

      const merchant = { id: "merchant-1", status: "approved" };
      assert.equal(assertMerchantCanRedeem(merchant), merchant);
    },
  },
  {
    name: "merchant storefront normalization applies shared defaults",
    run() {
      const merchant = normalizeMerchant({
        businessName: "Cafe Buting",
        shortDescription: "Neighborhood cafe",
        logoUrl: "https://example.com/logo.png",
        pointsRatePeso: 25,
      });

      assert.equal(merchant.name, "Cafe Buting");
      assert.equal(merchant.description, "Neighborhood cafe");
      assert.equal(merchant.imageUrl, "https://example.com/logo.png");
      assert.equal(merchant.bannerUrl, "");
      assert.equal(merchant.pointsRate, 25);
      assert.match(merchant.pointsPolicy, /Earn 10 points for every PHP 100 spent/);
    },
  },
  {
    name: "merchant storefront payload builder filters unknown fields and syncs aliases",
    run() {
      const payload = buildMerchantPayload({
        businessName: "Cafe Buting",
        shortDescription: "Local favorites",
        discountInfo: "10% off",
        role: "merchant",
      });

      assert.deepEqual(payload, {
        businessName: "Cafe Buting",
        shortDescription: "Local favorites",
        discountInfo: "10% off",
        name: "Cafe Buting",
        description: "Local favorites",
      });
    },
  },
  {
    name: "merchant asset helpers normalize type and size limits",
    run() {
      assert.equal(normalizeMerchantAssetType("banner"), "banner");
      assert.equal(normalizeMerchantAssetType("anything-else"), "logo");
      assert.equal(getInlineAssetLimit("logo"), 400000);
      assert.equal(getInlineAssetLimit("banner"), 550000);
    },
  },
  {
    name: "reward status resolves active, inactive, expired, and out-of-stock cases",
    run() {
      assert.equal(resolveRewardStatus({ isActive: true, stock: 10 }), "active");
      assert.equal(resolveRewardStatus({ isActive: false, stock: 10 }), "inactive");
      assert.equal(resolveRewardStatus({ isActive: true, stock: 0 }), "inactive");
      assert.equal(
        resolveRewardStatus({
          isActive: true,
          stock: 10,
          expiryDate: "2020-01-01T00:00:00.000Z",
        }),
        "expired"
      );
    },
  },
  {
    name: "voucher expiry clamps to the earlier reward expiry date",
    run() {
      const redeemedAt = new Date("2026-04-01T00:00:00.000Z");

      assert.equal(
        computeVoucherExpiry({ validDays: 30 }, redeemedAt),
        "2026-05-01T00:00:00.000Z"
      );

      assert.equal(
        computeVoucherExpiry(
          { validDays: 30, expiryDate: "2026-04-10T00:00:00.000Z" },
          redeemedAt
        ),
        "2026-04-10T00:00:00.000Z"
      );
    },
  },
  {
    name: "reward redemption status computes active, claimed, and expired states",
    run() {
      assert.deepEqual(
        resolveRewardRedemptionStatus({
          expiresAt: "2099-01-01T00:00:00.000Z",
          redemptionStatus: "active",
        }),
        {
          status: "active",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }
      );

      assert.deepEqual(
        resolveRewardRedemptionStatus({
          expiresAt: "2099-01-01T00:00:00.000Z",
          redemptionStatus: "claimed",
        }),
        {
          status: "claimed",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }
      );

      assert.deepEqual(
        resolveRewardRedemptionStatus({
          expiresAt: "2020-01-01T00:00:00.000Z",
          redemptionStatus: "active",
        }),
        {
          status: "expired",
          expiresAt: "2020-01-01T00:00:00.000Z",
        }
      );
    },
  },
];

let passed = 0;

for (const entry of tests) {
  try {
    entry.run();
    passed += 1;
    console.log(`PASS ${entry.name}`);
  } catch (error) {
    console.error(`FAIL ${entry.name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(`\n${passed}/${tests.length} backend helper tests passed.`);
}
