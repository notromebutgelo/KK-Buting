import { NextFunction, Request, Response } from "express";

type ValidationRunner = (req: Request) => string[];
type AnyRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isDateLikeString(value: string) {
  return !Number.isNaN(Date.parse(value));
}

function isNumberLike(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "string" && value.trim()) {
    return Number.isFinite(Number(value));
  }

  return false;
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function isBooleanLike(value: unknown) {
  return (
    typeof value === "boolean" ||
    value === "true" ||
    value === "false"
  );
}

function ensureBodyRecord(req: Request, errors: string[]) {
  if (!isPlainObject(req.body)) {
    errors.push("Request body must be a JSON object.");
    return null;
  }

  return req.body as AnyRecord;
}

function validateString(
  errors: string[],
  record: AnyRecord,
  key: string,
  label: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    email?: boolean;
    date?: boolean;
  } = {},
) {
  const value = record[key];

  if (value === undefined || value === null || value === "") {
    if (options.required) {
      errors.push(`${label} is required.`);
    }
    return;
  }

  if (typeof value !== "string") {
    errors.push(`${label} must be a string.`);
    return;
  }

  const normalized = value.trim();
  if (options.required && !normalized) {
    errors.push(`${label} is required.`);
    return;
  }

  if (options.minLength && normalized.length < options.minLength) {
    errors.push(`${label} must be at least ${options.minLength} characters.`);
  }

  if (options.maxLength && normalized.length > options.maxLength) {
    errors.push(`${label} must be at most ${options.maxLength} characters.`);
  }

  if (options.email && normalized && !isValidEmail(normalized)) {
    errors.push(`${label} must be a valid email address.`);
  }

  if (options.date && normalized && !isDateLikeString(normalized)) {
    errors.push(`${label} must be a valid date string.`);
  }
}

