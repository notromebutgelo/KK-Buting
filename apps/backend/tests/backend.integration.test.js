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

async function loadAdminService(db) {
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
      createNotification: async () => undefined,
      createNotificationsForRoles: async () => undefined,
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
          verifyQrToken: () => ({
            userId: "youth-1",
            revision: 3,
            timestamp: Date.now(),
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