function validateStringArray(
  errors: string[],
  record: AnyRecord,
  key: string,
  label: string,
  options: { required?: boolean; minItems?: number } = {},
) {
  const value = record[key];

  if (value === undefined || value === null) {
    if (options.required) {
      errors.push(`${label} is required.`);
    }
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array of strings.`);
    return;
  }

  const cleaned = value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean);
  if (options.minItems && cleaned.length < options.minItems) {
    errors.push(`${label} must contain at least ${options.minItems} item(s).`);
  }

  if (cleaned.length !== value.length) {
    errors.push(`${label} must contain only non-empty strings.`);
  }
}

function validateNumber(
  errors: string[],
  record: AnyRecord,
  key: string,
  label: string,
  options: {
    required?: boolean;
    min?: number;
    allowNull?: boolean;
    disallowZero?: boolean;
    integer?: boolean;
  } = {},
) {
  const value = record[key];

  if (value === undefined || value === "") {
    if (options.required) {
      errors.push(`${label} is required.`);
    }
    return;
  }

  if (value === null) {
    if (!options.allowNull) {
      errors.push(`${label} must be a number.`);
    }
    return;
  }

  if (!isNumberLike(value)) {
    errors.push(`${label} must be a number.`);
    return;
  }

  const normalized = toNumber(value);

  if (options.integer && !Number.isInteger(normalized)) {
    errors.push(`${label} must be a whole number.`);
  }

  if (options.min != null && normalized < options.min) {
    errors.push(`${label} must be at least ${options.min}.`);
  }

  if (options.disallowZero && normalized === 0) {
    errors.push(`${label} must not be zero.`);
  }
}

function validateBoolean(errors: string[], record: AnyRecord, key: string, label: string) {
  const value = record[key];
  if (value === undefined || value === null) {
    return;
  }

  if (!isBooleanLike(value)) {
    errors.push(`${label} must be a boolean.`);
  }
}

function validateEnum(
  errors: string[],
  record: AnyRecord,
  key: string,
  label: string,
  allowed: string[],
  options: { required?: boolean } = {},
) {
  const value = record[key];

  if (value === undefined || value === null || value === "") {
    if (options.required) {
      errors.push(`${label} is required.`);
    }
    return;
  }

  if (typeof value !== "string" || !allowed.includes(value)) {
    errors.push(`${label} must be one of: ${allowed.join(", ")}.`);
  }
}

function validateObject(errors: string[], record: AnyRecord, key: string, label: string) {
  const value = record[key];
  if (value === undefined || value === null) {
    return null;
  }

  if (!isPlainObject(value)) {
    errors.push(`${label} must be an object.`);
    return null;
  }

  return value;
}

function hasAnyKey(record: AnyRecord, keys: string[]) {
  return keys.some((key) => record[key] !== undefined);
}

function validateEligibilityConditions(errors: string[], record: AnyRecord, key = "eligibilityConditions") {
  const eligibility = validateObject(errors, record, key, "eligibilityConditions");
  if (!eligibility) {
    return;
  }

  validateNumber(errors, eligibility, "minAge", "eligibilityConditions.minAge", { min: 0, integer: true });
  validateNumber(errors, eligibility, "maxAge", "eligibilityConditions.maxAge", { min: 0, integer: true });
  validateString(errors, eligibility, "ageGroup", "eligibilityConditions.ageGroup", { minLength: 1, maxLength: 80 });
  validateBoolean(errors, eligibility, "isVerified", "eligibilityConditions.isVerified");

  if (
    isNumberLike(eligibility.minAge) &&
    isNumberLike(eligibility.maxAge) &&
    toNumber(eligibility.minAge) > toNumber(eligibility.maxAge)
  ) {
    errors.push("eligibilityConditions.maxAge must be greater than or equal to minAge.");
  }
}

const PROMOTION_TYPES = ["discount", "points_multiplier", "freebie"];
const MERCHANT_ASSET_TYPES = ["logo", "banner"];
const MERCHANT_STATUSES = ["approved", "rejected", "suspended"];
const REVIEW_ACTIONS = ["approved", "rejected"];
const YOUTH_STATUSES = ["pending", "verified", "rejected"];

export function validateRequest(validator: ValidationRunner) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors = validator(req);
    if (errors.length > 0) {
      return res.status(400).json({
        error: "Invalid request payload.",
        details: Array.from(new Set(errors)),
      });
    }

    next();
  };
}

export function validateAuthRegisterRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateString(errors, body, "email", "email", { email: true, maxLength: 160 });

  if (body.username !== undefined || body.UserName !== undefined) {
    validateString(errors, body, "username", "username", { minLength: 1, maxLength: 120 });
    validateString(errors, body, "UserName", "UserName", { minLength: 1, maxLength: 120 });
  }

  return errors;
}

export function validateAuthLoginRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateString(errors, body, "password", "password", { minLength: 1, maxLength: 256 });
  return errors;
}

export function validateQrMutationRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  const token = body.token;
  const qrData = body.qrData;
  if (!isNonEmptyString(token) && !isNonEmptyString(qrData)) {
    errors.push("Either token or qrData is required.");
  }

  const amountValue = body.amountSpent ?? body.amount;
  if (amountValue === undefined) {
    errors.push("amountSpent is required.");
    return errors;
  }

  if (!isNumberLike(amountValue)) {
    errors.push("amountSpent must be a number.");
    return errors;
  }

  if (toNumber(amountValue) <= 0) {
    errors.push("amountSpent must be greater than 0.");
  }

  return errors;
}

export function validatePromotionMutationRequest(options: { partial?: boolean } = {}) {
  return (req: Request) => {
    const errors: string[] = [];
    const body = ensureBodyRecord(req, errors);
    if (!body) return errors;

    const required = !options.partial;
    validateString(errors, body, "title", "title", { required, minLength: 2, maxLength: 120 });
    validateString(errors, body, "description", "description", { required, minLength: 4, maxLength: 1500 });
    validateEnum(errors, body, "type", "type", PROMOTION_TYPES, { required });
    validateNumber(errors, body, "value", "value", { min: 0 });
    validateNumber(errors, body, "minPurchaseAmount", "minPurchaseAmount", { min: 0 });
    validateString(errors, body, "expiresAt", "expiresAt", { date: true });

    if (options.partial && !hasAnyKey(body, ["title", "description", "type", "value", "minPurchaseAmount", "expiresAt"])) {
      errors.push("At least one promotion field must be provided.");
    }

    return errors;
  };
}

export function validatePromotionReviewRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateEnum(errors, body, "decision", "decision", REVIEW_ACTIONS, { required: true });
  validateString(errors, body, "reviewNote", "reviewNote", { maxLength: 500 });
  return errors;
}

export function validateVoucherMutationRequest(options: { partial?: boolean } = {}) {
  return (req: Request) => {
    const errors: string[] = [];
    const body = ensureBodyRecord(req, errors);
    if (!body) return errors;

    const required = !options.partial;
    validateString(errors, body, "title", "title", { required, minLength: 2, maxLength: 120 });
    validateString(errors, body, "description", "description", { required, minLength: 4, maxLength: 1500 });
    validateString(errors, body, "type", "type", { required, minLength: 2, maxLength: 80 });
    validateNumber(errors, body, "pointsCost", "pointsCost", { min: 0 });
    validateNumber(errors, body, "stock", "stock", { min: 0, integer: true, allowNull: true });
    validateString(errors, body, "status", "status", { minLength: 2, maxLength: 32 });
    validateString(errors, body, "expiresAt", "expiresAt", { date: true });
    validateEligibilityConditions(errors, body);

    if (options.partial && !hasAnyKey(body, ["title", "description", "type", "pointsCost", "stock", "status", "expiresAt", "eligibilityConditions"])) {
      errors.push("At least one voucher field must be provided.");
    }

    return errors;
  };
}

export function validateVoucherTokenRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateString(errors, body, "token", "token", { required: true, minLength: 4, maxLength: 64 });
  return errors;
}

export function validateMerchantRegisterRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateString(errors, body, "name", "name", { required: true, minLength: 2, maxLength: 160 });
  validateString(errors, body, "businessName", "businessName", { minLength: 2, maxLength: 160 });
  validateString(errors, body, "category", "category", { maxLength: 120 });
  validateString(errors, body, "address", "address", { maxLength: 240 });
  validateString(errors, body, "ownerName", "ownerName", { maxLength: 160 });
  validateString(errors, body, "ownerEmail", "ownerEmail", { email: true, maxLength: 160 });
  validateString(errors, body, "contactNumber", "contactNumber", { maxLength: 40 });
  validateNumber(errors, body, "pointsRate", "pointsRate", { min: 0 });
  return errors;
}

export function validateMerchantProfileUpdateRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  const stringFields = [
    "name",
    "businessName",
    "description",
    "shortDescription",
    "category",
    "address",
    "imageUrl",
    "bannerUrl",
    "logoUrl",
    "contactNumber",
    "discountInfo",
    "pointsPolicy",
    "ownerName",
    "ownerEmail",
  ];

  for (const field of stringFields) {
    validateString(errors, body, field, field, { maxLength: 2000, email: field === "ownerEmail" });
  }

  validateNumber(errors, body, "pointsRate", "pointsRate", { min: 0 });
  validateStringArray(errors, body, "termsAndConditions", "termsAndConditions");

  const businessInfo = body.businessInfo;
  if (businessInfo !== undefined && businessInfo !== null && !isPlainObject(businessInfo) && typeof businessInfo !== "string") {
    errors.push("businessInfo must be an object or string.");
  }

  if (!hasAnyKey(body, [...stringFields, "pointsRate", "termsAndConditions", "businessInfo"])) {
    errors.push("At least one merchant profile field must be provided.");
  }

  return errors;
}

export function validateMerchantAssetUploadRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateEnum(errors, body, "assetType", "assetType", MERCHANT_ASSET_TYPES, { required: true });
  validateString(errors, body, "fileData", "fileData", { required: true, minLength: 20, maxLength: 1_000_000 });
  return errors;
}

export function validateMerchantSubPromotionRequest(options: { partial?: boolean } = {}) {
  return (req: Request) => {
    const errors: string[] = [];
    const body = ensureBodyRecord(req, errors);
    if (!body) return errors;

    const required = !options.partial;
    validateString(errors, body, "title", "title", { required, minLength: 2, maxLength: 120 });
    validateString(errors, body, "shortTagline", "shortTagline", { maxLength: 180 });
    validateString(errors, body, "bannerUrl", "bannerUrl", { maxLength: 2048 });
    validateString(errors, body, "startDate", "startDate", { date: true });
    validateString(errors, body, "endDate", "endDate", { date: true });
    validateString(errors, body, "type", "type", { maxLength: 80 });
    validateString(errors, body, "valueLabel", "valueLabel", { maxLength: 120 });
    validateString(errors, body, "availability", "availability", { maxLength: 80 });
    validateStringArray(errors, body, "terms", "terms");
    validateBoolean(errors, body, "isActive", "isActive");
    validateNumber(errors, body, "redemptions", "redemptions", { min: 0, integer: true });
    validateNumber(errors, body, "views", "views", { min: 0, integer: true });

    if (options.partial && !hasAnyKey(body, ["title", "shortTagline", "bannerUrl", "startDate", "endDate", "type", "valueLabel", "availability", "terms", "isActive", "redemptions", "views"])) {
      errors.push("At least one promotion field must be provided.");
    }

    return errors;
  };
}

export function validateMerchantProductRequest(options: { partial?: boolean } = {}) {
  return (req: Request) => {
    const errors: string[] = [];
    const body = ensureBodyRecord(req, errors);
    if (!body) return errors;

    const required = !options.partial;
    validateString(errors, body, "name", "name", { required, minLength: 2, maxLength: 160 });
    validateNumber(errors, body, "price", "price", { required, min: 0 });
    validateString(errors, body, "category", "category", { maxLength: 120 });
    validateString(errors, body, "description", "description", { maxLength: 1500 });
    validateString(errors, body, "imageUrl", "imageUrl", { maxLength: 2048 });
    validateBoolean(errors, body, "isActive", "isActive");

    if (options.partial && !hasAnyKey(body, ["name", "price", "category", "description", "imageUrl", "isActive"])) {
      errors.push("At least one product field must be provided.");
    }

    return errors;
  };
}

export function validateVerificationRejectRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateString(errors, body, "reason", "reason", { required: true, minLength: 2, maxLength: 300 });
  validateString(errors, body, "note", "note", { maxLength: 1000 });
  return errors;
}

export function validateVerificationDocumentReviewRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateEnum(errors, body, "action", "action", REVIEW_ACTIONS, { required: true });
  validateString(errors, body, "note", "note", { maxLength: 1000 });
  return errors;
}

export function validateVerificationResubmissionRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateStringArray(errors, body, "documentIds", "documentIds", { required: true, minItems: 1 });
  validateString(errors, body, "message", "message", { required: true, minLength: 5, maxLength: 1000 });
  return errors;
}

export function validateBulkUserIdsRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateStringArray(errors, body, "userIds", "userIds", { required: true, minItems: 1 });
  return errors;
}

export function validateRewardMutationRequest(options: { partial?: boolean } = {}) {
  return (req: Request) => {
    const errors: string[] = [];
    const body = ensureBodyRecord(req, errors);
    if (!body) return errors;

    const required = !options.partial;
    validateString(errors, body, "title", "title", { required, minLength: 2, maxLength: 160 });
    validateString(errors, body, "description", "description", { maxLength: 2000 });
    validateString(errors, body, "imageUrl", "imageUrl", { maxLength: 2048 });
    validateNumber(errors, body, "points", "points", { required, min: 1 });
    validateNumber(errors, body, "stock", "stock", { min: 0, integer: true, allowNull: true });
    validateBoolean(errors, body, "unlimitedStock", "unlimitedStock");
    validateString(errors, body, "expiryDate", "expiryDate", { date: true });
    validateBoolean(errors, body, "isActive", "isActive");
    validateString(errors, body, "category", "category", { maxLength: 120 });
    validateString(errors, body, "merchantId", "merchantId", { maxLength: 160 });
    validateNumber(errors, body, "validDays", "validDays", { min: 1, integer: true });

    if (options.partial && !hasAnyKey(body, ["title", "description", "imageUrl", "points", "stock", "unlimitedStock", "expiryDate", "isActive", "category", "merchantId", "validDays"])) {
      errors.push("At least one reward field must be provided.");
    }

    return errors;
  };
}

export function validateMerchantAccountRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateString(errors, body, "name", "name", { required: true, minLength: 2, maxLength: 160 });
  validateString(errors, body, "category", "category", { maxLength: 120 });
  validateString(errors, body, "address", "address", { maxLength: 240 });
  validateString(errors, body, "ownerName", "ownerName", { maxLength: 160 });
  validateString(errors, body, "email", "email", { required: true, email: true, maxLength: 160 });
  validateString(errors, body, "password", "password", { required: true, minLength: 8, maxLength: 256 });
  return errors;
}

export function validateMerchantStatusRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateEnum(errors, body, "status", "status", MERCHANT_STATUSES, { required: true });
  return errors;
}

export function validatePointsConversionRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateNumber(errors, body, "pesosPerPoint", "pesosPerPoint", { required: true, min: 0.01 });
  return errors;
}

export function validateYouthStatusRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateEnum(errors, body, "status", "status", YOUTH_STATUSES, { required: true });
  validateString(errors, body, "reason", "reason", { maxLength: 300 });
  validateString(errors, body, "note", "note", { maxLength: 1000 });

  if (body.status === "rejected" && !isNonEmptyString(body.reason)) {
    errors.push("reason is required when rejecting a user.");
  }

  return errors;
}

export function validateArchiveYouthRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateString(errors, body, "note", "note", { maxLength: 1000 });
  return errors;
}

export function validateAdjustYouthPointsRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateNumber(errors, body, "amount", "amount", { required: true, disallowZero: true });
  validateString(errors, body, "reason", "reason", { required: true, minLength: 2, maxLength: 300 });
  return errors;
}

export function validateDigitalIdDeactivationRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateString(errors, body, "reason", "reason", { maxLength: 500 });
  return errors;
}

export function validateDigitalIdSignatureUploadRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  validateString(errors, body, "fileData", "fileData", {
    required: true,
    minLength: 20,
    maxLength: 350_000,
  });

  return errors;
}

export function validateYouthProfileUpdateRequest(req: Request) {
  const errors: string[] = [];
  const body = ensureBodyRecord(req, errors);
  if (!body) return errors;

  const stringFields = [
    "firstName",
    "middleName",
    "lastName",
    "suffix",
    "birthday",
    "gender",
    "civilStatus",
    "contactNumber",
    "region",
    "province",
    "city",
    "barangay",
    "purok",
    "youthAgeGroup",
    "educationalBackground",
    "youthClassification",
    "workStatus",
    "kkAssemblyTimesAttended",
    "digitalIdEmergencyContactName",
    "digitalIdEmergencyContactRelationship",
    "digitalIdEmergencyContactPhone",
  ];

  for (const field of stringFields) {
    validateString(errors, body, field, field, {
      maxLength: field === "birthday" ? 64 : 240,
      date: field === "birthday",
    });
  }

  validateNumber(errors, body, "age", "age", { min: 0, integer: true });
  validateNumber(errors, body, "yearsInBarangay", "yearsInBarangay", { min: 0, integer: true });
  validateBoolean(errors, body, "registeredSkVoter", "registeredSkVoter");
  validateBoolean(errors, body, "votedLastSkElections", "votedLastSkElections");
  validateBoolean(errors, body, "registeredNationalVoter", "registeredNationalVoter");
  validateBoolean(errors, body, "attendedKkAssembly", "attendedKkAssembly");

  return errors;
}
