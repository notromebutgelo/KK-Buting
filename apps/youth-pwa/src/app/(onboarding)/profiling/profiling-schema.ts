export const CONSENT_AGREE = "I agree (Ako ay sumasang-ayon)";
export const CONSENT_DISAGREE = "I disagree (Ako ay hindi sumasang-ayon)";

export const YES_NO_OPTIONS = ["Yes (Oo)", "No (Hindi)"] as const;
export const NEVER_SOMETIMES_OFTEN_OPTIONS = [
  "Never (Hindi)",
  "Sometimes (Minsan)",
  "Often (Madalas)",
] as const;
export const STRONGLY_AGREE_OPTIONS = [
  "Strongly Agree (Lubos na sumasang-ayon)",
  "Agree (Sumasang-ayon)",
  "Disagree (Hindi sumasang-ayon)",
  "Strongly Disagree (Lubos na hindi sumasang-ayon)",
] as const;
export const VERY_GOOD_TO_VERY_POOR_OPTIONS = [
  "Very Good",
  "Good",
  "Poor",
  "Very Poor",
] as const;
export const INFO_SOURCE_OPTIONS = [
  "Social Media (Facebook, TikTok, Instagram)",
  "Chat Groups (Messenger, Viber, WhatsApp)",
  "Online Websites or Articles",
  "Podcasts",
  "TV or Radio",
  "School (Guidance Counselors, Teachers, Supervisors)",
  "Workplace",
  "Friends",
  "Family",
  "Health Centers or Professionals",
  "Print Media (Posters, Tarpulins)",
  "Prefer not to say (Mas gusto kong huwag sabihin)",
  "Other:",
] as const;

export type ProfilingDraft = {
  privacyConsent?: string;
  digitalIdSignatureDataUrl?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  sexAssignedAtBirth?: string;
  sexualOrientation?: string;
  sexualOrientationOther?: string;
  ageAtLastBirthday?: string;
  yearOfBirth?: string;
  monthOfBirth?: string;
  dayOfBirth?: string;
  placeOfBirth?: string;
  civilStatus?: string;
  religiousAffiliation?: string;
  currentAddressBarangay?: string;
  currentAddressStreetAddress?: string;
  currentAddressHouseBlockUnitNumber?: string;
  currentAddressSameAsPermanent?: string;
  permanentAddressBarangay?: string;
  permanentAddressStreetAddress?: string;
  permanentAddressHouseBlockUnitNumber?: string;
  highestEducationalAttainment?: string;
  seniorHighSchoolTrack?: string;
  seniorHighSchoolTrackOther?: string;
  seniorHighSchoolStrand?: string;
  seniorHighSchoolStrandOther?: string;
  vocationalTradeCourse?: string;
  vocationalTradeCourseOther?: string;
  currentlyStudyingOrEnrolled?: string;
  schoolType?: string;
  enrolledInAlternativeLearningSystem?: string;
  scholarshipProgram?: string;
  mainReasonNotInSchool?: string;
  mainReasonNotInSchoolOther?: string;
  employmentStatus?: string;
  employmentSector?: string;
  minimumWageEarner?: string;
  ageFirstEmployed?: string;
  primarySourceOfFunds?: string;
  primarySourceOfFundsOther?: string;
  earningsEnoughForDailyNeeds?: string;
  hasOfwFamilyMember?: string;
  ownsBusiness?: string;
  businessSector?: string;
  businessSectorOther?: string;
  physicalHealthAssessment?: string;
  personWithDisability?: string;
  disabilityType?: string;
  disabilityTypeOther?: string;
  emotionalDistressFrequency?: string;
  stressPhysicalSymptomsFrequency?: string;
  difficultyConcentratingFrequency?: string;
  feelingAloneFrequency?: string;
  lossOfInterestFrequency?: string;
  feelingAnxiousFrequency?: string;
  feelingHopelessFrequency?: string;
  biggestSourceOfStress?: string;
  biggestSourceOfStressOther?: string;
  firstSupportInStress?: string;
  firstSupportInStressOther?: string;
  mentalHealthSupportType?: string;
  mentalHealthSupportTypeOther?: string;
  mentalHealthInfoSource?: string;
  mentalHealthInfoSourceOther?: string;
  smokingStatus?: string;
  smokingStartAge?: string;
  thinksSmokingIsBad?: string;
  alcoholConsumptionStatus?: string;
  alcoholStartAge?: string;
  thinksAlcoholIsBad?: string;
  ageAtFirstSexExperience?: string;
  numberOfChildren?: string;
  ageAtFirstPregnancy?: string;
  ageAtFirstImpregnation?: string;
  soloParent?: string;
  thinksContraceptiveUseImportant?: string;
  contraceptiveMethodsUsed?: string[];
  contraceptiveMethodsUsedOther?: string;
  facedContraceptiveAccessBarriers?: string;
  contraceptiveInfoSource?: string;
  contraceptiveInfoSourceOther?: string;
  knowledgeableAboutHivAids?: string;
  vaccineOpinion?: string;
  vaccineInfoSource?: string;
  vaccineInfoSourceOther?: string;
  votedDuring2023BarangayAndSkElections?: string;
  votedDuring2025MidtermAndLocalElections?: string;
  attendedKkAssemblySinceJanuary2024?: string;
  csoMemberOrVolunteer?: string;
  feelsSafeAtHome?: string;
  feelsSafeInSchool?: string;
  feelsSafeAtWorkplace?: string;
  feelsSafeInCommunity?: string;
  feelsSafeOnline?: string;
  usesArtificialIntelligence?: string;
  cybercrimeVictim?: string;
  onlineBettingOrGambling?: string;
  weeklyBettingSpend?: string;
  communityAffectedByDisasterPastYear?: string;
  disasterReadinessAgreement?: string;
  drillsEffectivenessAgreement?: string;
  transportationModesUsedDaily?: string[];
  transportationModesUsedDailyOther?: string;
  sidewalkQuality?: string;
  bikeLaneQuality?: string;
  wantsToStudyAbroad?: string;
  wantsToWorkAbroad?: string;
  wantsToStartBusiness?: string;
  wantsToGetMarried?: string;
  wantsToHaveChildren?: string;
};

export type ProfilingFieldType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "signature";

export type ProfilingFieldConfig = {
  key: keyof ProfilingDraft;
  label: string;
  type: ProfilingFieldType;
  required?: boolean;
  description?: string;
  helperText?: string;
  placeholder?: string;
  options?: readonly string[];
  showIf?: (draft: ProfilingDraft) => boolean;
  otherKey?: keyof ProfilingDraft;
  inputType?: "text" | "email" | "tel" | "number";
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email" | "search" | "url";
  reviewLabel?: string;
};

export type ProfilingStepSection = {
  title: string;
  description?: string;
  fields: ProfilingFieldConfig[];
};

export type ProfilingStepConfig = {
  stepNumber: number;
  path: string;
  title: string;
  subtitle: string;
  sections: ProfilingStepSection[];
};

const MONTH_OPTIONS = [
  "January (Enero)",
  "February (Pebrero)",
  "March (Marso)",
  "April (Abril)",
  "May (Mayo)",
  "June (Hunyo)",
  "July (Hulyo)",
  "August (Agosto)",
  "September (Setyembre)",
  "October (Oktubre)",
  "November (Nobyembre)",
  "December (Disyembre)",
] as const;

const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => String(index + 1));
const AGE_1_TO_35_OPTIONS = Array.from({ length: 35 }, (_, index) => String(index + 1));
const CHILD_COUNT_1_TO_20_OPTIONS = Array.from({ length: 20 }, (_, index) => String(index + 1));
const NOT_APPLICABLE_OPTION = "Not Applicable";
const PREFER_NOT_TO_SAY_OPTION = "Prefer not to say (Mas gusto kong huwag sabihin)";
const AGE_1_TO_35_WITH_NOT_APPLICABLE_OPTIONS = [
  ...AGE_1_TO_35_OPTIONS,
  NOT_APPLICABLE_OPTION,
];
const AGE_1_TO_35_WITH_FALLBACK_OPTIONS = [
  ...AGE_1_TO_35_OPTIONS,
  NOT_APPLICABLE_OPTION,
  PREFER_NOT_TO_SAY_OPTION,
];
const CHILD_COUNT_WITH_FALLBACK_OPTIONS = [
  ...CHILD_COUNT_1_TO_20_OPTIONS,
  NOT_APPLICABLE_OPTION,
  PREFER_NOT_TO_SAY_OPTION,
];

const PASIG_BARANGAY_OPTIONS = [
  "Bagong Ilog",
  "Bagong Katipunan",
  "Bambang",
  "Buting",
  "Caniogan",
  "Dela Paz",
  "Kalawaan",
  "Kapasigan",
  "Kapitolyo",
  "Malinao",
  "Manggahan",
  "Maybunga",
  "Oranbo",
  "Palatiw",
  "Pinagbuhatan",
  "Pineda",
  "Rosario",
  "Sagad",
  "San Antonio",
  "San Joaquin",
  "San Jose",
  "San Miguel",
  "San Nicolas",
  "Santolan",
  "Santa Cruz",
  "Santa Lucia",
  "Santa Rosa",
  "Santo Tomas",
  "Sumilang",
  "Ugong",
] as const;

const PLACE_OF_BIRTH_OPTIONS = [
  "Pasig City",
  "National Capital Region, but not Pasig City",
  "Region I (Ilocos Region)",
  "Region II (Cagayan Valley)",
  "Region III (Central Luzon)",
  "Region IV-A (CALABARZON)",
  "Region IV-B (MIMAROPA)",
  "Region V (Bicol Region)",
  "Region VI (Western Visayas) — hindi kasama ang Negros Occidental",
  "Region VII (Central Visayas) — hindi kasama ang Negros Oriental at Siquijor",
  "Region VIII (Eastern Visayas)",
  "Region IX (Zamboanga Peninsula) — kasama ang Sulu Province",
  "Region X (Northern Mindanao)",
  "Region XI (Davao Region)",
  "Region XII (SOCCSKSARGEN)",
  "Caraga",
  "Cordillera Administrative Region",
  "Bangsamoro — hindi kasama ang Sulu Province",
  "Negros Island Region (NIR) — Negros Occidental, Negros Oriental, at Siquijor",
  "Overseas country or territory (Bansa o teritoryo sa labas ng Pilipinas)",
] as const;

const RELIGIOUS_AFFILIATION_OPTIONS = [
  "Islam",
  "Buddhism",
  "Hinduism",
  "Judaism",
  "Roman Catholic (Katoliko)",
  "Iglesia ni Cristo",
  "Seventh Day Adventist",
  "Iglesia Filipina Independiente",
  "Bible Baptist Church",
  "United Church of Christ in the Philippines",
  "Jehovah's Witness",
  "Church of Christ",
  "Indigenous Philippine Folk Religions",
  "None (Wala)",
  "Prefer not to say (Mas gusto kong huwag sabihin)",
] as const;

const HIGHEST_EDUCATIONAL_ATTAINMENT_OPTIONS = [
  "Pre-school",
  "Elementary Level (Grades 1-6)",
  "Elementary Graduate",
  "Junior High School Level (Grades 7-10)",
  "Junior High School Graduate",
  "Senior High School Level (Grades 11 & 12)",
  "Senior High School Graduate",
  "Vocational/Trade Course Taker",
  "Vocational/Trade Course Completer",
  "College Level",
  "College Graduate",
  "Master's Level (Including Law and Medical Degrees)",
  "Master's Degree Holder (Including Law and Medical Degrees)",
  "Doctorate Level",
  "Doctorate Degree Holder",
  "I am yet to enter the formal education system (Hindi pa ako nakapag-aral sa formal education system)",
] as const;

const SENIOR_HIGH_TRACK_OPTIONS = [
  "Not Applicable; there was still no Senior High School during my time in high school (Wala pang Senior High School noong ako ay nasa high school)",
  "Academic Track",
  "Arts and Design Track",
  "Sports Track",
  "Technical-Vocational-Livelihood Track (TVL)",
  "Other:",
] as const;

const SENIOR_HIGH_STRAND_OPTIONS = [
  "Not Applicable; there was still no Senior High School during my time in high school (Wala pang Senior High School noong ako ay nasa high school)",
  "Accountancy, Business, and Management (ABM)",
  "Humanities and Social Sciences (HUMSS)",
  "Science, Technology, Engineering, and Mathematics (STEM)",
  "General Academic Strand (GAS)",
  "Agriculture and Fisheries Arts",
  "Home Economics",
  "Industrial Arts",
  "Information and Communications Technology (ICT)",
  "Arts and Design",
  "Sports/Sports Management",
  "Other:",
] as const;

const VOCATIONAL_TRADE_COURSE_OPTIONS = [
  "Not Applicable",
  "Bookkeeping",
  "Bread and Pastry Production",
  "Computer Systems Servicing",
  "Contact Center Services",
  "Cookery",
  "Electrical Installation and Maintenance",
  "Food and Beverage Service",
  "Housekeeping",
  "Shielded Metal Arc Welding",
  "Other:",
] as const;

const SCHOOL_TYPE_OPTIONS = [
  "Public school/college/university within Pasig City",
  "Public school/college/university outside Pasig City",
  "Private school/college/university within Pasig City",
  "Private school/college/university outside Pasig City",
] as const;

const SCHOLARSHIP_PROGRAM_OPTIONS = [
  "Yes (Oo); Government-sponsored scholarship",
  "Yes (Oo); Private-sponsored scholarship",
  "Yes (Oo); Both Government- and Private-sponsored scholarship",
  "No (Hindi)",
] as const;

const REASON_NOT_IN_SCHOOL_OPTIONS = [
  "Finished with studies (Ako ay nakapagtapos na ng pag-aaral)",
  "Employment (Pagtatrabaho o paghahanap ng trabaho kahit hindi pa tapos sa pag-aaral)",
  "High cost of education (Mahal na gastusin para sa edukasyon)",
  "Academic challenges (Nahirapan ako sa aking mga asignatura)",
  "Lack of personal interest (Hindi na ako interesadong mag-aral)",
  "Pregnancy or Impregnation (Ako ay nabuntis o nakabuntis)",
  "Marriage (Ako ay ikinasal o ikakasal na)",
  "Family (Ako ay mayroong inaalagaang pamilya)",
  "Bullying in school (Ako ay nakaranas ng bullying sa paaralan)",
  "Health issues (Ako ay may mga isyung pangkalusugan)",
  "Accessibility issues (Nahihirapan akong pumunta sa pinakamalapit na paaralan mula sa aking bahay)",
  "Other:",
] as const;

const EMPLOYMENT_STATUS_OPTIONS = [
  "Yes, I am currently employed (Oo, ako ay kasalukuyang employed)",
  "No, I am currently not employed (Hindi, ako ay kasalukuyang hindi employed)",
  "No, but I am currently looking for work (Hindi, ngunit ako ay kasalukuyang naghahanap ng trabaho)",
] as const;

const EMPLOYMENT_SECTOR_OPTIONS = [
  "Not Applicable (Ako ay kasalukuyang hindi employed)",
  "Government (Gobyerno)",
  "Private (Pribado)",
  "Self-employed",
] as const;

const PRIMARY_SOURCE_OF_FUNDS_OPTIONS = [
  "Salary (Suweldo o Sahod)",
  "Income from business (Kita sa negosyo)",
  "Remittances (Padala)",
  "Other:",
] as const;

const BUSINESS_SECTOR_OPTIONS = [
  "Accommodation/Food Service Activities",
  "Administrative and Support Service Activities",
  "Agriculture, Forestry, and Fishing",
  "Construction (e.g., building construction)",
  "Financial and Insurance Activities",
  "Information, Communication, Media, and Entertainment",
  "Manufacturing",
  "Other Service Activities (e.g., repair, cleaning, maintenance)",
  "Professional, Scientific, and Technical Activities",
  "Real Estate Activities",
  "Wholesail/Retail Trade",
  "Not Applicable (Hindi ako nagmamay-ari ng kahit anong negosyo)",
  "Other:",
] as const;

const DISABILITY_TYPE_OPTIONS = [
  "Not Applicable",
  "Chronic Illness",
  "Deaf/Hard of Hearing",
  "Intellectual Disability",
  "Learning Disability",
  "Mental Disability",
  "Orthopedic disability",
  "Physical Disability",
  "Psychosocial Disability",
  "Rare Diseases",
  "Speech and Language Impairments",
  "Visual Disability",
  "Prefer not to say (Mas gusto kong huwag sabihin)",
  "Other:",
] as const;

const BIGGEST_SOURCE_OF_STRESS_OPTIONS = [
  "Academic/School (Paaralan)",
  "Employment (Trabaho)",
  "Financial (Pinansyal)",
  "Family/Home environment (Pamilya/Tahanan)",
  "Social/Relationships (Mga kaibigan/Mga karelasyon)",
  "Bullying (School/Work/Online)",
  "Abuse or Violence (Emotional/Physical/Sexual)",
  "Digital (Internet/Social Media)",
  "Health (Kalusugan)",
  "Community Safety (Seguridad sa sariling komunidad)",
  "Prefer not to say (Mas gusto kong huwag sabihin)",
  "Other:",
] as const;

const FIRST_SUPPORT_IN_STRESS_OPTIONS = [
  "Parent/Adult (Magulang/Nakatatanda)",
  "Sibling (Kapatid)",
  "Friend/Peer (Kaibigan)",
  "Teacher/Supervisor (Guro)",
  "No one (Wala)",
  "Prefer not to say (Mas gusto kong huwag sabihin)",
  "Other:",
] as const;

const MENTAL_HEALTH_SUPPORT_OPTIONS = [
  "Talking to friends or peers",
  "Talking to family members",
  "Support from Guidance counselor/Teacher/Supervisor",
  "Professional help (Psychologist, Psychiatrist, or Doctor)",
  "Online resources (Videos, Apps, Articles)",
  "Social Media Support Groups",
  "Religious or Spiritual support",
  "Sports or physical activities",
  "Creative activities (Art, Music, Writing)",
  "Rest, Hobbies, or Self-care",
  "Prefer not to say (Mas gusto kong huwag sabihin)",
  "Other:",
] as const;

const SMOKING_STATUS_OPTIONS = [
  "Yes (Oo)",
  "No (Hindi)",
  "Not anymore (Huminto na ako sa paninigarilyo)",
] as const;

const ALCOHOL_STATUS_OPTIONS = [
  "Yes (Oo)",
  "No (Hindi)",
  "Not anymore (Huminto na ako sa pag-inom ng alcoholic drinks)",
] as const;

const SOLO_PARENT_OPTIONS = [
  "Yes (Oo)",
  "No (Hindi)",
  "Not Applicable (Wala pa akong anak)",
] as const;

const CONTRACEPTIVE_METHOD_OPTIONS = [
  "Basal body temperature charting",
  "Birth control pill",
  "Calendar calculation",
  "Cervical mucus monitoring",
  "Condom",
  "Contraceptive injection",
  "Diaphragm",
  "Emergency contraception",
  "Implant",
  "Intrauterine device (IUD)",
  "Surgical sterilization",
  "None (Hindi pa ako nakakagamit ng kahit anong contraceptive method)",
  "Prefer not to say (Mas gusto kong huwag sabihin)",
  "Other:",
] as const;

const VACCINE_OPINION_OPTIONS = [
  "Very positive",
  "Positive",
  "Negative",
  "Very negative",
] as const;

const VOTING_OPTIONS = [
  "Yes (Oo)",
  "No (Hindi)",
  "No; I was not eligible to vote yet (Hindi; Hindi pa ako eligible bumoto noon)",
] as const;

const CYBERCRIME_OPTIONS = [
  "Yes (Oo)",
  "No (Hindi)",
  "Prefer not to say (Mas gusto kong huwag sabihin)",
] as const;

const TRANSPORTATION_MODE_OPTIONS = [
  "Tricycle or Pedicab",
  "Jeep (Traditional and/or Modern)",
  "Bus",
  "UV Express or FX",
  "Train (LRT-1, LRT-2, and/or MRT-3)",
  "Ferry (Pasig and/or Marikina River Ferries)",
  "TNVS Four-wheeler (Grab, InDrive, Green GSM, etc.)",
  "TNVS Two-wheeler (Angkas, MoveIt, Joyride, etc.)",
  "Non-TNVS Taxi",
  "Non-TNVS Two-wheeler (Habal-habal)",
  "Non-Electric Bike or Scooter (De-padyak)",
  "Electric Bike or Scooter (NWOW, etc.)",
  "Private Vehicle (Four-wheeler)",
  "Private Vehicle (Two-wheeler)",
  "Other:",
] as const;

const WANTS_START_BUSINESS_OPTIONS = [
  "Yes (Oo)",
  "No (Hindi)",
  "Mayroon na akong sariling negosyo",
] as const;

function sameAsPermanentAddress(draft: ProfilingDraft) {
  return draft.currentAddressSameAsPermanent === "Yes (Oo)";
}

function differentPermanentAddress(draft: ProfilingDraft) {
  return draft.currentAddressSameAsPermanent === "No (Hindi)";
}

function currentlyInSchool(draft: ProfilingDraft) {
  return draft.currentlyStudyingOrEnrolled === "Yes (Oo)";
}

function currentlyNotInSchool(draft: ProfilingDraft) {
  return draft.currentlyStudyingOrEnrolled === "No (Hindi)";
}

function hasSeniorHighBackground(draft: ProfilingDraft) {
  return [
    "Senior High School Level (Grades 11 & 12)",
    "Senior High School Graduate",
    "College Level",
    "College Graduate",
    "Master's Level (Including Law and Medical Degrees)",
    "Master's Degree Holder (Including Law and Medical Degrees)",
    "Doctorate Level",
    "Doctorate Degree Holder",
  ].includes(draft.highestEducationalAttainment || "");
}

function shouldAskSeniorHighTrack(draft: ProfilingDraft) {
  return currentlyInSchool(draft) && hasSeniorHighBackground(draft);
}

function shouldAskSeniorHighStrand(draft: ProfilingDraft) {
  return (
    shouldAskSeniorHighTrack(draft) &&
    Boolean(draft.seniorHighSchoolTrack) &&
    !String(draft.seniorHighSchoolTrack || "").startsWith(
      "Not Applicable; there was still no Senior High School during my time in high school"
    )
  );
}

function shouldAskVocationalCourse(draft: ProfilingDraft) {
  return (
    currentlyInSchool(draft) &&
    [
      "Vocational/Trade Course Taker",
      "Vocational/Trade Course Completer",
    ].includes(draft.highestEducationalAttainment || "")
  );
}

function currentlyEmployed(draft: ProfilingDraft) {
  return (
    draft.employmentStatus ===
    "Yes, I am currently employed (Oo, ako ay kasalukuyang employed)"
  );
}

function ownsBusiness(draft: ProfilingDraft) {
  return draft.ownsBusiness === "Yes (Oo)";
}

function personWithDisability(draft: ProfilingDraft) {
  return draft.personWithDisability === "Yes (Oo)";
}

function hasSmokingHistory(draft: ProfilingDraft) {
  return [
    "Yes (Oo)",
    "Not anymore (Huminto na ako sa paninigarilyo)",
  ].includes(draft.smokingStatus || "");
}

function hasAlcoholHistory(draft: ProfilingDraft) {
  return [
    "Yes (Oo)",
    "Not anymore (Huminto na ako sa pag-inom ng alcoholic drinks)",
  ].includes(draft.alcoholConsumptionStatus || "");
}

function femaleAtBirth(draft: ProfilingDraft) {
  return draft.sexAssignedAtBirth === "Female";
}

function maleAtBirth(draft: ProfilingDraft) {
  return draft.sexAssignedAtBirth === "Male";
}

function onlineGambler(draft: ProfilingDraft) {
  return draft.onlineBettingOrGambling === "Yes (Oo)";
}

function hasChildren(draft: ProfilingDraft) {
  const rawValue = String(draft.numberOfChildren || "").trim().toLowerCase();

  if (!rawValue) {
    return false;
  }

  if (
    rawValue === "0" ||
    rawValue === "not applicable" ||
    rawValue.includes("wala pa akong anak") ||
    rawValue.includes("prefer not to say")
  ) {
    return false;
  }

  const numericValue = Number.parseInt(rawValue, 10);
  if (!Number.isNaN(numericValue)) {
    return numericValue > 0;
  }

  return true;
}

function hasSexExperience(draft: ProfilingDraft) {
  const rawValue = String(draft.ageAtFirstSexExperience || "").trim().toLowerCase();

  if (!rawValue) {
    return false;
  }

  if (
    rawValue === "not applicable" ||
    rawValue.includes("wala pang sex experience") ||
    rawValue.includes("prefer not to say")
  ) {
    return false;
  }

  return true;
}

function femaleWithSexExperience(draft: ProfilingDraft) {
  return femaleAtBirth(draft) && hasSexExperience(draft);
}

function maleWithSexExperience(draft: ProfilingDraft) {
  return maleAtBirth(draft) && hasSexExperience(draft);
}

export const PROFILING_STEPS: ProfilingStepConfig[] = [
  {
    stepNumber: 1,
    path: "/profiling/step-1",
    title: "Consent & Identity",
    subtitle:
      "Start with consent and your basic personal details from the 2026 KK profiling questionnaire.",
    sections: [
      {
        title: "Privacy Consent",
        description:
          "You need to agree to the privacy notice before continuing with the profiling survey.",
        fields: [
          {
            key: "privacyConsent",
            label:
              "I hereby grant consent for the collection, processing, and use of my personal information in accordance with applicable privacy laws. I understand that my data will be handled responsibly and securely for the specified purposes.",
            description:
              "Sa pamamagitan nito, nagbibigay ako ng pahintulot para sa pagkolekta, pagpoproseso, at paggamit ng aking personal na impormasyon alinsunod sa naaangkop na mga batas ukol sa privacy. Nauunawaan ko na ang aking datos ay mapangangalagaan nang responsable at ligtas para sa mga tinukoy na layunin.",
            type: "radio",
            required: true,
            options: [CONSENT_AGREE, CONSENT_DISAGREE],
          },
        ],
      },
      {
        title: "Digital ID Signature",
        description:
          "Draw the signature that will appear on your KK Digital ID. You can still update it later if your signature changes.",
        fields: [
          {
            key: "digitalIdSignatureDataUrl",
            label: "Digital ID Signature",
            type: "signature",
            required: true,
            helperText:
              "Pumirma sa loob ng kahon. Maaari mong i-clear at ulitin ang pirma mo bago magpatuloy.",
            reviewLabel: "Digital ID Signature",
          },
        ],
      },
      {
        title: "Name Details",
        description:
          "The questionnaire marks these name fields as optional because they may be considered sensitive information.",
        fields: [
          {
            key: "lastName",
            label: "Last Name (Apelyido)",
            type: "text",
            placeholder: "Example: Sotto",
            helperText:
              "Optional lamang ang pagbibigay ng iyong apelyido sa questionnaire na ito.",
          },
          {
            key: "firstName",
            label: "First Name (Unang Pangalan)",
            type: "text",
            placeholder: "Example: Victor Ma. Regis",
            helperText:
              "Optional lamang ang pagbibigay ng iyong unang pangalan sa questionnaire na ito.",
          },
          {
            key: "middleName",
            label: "Middle Name (Gitnang Pangalan)",
            type: "text",
            placeholder: "Example: Nubla",
            helperText:
              "Optional lamang ang pagbibigay ng iyong gitnang pangalan sa questionnaire na ito.",
          },
        ],
      },
      {
        title: "Identity",
        fields: [
          {
            key: "sexAssignedAtBirth",
            label: "Sex Assigned at Birth (Kasarian noong ipinanganak)",
            type: "radio",
            required: true,
            description:
              'Ano ang kahulugan ng "Intersex?" Ang "intersex" ay tumutukoy sa mga taong ipinanganak na may mga katangiang sekswal na hindi akma sa karaniwang depinisyon ng katawan ng lalaki o babae.',
            options: ["Male", "Female", "Intersex"],
          },
          {
            key: "sexualOrientation",
            label: "Sexual Orientation (Oryentasyong Sekswal)",
            type: "radio",
            required: true,
            description:
              'Ano ang kahulugan ng "Sexual Orientation?" Ito ay tumutukoy sa uri ng romantiko at/o seksuwal na atraksyon na nararamdaman ng isang tao sa iba, batay sa kanilang kasarian o gender identity.',
            options: [
              "Heterosexual o Straight (Ito ay tumutukoy sa uri ng romantiko at/o seksuwal na atraksyon na nararamdaman ng isang tao sa iba, batay sa kanilang kasarian o gender identity)",
              "Homosexual (Nakadarama ng romantiko at/o seksuwal na atraksyon sa taong may katulad na kasarian)",
              "Bisexual (Nakadarama ng romantiko at/o seksuwal na atraksyon sa higit sa isang kasarian, tulad ng lalaki at babae)",
              "Pansexual (Nakadarama ng romantiko at/o seksuwal na atraksyon sa tao anuman ang kanilang kasarian o gender identity)",
              "Asexual (Nakararanas ng kaunti o walang seksuwal na atraksyon sa ibang tao; maaari pa ring makaranas ng romantikong atraksyon)",
              "Prefer not to say (Mas gusto kong huwag sabihin)",
              "Other:",
            ],
            otherKey: "sexualOrientationOther",
          },
        ],
      },
    ],
  },
  {
    stepNumber: 2,
    path: "/profiling/step-2",
    title: "Birth & Residence",
    subtitle:
      "Capture your birth details, civil background, and current or permanent address information.",
    sections: [
      {
        title: "Birth Details",
        fields: [
          {
            key: "ageAtLastBirthday",
            label: "Age at last birthday (Edad noong huling birthday)",
            type: "text",
            required: true,
            placeholder: "Example: 25",
            inputType: "number",
            inputMode: "numeric",
          },
          {
            key: "yearOfBirth",
            label: "Year of birth (Taon ng kapanganakan)",
            type: "text",
            required: true,
            placeholder: "Example: 2001",
            inputType: "number",
            inputMode: "numeric",
          },
          {
            key: "monthOfBirth",
            label: "Month of birth (Buwan ng kapanganakan)",
            type: "select",
            required: true,
            options: MONTH_OPTIONS,
            placeholder: "Pumili lamang ng isa.",
          },
          {
            key: "dayOfBirth",
            label: "Date of birth (Araw ng kapanganakan)",
            type: "select",
            required: true,
            options: DAY_OPTIONS,
            placeholder: "Pumili lamang ng isa.",
          },
          {
            key: "placeOfBirth",
            label: "Place of birth (Lugar ng kapanganakan)",
            type: "select",
            required: true,
            options: PLACE_OF_BIRTH_OPTIONS,
            placeholder: "Pumili lamang ng isa.",
          },
          {
            key: "civilStatus",
            label: "Civil Status",
            type: "radio",
            required: true,
            description:
              'Kasama sa questionnaire ang mga kahulugan para sa "Live-in o Common-law relationship," "Legally Separated," "Annulled," at "Divorced" para mas malinaw ang pagpili ng sagot.',
            options: [
              "Never Married (Hindi pa kinasal kahit kailan)",
              "Married (Kasal)",
              "Live-in o Common-law relationship",
              "Widowed (Biyudo o Biyuda)",
              "Legally Separated",
              "Annulled",
              "Divorced",
            ],
          },
          {
            key: "religiousAffiliation",
            label: "Religious Affiliation (Relihiyon)",
            type: "select",
            required: true,
            options: RELIGIOUS_AFFILIATION_OPTIONS,
            placeholder: "Pumili lamang ng isa.",
          },
        ],
      },
      {
        title: "Current Address",
        fields: [
          {
            key: "currentAddressBarangay",
            label: "Current Address — Barangay",
            type: "select",
            required: true,
            options: PASIG_BARANGAY_OPTIONS,
            placeholder: "Piliin ang barangay kung saan ka kasalukuyang nakatira.",
          },
          {
            key: "currentAddressHouseBlockUnitNumber",
            label:
              "Current Address — House/Block/Unit Number (Number ng kasalukuyang tirahan)",
            type: "text",
            placeholder: "Example: 12-B",
          },
          {
            key: "currentAddressStreetAddress",
            label: "Current Address — Street Address (Street kung nasaan ang kasalukuyang tirahan)",
            type: "text",
            required: true,
            placeholder: "Example: Alcalde Jose St.",
          },
          {
            key: "currentAddressSameAsPermanent",
            label:
              "Is your Current Address the same with your Permanent Address? (Ang iyong Kasalukuyang Address ba ay kapareho ng iyong Permanenteng Address?)",
            type: "radio",
            required: true,
            description:
              'Ang "Current Address" ay kung saan ka kasalukuyang nakatira. Ang "Permanent Address" ay kung saan ka legal na nakarehistro o pangmatagalang nakatira.',
            options: YES_NO_OPTIONS,
          },
        ],
      },
      {
        title: "Permanent Address",
        description:
          "Sagutan lamang ang bahaging ito kung hindi pareho ang iyong kasalukuyang address at permanenteng address.",
        fields: [
          {
            key: "permanentAddressBarangay",
            label: "Permanent Address — Barangay",
            type: "select",
            required: true,
            showIf: differentPermanentAddress,
            options: PASIG_BARANGAY_OPTIONS,
            placeholder: "Piliin ang barangay kung saan ka permanenteng nakatira.",
          },
          {
            key: "permanentAddressHouseBlockUnitNumber",
            label:
              "Permanent Address — House/Block/Unit Number (Number ng permanenteng tirahan)",
            type: "text",
            showIf: differentPermanentAddress,
            placeholder: "Example: 12-B",
          },
          {
            key: "permanentAddressStreetAddress",
            label:
              "Permanent Address — Street Address (Street kung nasaan ang permanenteng tirahan)",
            type: "text",
            required: true,
            showIf: differentPermanentAddress,
            placeholder: "Example: Alcalde Jose St.",
          },
        ],
      },
    ],
  },
  {
    stepNumber: 3,
    path: "/profiling/step-3",
    title: "Education",
    subtitle:
      "Continue with your educational background, school status, and senior high or vocational path.",
    sections: [
      {
        title: "Educational Background",
        fields: [
          {
            key: "highestEducationalAttainment",
            label: "Highest Educational Attainment (Ano ang pinakamataas na antas ng edukasyon ang iyo nang natapos o naabot?)",
            type: "select",
            required: true,
            options: HIGHEST_EDUCATIONAL_ATTAINMENT_OPTIONS,
            placeholder: "Pumili lamang ng isa.",
          },
          {
            key: "currentlyStudyingOrEnrolled",
            label:
              "Are you currently studying or enrolled in school? (Ikaw ba ay kasalukuyang nag-aaral o naka-enrol sa paaralan?)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "seniorHighSchoolTrack",
            label:
              "Which Senior High School Track have you completed or are you currently taking? (Aling Senior High School Track ang iyo nang natapos o kasalukuyang kinukuha?)",
            type: "radio",
            required: true,
            showIf: shouldAskSeniorHighTrack,
            options: SENIOR_HIGH_TRACK_OPTIONS,
            otherKey: "seniorHighSchoolTrackOther",
          },
          {
            key: "seniorHighSchoolStrand",
            label:
              "Which Senior High School Strand have you completed or are you currently taking? (Aling Senior High School Strand ang iyo nang natapos o kasalukuyang kinukuha?)",
            type: "radio",
            required: true,
            showIf: shouldAskSeniorHighStrand,
            options: SENIOR_HIGH_STRAND_OPTIONS,
            otherKey: "seniorHighSchoolStrandOther",
          },
          {
            key: "vocationalTradeCourse",
            label:
              "Which Vocational/Trade Course have you completed or are you currently taking? (Aling Vocational/Trade Course ang iyo nang natapos o kasalukuyang kinukuha?)",
            type: "radio",
            required: true,
            showIf: shouldAskVocationalCourse,
            options: VOCATIONAL_TRADE_COURSE_OPTIONS,
            otherKey: "vocationalTradeCourseOther",
          },
        ],
      },
      {
        title: "Youth in School",
        description:
          "Makikita lamang ang mga tanong na ito kapag sumagot ka ng Yes sa kasalukuyang pag-aaral o enrolment.",
        fields: [
          {
            key: "schoolType",
            label:
              "School Type (Sa aling uri ng paaralan ka kasalukuyang nag-aaral o naka-enrol?)",
            type: "radio",
            required: true,
            showIf: currentlyInSchool,
            options: SCHOOL_TYPE_OPTIONS,
          },
          {
            key: "enrolledInAlternativeLearningSystem",
            label:
              "Are you currently studying or enrolled in the Alternative Learning System? (Ikaw ba ay kasalukuyang nag-aaral o naka-enrol sa Alternative Learning System o ALS?)",
            type: "radio",
            required: true,
            showIf: currentlyInSchool,
            options: YES_NO_OPTIONS,
          },
          {
            key: "scholarshipProgram",
            label:
              "Are you a beneficiary of a scholarship program? (Ikaw ba ay isang beneficiary ng isang scholarship program?)",
            type: "radio",
            required: true,
            showIf: currentlyInSchool,
            options: SCHOLARSHIP_PROGRAM_OPTIONS,
          },
        ],
      },
      {
        title: "Out-of-School Youth",
        description:
          "Kapag hindi ka kasalukuyang nag-aaral o naka-enrol, ilagay ang pangunahing dahilan dito.",
        fields: [
          {
            key: "mainReasonNotInSchool",
            label:
              "Main reason for not being in school (Ano ang pangunahing dahilan kung bakit ikaw ay kasalukuyang hindi nag-aaral o naka-enrol sa paaralan?)",
            type: "radio",
            required: true,
            showIf: currentlyNotInSchool,
            options: REASON_NOT_IN_SCHOOL_OPTIONS,
            otherKey: "mainReasonNotInSchoolOther",
          },
        ],
      },
    ],
  },
  {
    stepNumber: 4,
    path: "/profiling/step-4",
    title: "Employment & Livelihood",
    subtitle:
      "Map your current work status, sources of funds, and business or livelihood activity.",
    sections: [
      {
        title: "Employment",
        fields: [
          {
            key: "employmentStatus",
            label: "Employment Status (Ikaw ba ay kasalukuyang may trabaho?)",
            type: "radio",
            required: true,
            options: EMPLOYMENT_STATUS_OPTIONS,
          },
          {
            key: "employmentSector",
            label: "Employment Sector (Sa aling sektor kabilang ang iyong kasalukuyang trabaho?)",
            type: "radio",
            required: true,
            showIf: currentlyEmployed,
            options: EMPLOYMENT_SECTOR_OPTIONS,
          },
          {
            key: "minimumWageEarner",
            label: "Are you a minimum wage earner? (Ikaw ba ay isang minimum wage earner?)",
            type: "radio",
            required: true,
            showIf: currentlyEmployed,
            description:
              "Ang kasalukuyang minimum wage sa National Capital Region (NCR) ay P695.00 kada araw. Ang mga kasambahay naman sa NCR ay nararapat na makatanggap ng P7,800.00 kada buwan.",
            options: YES_NO_OPTIONS,
          },
          {
            key: "ageFirstEmployed",
            label: "How old were you when you were first employed? (Ilang taon ka noong ikaw ay unang nagtrabaho?)",
            type: "select",
            required: true,
            options: AGE_1_TO_35_WITH_NOT_APPLICABLE_OPTIONS,
            placeholder: "Select age or Not Applicable",
            helperText:
              'Piliin ang "Not Applicable" kung hindi ka pa nagka-trabaho o nagtrabaho.',
          },
        ],
      },
      {
        title: "Income & Support",
        fields: [
          {
            key: "primarySourceOfFunds",
            label:
              "What is your primary source of money or funds for everyday expenses? (Ano ang pangunahing pinagkukunan mo ng panggastos sa pang-araw-araw?)",
            type: "radio",
            required: true,
            options: PRIMARY_SOURCE_OF_FUNDS_OPTIONS,
            otherKey: "primarySourceOfFundsOther",
          },
          {
            key: "earningsEnoughForDailyNeeds",
            label:
              "Are your earnings enough for your daily needs? (Sapat ba ang iyong kinikita para matustusan ang iyong pang-araw-araw na pangangailangan?)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "hasOfwFamilyMember",
            label:
              "Do you have a family member who is an Overseas Filipino Worker (OFW)? (Mayroon ka bang kamag-anak na isang OFW?)",
            type: "radio",
            required: true,
            options: ["Yes (Mayroon)", "None (Wala)"],
          },
        ],
      },
      {
        title: "Business",
        fields: [
          {
            key: "ownsBusiness",
            label: "Do you own a business? (Ikaw ba ay nagmamay-ari ng isang negosyo?)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "businessSector",
            label: "Business Sector (Sa aling sektor kabilang ang iyong negosyo?)",
            type: "radio",
            required: true,
            showIf: ownsBusiness,
            options: BUSINESS_SECTOR_OPTIONS,
            otherKey: "businessSectorOther",
          },
        ],
      },
    ],
  },
  {
    stepNumber: 5,
    path: "/profiling/step-5",
    title: "Health & Wellbeing",
    subtitle:
      "This step covers physical health, disability context, and the mental health portion of the survey.",
    sections: [
      {
        title: "Physical Health & Disability",
        fields: [
          {
            key: "physicalHealthAssessment",
            label:
              "How would you assess your physical health? (Ano ang masasabi mo tungkol sa iyong pampisikal na kalusugan?)",
            type: "radio",
            required: true,
            options: VERY_GOOD_TO_VERY_POOR_OPTIONS,
          },
          {
            key: "personWithDisability",
            label: "Are you a Person With Disability (PWD)? (Ikaw ba ay isang PWD?)",
            type: "radio",
            required: true,
            options: ["Yes (Oo)", "No (Hindi)", "Prefer not to say (Mas gusto kong huwag sabihin)"],
          },
          {
            key: "disabilityType",
            label:
              "For Persons With Disability: Which type of disability do you have? (Para sa mga PWD: Aling uri ng disability ang mayroon ka?)",
            type: "radio",
            required: true,
            showIf: personWithDisability,
            options: DISABILITY_TYPE_OPTIONS,
            otherKey: "disabilityTypeOther",
          },
        ],
      },
      {
        title: "Mental Health",
        fields: [
          {
            key: "emotionalDistressFrequency",
            label:
              'In the past month, have you experienced emotional distress (feeling overwhelmed, sad, or "down")? (Sa nakaraang buwan, ikaw ba ay nakaranas ng emotional distress?)',
            type: "radio",
            required: true,
            options: [...NEVER_SOMETIMES_OFTEN_OPTIONS, "Prefer not to say (Mas gusto kong huwag sabihin)"],
          },
          {
            key: "stressPhysicalSymptomsFrequency",
            label:
              "In the past month, have you experienced physical symptoms when stressed (headache, stomachache)? (Sa nakaraang buwan, ikaw ba ay nakaranas ng physical symptoms tuwing stressed?)",
            type: "radio",
            required: true,
            options: [...NEVER_SOMETIMES_OFTEN_OPTIONS, "Prefer not to say (Mas gusto kong huwag sabihin)"],
          },
          {
            key: "difficultyConcentratingFrequency",
            label:
              "In the past month, have you experienced difficulty concentrating? (Sa nakaraang buwan, ikaw ba ay nakaranas ng kahirapan sa pag-concentrate?)",
            type: "radio",
            required: true,
            options: [...NEVER_SOMETIMES_OFTEN_OPTIONS, "Prefer not to say (Mas gusto kong huwag sabihin)"],
          },
          {
            key: "feelingAloneFrequency",
            label:
              "In the past month, have you experienced feeling alone or not understood? (Sa nakaraang buwan, ikaw ba ay nakaranas ng pakiramdam ng pagiging mag-isa o hindi naiintindihan ng mga nakapaligid sa iyo?)",
            type: "radio",
            required: true,
            options: [...NEVER_SOMETIMES_OFTEN_OPTIONS, "Prefer not to say (Mas gusto kong huwag sabihin)"],
          },
          {
            key: "lossOfInterestFrequency",
            label:
              "In the past month, have you experienced loss of interest in usual activities? (Sa nakaraang buwan, ikaw ba ay nakaranas ng kawalan ng interes sa mga karaniwang aktibidad?)",
            type: "radio",
            required: true,
            options: [...NEVER_SOMETIMES_OFTEN_OPTIONS, "Prefer not to say (Mas gusto kong huwag sabihin)"],
          },
          {
            key: "feelingAnxiousFrequency",
            label:
              'In the past month, have you experienced feeling anxious or "on edge?" (Sa nakaraang buwan, ikaw ba ay nakaranas ng pakiramdam ng pagka-balisa?)',
            type: "radio",
            required: true,
            options: [...NEVER_SOMETIMES_OFTEN_OPTIONS, "Prefer not to say (Mas gusto kong huwag sabihin)"],
          },
          {
            key: "feelingHopelessFrequency",
            label:
              "In the past month, have you experienced feeling hopeless? (Sa nakaraang buwan, ikaw ba ay nakaranas ng pakiramdam ng kawalan ng pag-asa?)",
            type: "radio",
            required: true,
            options: [...NEVER_SOMETIMES_OFTEN_OPTIONS, "Prefer not to say (Mas gusto kong huwag sabihin)"],
          },
          {
            key: "biggestSourceOfStress",
            label:
              "Which is your biggest source of stress? (Alin sa mga ito ang pinakamalaking pinanggagalingan ng iyong stress?)",
            type: "radio",
            required: true,
            options: BIGGEST_SOURCE_OF_STRESS_OPTIONS,
            otherKey: "biggestSourceOfStressOther",
          },
          {
            key: "firstSupportInStress",
            label:
              "Who is your first support in times of stress? (Sino ang una mong nilalapitan tuwing ikaw ay nakararanas ng stress?)",
            type: "radio",
            required: true,
            options: FIRST_SUPPORT_IN_STRESS_OPTIONS,
            otherKey: "firstSupportInStressOther",
          },
          {
            key: "mentalHealthSupportType",
            label:
              "Which type of support have mainly helped with your mental health? (Aling uri ng suporta ang pangunahing nakatulong sa iyong mental health?)",
            type: "radio",
            required: true,
            options: MENTAL_HEALTH_SUPPORT_OPTIONS,
            otherKey: "mentalHealthSupportTypeOther",
          },
          {
            key: "mentalHealthInfoSource",
            label:
              "What is your main source of information about mental health? (Saan ka pangunahing kumukuha ng impormasyon ukol sa mental health?)",
            type: "radio",
            required: true,
            options: INFO_SOURCE_OPTIONS,
            otherKey: "mentalHealthInfoSourceOther",
          },
        ],
      },
    ],
  },
  {
    stepNumber: 6,
    path: "/profiling/step-6",
    title: "Risk, Reproductive Health & Vaccines",
    subtitle:
      "Finish the health section with lifestyle, reproductive health, HIV awareness, and vaccine perception.",
    sections: [
      {
        title: "Health Risk Behaviors",
        fields: [
          {
            key: "smokingStatus",
            label: "Do you smoke? (Ikaw ba ay naninigarilyo?)",
            type: "radio",
            required: true,
            options: SMOKING_STATUS_OPTIONS,
          },
          {
            key: "smokingStartAge",
            label: "How old were you when you started smoking? (Anong edad ka unang nanigarilyo?)",
            type: "select",
            required: true,
            showIf: hasSmokingHistory,
            options: AGE_1_TO_35_WITH_NOT_APPLICABLE_OPTIONS,
            placeholder: "Select age or Not Applicable",
            helperText:
              'Piliin ang "Not Applicable" kung ikaw ay hindi pa naninigarilyo.',
          },
          {
            key: "thinksSmokingIsBad",
            label:
              "Do you think smoking is bad for your health? (Sa iyong palagay, masama ba sa iyong kalusugan ang paninigarilyo?)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "alcoholConsumptionStatus",
            label: "Do you consume alcoholic drinks? (Ikaw ba ay umiinom ng mga inuming may alcohol?)",
            type: "radio",
            required: true,
            description:
              'Ilan sa mga halimbawa ng "alcoholic drink" ang beer, wine, at spirits.',
            options: ALCOHOL_STATUS_OPTIONS,
          },
          {
            key: "alcoholStartAge",
            label:
              "How old were you when you started consuming alcoholic drinks? (Anong edad ka unang uminom ng mga inuming may alcohol?)",
            type: "select",
            required: true,
            showIf: hasAlcoholHistory,
            options: AGE_1_TO_35_WITH_NOT_APPLICABLE_OPTIONS,
            placeholder: "Select age or Not Applicable",
            helperText:
              'Piliin ang "Not Applicable" kung ikaw ay hindi pa nakakainom ng mga alcoholic drinks.',
          },
          {
            key: "thinksAlcoholIsBad",
            label:
              "Do you think consuming alcoholic drinks is bad for your health? (Sa iyong palagay, masama ba sa iyong kalusugan ang pag-inom ng mga inuming may alcohol?)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
        ],
      },
      {
        title: "Reproductive Health",
        fields: [
          {
            key: "ageAtFirstSexExperience",
            label: "Age at first sex experience (Ano ang iyong edad noong ikaw ay unang nakipagtalik?)",
            type: "select",
            required: true,
            options: AGE_1_TO_35_WITH_FALLBACK_OPTIONS,
            placeholder: "Select age or an option",
            helperText:
              'Piliin ang "Not Applicable" kung ikaw ay wala pang sex experience. Maaari ring piliin ang "Prefer not to say (Mas gusto kong huwag sabihin)."',
          },
          {
            key: "numberOfChildren",
            label: "How many children do you have? (Ilan na ang iyong mga anak?)",
            type: "select",
            required: true,
            options: CHILD_COUNT_WITH_FALLBACK_OPTIONS,
            placeholder: "Select number of children or an option",
            helperText:
              'Piliin ang "Not Applicable" kung ikaw ay wala pang anak. Maaari ring piliin ang "Prefer not to say (Mas gusto kong huwag sabihin)."',
          },
          {
            key: "ageAtFirstPregnancy",
            label: "For females only: Age at first pregnancy (Anong edad ka unang nabuntis?)",
            type: "select",
            required: true,
            showIf: femaleWithSexExperience,
            options: AGE_1_TO_35_WITH_FALLBACK_OPTIONS,
            placeholder: "Select age or an option",
            helperText:
              'Piliin ang "Not Applicable" kung ikaw ay hindi pa nabubuntis o kung ikaw ay isang lalaki. Maaari ring piliin ang "Prefer not to say (Mas gusto kong huwag sabihin)."',
          },
          {
            key: "ageAtFirstImpregnation",
            label:
              "For males only: At what age did you first impregnate a girl or woman? (Sa anong edad ka unang nakabuntis?)",
            type: "select",
            required: true,
            showIf: maleWithSexExperience,
            options: AGE_1_TO_35_WITH_FALLBACK_OPTIONS,
            placeholder: "Select age or an option",
            helperText:
              'Piliin ang "Not Applicable" kung ikaw ay hindi pa nakakabuntis o kung ikaw ay isang babae. Maaari ring piliin ang "Prefer not to say (Mas gusto kong huwag sabihin)."',
          },
          {
            key: "soloParent",
            label: "Are you a solo parent? (Ikaw ba ay isang solo parent?)",
            type: "radio",
            required: true,
            showIf: hasChildren,
            options: SOLO_PARENT_OPTIONS,
          },
          {
            key: "thinksContraceptiveUseImportant",
            label:
              "Do you think that contraceptive use is important for reproductive health? (Sa iyong palagay, mahalaga ba ang paggamit ng contraceptives para sa iyong reproductive health?)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "contraceptiveMethodsUsed",
            label:
              "Which of the following contraceptive methods have you used? (Alin sa mga sumusunod na contraceptive methods ang nagamit mo na?)",
            type: "checkbox",
            required: true,
            showIf: hasSexExperience,
            options: CONTRACEPTIVE_METHOD_OPTIONS,
            otherKey: "contraceptiveMethodsUsedOther",
            helperText: "Maaaring pumili ng higit sa isa.",
          },
          {
            key: "facedContraceptiveAccessBarriers",
            label:
              "Have you ever encountered barriers to accessing contraceptives at a time when you needed or wanted to use them? (Naranasan mo na bang mahadlangan ang iyong pag-access sa contraceptives sa oras ng iyong pangangailangan o kagustuhang gamitin ito?)",
            type: "radio",
            required: true,
            showIf: hasSexExperience,
            options: ["Yes (Oo)", "No (Hindi)", "Not Applicable (Hindi ako gumagamit ng contraceptives)"],
          },
          {
            key: "contraceptiveInfoSource",
            label:
              "What is your main source of information about contraceptives? (Saan ka pangunahing kumukuha ng impormasyon ukol sa mga contraceptive?)",
            type: "radio",
            required: true,
            options: INFO_SOURCE_OPTIONS,
            otherKey: "contraceptiveInfoSourceOther",
          },
          {
            key: "knowledgeableAboutHivAids",
            label:
              "Do you consider yourself knowledgeable about HIV/AIDS: How it is transmitted, how it is treated, and how it can be prevented? (Itinuturing mo ba ang iyong sarili na maalam ukol sa HIV/AIDS: Kung paano ito kumakalat, paano ito maaaring magamot, at kung paano ito maaaring sansalain?)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
        ],
      },
      {
        title: "Vaccines",
        fields: [
          {
            key: "vaccineOpinion",
            label:
              "What is your opinion of vaccines and vaccinations? (Ano ang iyong opinyon ukol sa mga bakuna at pagbabakuna?)",
            type: "radio",
            required: true,
            options: VACCINE_OPINION_OPTIONS,
          },
          {
            key: "vaccineInfoSource",
            label:
              "What is your main source of information about vaccines and vaccinations? (Saan ka pangunahing kumukuha ng impormasyon ukol sa mga bakuna at pagbabakuna?)",
            type: "radio",
            required: true,
            options: INFO_SOURCE_OPTIONS,
            otherKey: "vaccineInfoSourceOther",
          },
        ],
      },
    ],
  },
  {
    stepNumber: 7,
    path: "/profiling/step-7",
    title: "Civic Engagement & Security",
    subtitle:
      "Track voting participation, KK assembly attendance, and your sense of safety at home, school, work, and online.",
    sections: [
      {
        title: "Civic Engagement",
        fields: [
          {
            key: "votedDuring2023BarangayAndSkElections",
            label:
              "Did you vote during the 2023 Barangay and SK Elections? (Bumoto ka ba noong 2023 Barangay at SK Elections?)",
            type: "radio",
            required: true,
            options: VOTING_OPTIONS,
          },
          {
            key: "votedDuring2025MidtermAndLocalElections",
            label:
              "Did you vote during the 2025 Philippine Midterm and Local Elections? (Bumoto ka ba noong 2025 Philippine Midterm at Local Elections?)",
            type: "radio",
            required: true,
            options: VOTING_OPTIONS,
          },
          {
            key: "attendedKkAssemblySinceJanuary2024",
            label:
              "Since January 2024, have you attended at least one Katipunan ng Kabataan (KK) Assembly? (Mula Enero 2024, ikaw ba ay nakadalo sa kahit isang KK Assembly?)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "csoMemberOrVolunteer",
            label:
              "Are you a member of or do you volunteer for any Civil Society Organization (CSO)? (Isa ka bang miyembro o nagvo-volunteer ka ba para sa kahit anong CSO?)",
            type: "radio",
            required: true,
            description:
              "Mga halimbawa ng CSO: non-governmental organizations, people's organizations, civic organizations, youth and youth-serving organizations, cooperatives, social movements, professional groups/clubs, business groups/clubs, student groups/clubs/councils, sports groups/clubs, faith-based groups/clubs, charities, at maging people's councils.",
            options: YES_NO_OPTIONS,
          },
        ],
      },
      {
        title: "Security",
        fields: [
          {
            key: "feelsSafeAtHome",
            label: "Do you feel safe at home? (Pakiramdam mo ba'y ligtas ka sa iyong bahay o tahanan?)",
            type: "radio",
            required: true,
            options: NEVER_SOMETIMES_OFTEN_OPTIONS,
          },
          {
            key: "feelsSafeInSchool",
            label: "Do you feel safe in school? (Pakiramdam mo ba'y ligtas ka sa iyong paaralan?)",
            type: "radio",
            required: true,
            showIf: currentlyInSchool,
            options: [...NEVER_SOMETIMES_OFTEN_OPTIONS, "Not Applicable (Hindi ako kasalukuyang naka-enrol sa paaralan)"],
          },
          {
            key: "feelsSafeAtWorkplace",
            label: "Do you feel safe in your workplace? (Pakiramdam mo ba'y ligtas ka sa lugar ng iyong trabaho?)",
            type: "radio",
            required: true,
            showIf: currentlyEmployed,
            options: [...NEVER_SOMETIMES_OFTEN_OPTIONS, "Not Applicable (Hindi ako kasalukuyang employed o nagtatrabaho)"],
          },
          {
            key: "feelsSafeInCommunity",
            label:
              "Do you feel safe in your neighborhood or community? (Pakiramdam mo ba'y ligtas ka sa iyong kapitbahayan o komunidad?)",
            type: "radio",
            required: true,
            options: NEVER_SOMETIMES_OFTEN_OPTIONS,
          },
          {
            key: "feelsSafeOnline",
            label:
              "Do you feel safe browsing the internet and using social media? (Pakiramdam mo ba'y ligtas ka sa paggamit ng internet at social media?)",
            type: "radio",
            required: true,
            options: NEVER_SOMETIMES_OFTEN_OPTIONS,
          },
          {
            key: "usesArtificialIntelligence",
            label: "Do you use Artificial Intelligence (AI) for any purpose? (Gumagamit ka ba ng AI para sa kung ano mang bagay?)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "cybercrimeVictim",
            label:
              "Have you ever fallen victim to any form of cybercrime? (Ikaw ba ay naging biktima na ng kahit anong uri ng cybercrime?)",
            type: "radio",
            required: true,
            options: CYBERCRIME_OPTIONS,
          },
          {
            key: "onlineBettingOrGambling",
            label:
              "Do you engage in online betting/gambling? (Ikaw ba ay nag-o-online betting o gambling?)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "weeklyBettingSpend",
            label:
              "How much do you spend, in pesos, for online betting/gambling in a week? (Gaano kalaki ang iyong nagagastos, in pesos, para sa online betting o gambling kada linggo?)",
            type: "text",
            required: true,
            showIf: onlineGambler,
            placeholder: 'Halimbawa: 1500 o "Not Applicable"',
            helperText:
              'Ilagay ang "Not Applicable" kung hindi nag-o-online betting o gambling.',
            inputMode: "numeric",
          },
        ],
      },
    ],
  },
  {
    stepNumber: 8,
    path: "/profiling/step-8",
    title: "Disaster & Mobility",
    subtitle:
      "Record your disaster readiness outlook and the transportation modes you rely on every day.",
    sections: [
      {
        title: "Disaster Preparedness",
        fields: [
          {
            key: "communityAffectedByDisasterPastYear",
            label:
              "In the past year, has your community been affected by any disaster or emergency? (Sa nakaraang taon, naapektuhan ba ng kahit anong disaster o emergency ang iyong komunidad?)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "disasterReadinessAgreement",
            label:
              "Agree or Disagree: My family and I are ready in case of disaster or emergency. (Sang-ayon o Hindi sang-ayon: Handa ako at ang aking pamilya kung sakaling magkaroon ng disaster o emergency.)",
            type: "radio",
            required: true,
            options: STRONGLY_AGREE_OPTIONS,
          },
          {
            key: "drillsEffectivenessAgreement",
            label:
              "Agree or Disagree: The fire and earthquake drills in my school, workplace, or community are effective in preparing me for potential disasters. (Sang-ayon o Hindi sang-ayon: Epektibo ang mga fire at earthquake drill sa aking paaralan, lugar ng trabaho, o komunidad sa paghahanda sa akin para sa mga potential disaster.)",
            type: "radio",
            required: true,
            options: STRONGLY_AGREE_OPTIONS,
          },
        ],
      },
      {
        title: "Urban Mobility",
        fields: [
          {
            key: "transportationModesUsedDaily",
            label:
              "Which of these transportation modes do you use on a daily basis? (Alin sa mga transportation modes na ito ang ginagamit mo sa pang-araw-araw?)",
            type: "checkbox",
            required: true,
            helperText:
              "Maaaring pumili ng higit sa isa. TNVS refers to private vehicles accredited by the LTFRB to provide pre-arranged transportation services via digital platforms.",
            options: TRANSPORTATION_MODE_OPTIONS,
            otherKey: "transportationModesUsedDailyOther",
          },
          {
            key: "sidewalkQuality",
            label: "Rate the quality of Pasig City's sidewalks (I-rate ang kalidad ng mga sidewalk sa Pasig City)",
            type: "radio",
            required: true,
            options: VERY_GOOD_TO_VERY_POOR_OPTIONS,
          },
          {
            key: "bikeLaneQuality",
            label: "Rate the quality of Pasig City's bike lanes (I-rate ang kalidad ng mga bike lane sa Pasig City)",
            type: "radio",
            required: true,
            options: VERY_GOOD_TO_VERY_POOR_OPTIONS,
          },
        ],
      },
    ],
  },
  {
    stepNumber: 9,
    path: "/profiling/step-9",
    title: "Aspirations",
    subtitle:
      "Wrap up the profiling flow with your future plans for study, work, business, marriage, and family.",
    sections: [
      {
        title: "Future Plans",
        fields: [
          {
            key: "wantsToStudyAbroad",
            label: "I want to study abroad someday (Gusto kong mag-aral sa ibang bansa balang araw)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "wantsToWorkAbroad",
            label: "I want to work abroad someday (Gusto kong mag-trabaho sa ibang bansa balang araw)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "wantsToStartBusiness",
            label: "I want to start my own business someday (Gusto kong magkaroon ng sariling negosyo balang araw)",
            type: "radio",
            required: true,
            options: WANTS_START_BUSINESS_OPTIONS,
          },
          {
            key: "wantsToGetMarried",
            label: "I want to get married someday (Gusto kong magpakasal balang araw)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
          {
            key: "wantsToHaveChildren",
            label: "I want to have children someday (Gusto kong magkaroon ng anak/mga anak balang araw)",
            type: "radio",
            required: true,
            options: YES_NO_OPTIONS,
          },
        ],
      },
    ],
  },
];

export const TOTAL_STEPS = PROFILING_STEPS.length;

function isBlank(value: unknown) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return String(value ?? "").trim().length === 0;
}

export function getAgeGroupFromAge(age: number | string) {
  const value = typeof age === "string" ? parseInt(age, 10) : age;

  if (!value || Number.isNaN(value)) return "";
  if (value >= 15 && value <= 17) return "Child Youth";
  if (value >= 18 && value <= 24) return "Core Youth";
  if (value >= 25 && value <= 30) return "Adult Youth";

  return "";
}

export function isFieldVisible(field: ProfilingFieldConfig, draft: ProfilingDraft) {
  return field.showIf ? field.showIf(draft) : true;
}

function setDraftField<K extends keyof ProfilingDraft>(
  draft: ProfilingDraft,
  key: K,
  value: ProfilingDraft[K]
) {
  draft[key] = value;
}

function getClearedFieldValue(field: ProfilingFieldConfig) {
  return (field.type === "checkbox" ? [] : "") as ProfilingDraft[keyof ProfilingDraft];
}

function hasAllowedSingleChoiceValue(
  field: ProfilingFieldConfig,
  value: ProfilingDraft[keyof ProfilingDraft]
) {
  if ((field.type !== "radio" && field.type !== "select") || !field.options?.length) {
    return true;
  }

  if (typeof value !== "string") {
    return isBlank(value);
  }

  return !value || field.options.includes(value);
}

export function sanitizeDraftForVisibility(draft: ProfilingDraft) {
  const nextDraft: ProfilingDraft = { ...draft };
  const allFields = PROFILING_STEPS.flatMap((step) =>
    step.sections.flatMap((section) => section.fields)
  );

  let changed = false;

  do {
    changed = false;

    for (const field of allFields) {
      const fieldVisible = isFieldVisible(field, nextDraft);

      if (!fieldVisible) {
        if (!isBlank(nextDraft[field.key])) {
          setDraftField(
            nextDraft,
            field.key,
            getClearedFieldValue(field) as ProfilingDraft[typeof field.key]
          );
          changed = true;
        }

        if (field.otherKey && !isBlank(nextDraft[field.otherKey])) {
          setDraftField(
            nextDraft,
            field.otherKey,
            "" as ProfilingDraft[typeof field.otherKey]
          );
          changed = true;
        }

        continue;
      }

      if (!hasAllowedSingleChoiceValue(field, nextDraft[field.key])) {
        setDraftField(
          nextDraft,
          field.key,
          getClearedFieldValue(field) as ProfilingDraft[typeof field.key]
        );

        if (field.otherKey && !isBlank(nextDraft[field.otherKey])) {
          setDraftField(
            nextDraft,
            field.otherKey,
            "" as ProfilingDraft[typeof field.otherKey]
          );
        }

        changed = true;
        continue;
      }

      if (
        field.otherKey &&
        !isOtherOptionSelected(field, nextDraft) &&
        !isBlank(nextDraft[field.otherKey])
      ) {
        setDraftField(
          nextDraft,
          field.otherKey,
          "" as ProfilingDraft[typeof field.otherKey]
        );
        changed = true;
      }
    }
  } while (changed);

  return nextDraft;
}

export function isOtherOptionSelected(field: ProfilingFieldConfig, draft: ProfilingDraft) {
  if (!field.otherKey) return false;

  const value = draft[field.key];
  if (Array.isArray(value)) {
    return value.some((entry) => entry.startsWith("Other:"));
  }

  return String(value || "").startsWith("Other:");
}

function isFieldComplete(field: ProfilingFieldConfig, draft: ProfilingDraft) {
  if (!field.required || !isFieldVisible(field, draft)) return true;

  const value = draft[field.key];
  if (isBlank(value)) return false;
  if (!hasAllowedSingleChoiceValue(field, value)) return false;

  if (field.otherKey && isOtherOptionSelected(field, draft)) {
    return !isBlank(draft[field.otherKey]);
  }

  return true;
}

export function getStepByNumber(stepNumber: number) {
  return PROFILING_STEPS.find((step) => step.stepNumber === stepNumber) || PROFILING_STEPS[0];
}

export function getNextStepPath(stepNumber: number) {
  return PROFILING_STEPS[stepNumber]?.path || "/profiling/review";
}

export function getPreviousStepPath(stepNumber: number) {
  if (stepNumber <= 1) return "/intro";
  return PROFILING_STEPS[stepNumber - 2]?.path || "/intro";
}

export function isStepComplete(step: ProfilingStepConfig, draft: ProfilingDraft) {
  const allFields = step.sections.flatMap((section) => section.fields);
  const fieldsComplete = allFields.every((field) => isFieldComplete(field, draft));

  if (!fieldsComplete) return false;

  if (step.stepNumber === 1 && draft.privacyConsent !== CONSENT_AGREE) {
    return false;
  }

  return true;
}

export function getProfilingResumePathFromDraft(draft: ProfilingDraft) {
  const firstIncomplete = PROFILING_STEPS.find((step) => !isStepComplete(step, draft));
  return firstIncomplete?.path || "/profiling/review";
}

function getMonthNumber(monthLabel?: string) {
  const monthIndex = MONTH_OPTIONS.findIndex((option) => option === monthLabel);
  return monthIndex >= 0 ? String(monthIndex + 1).padStart(2, "0") : "";
}

function deriveBirthday(draft: ProfilingDraft) {
  if (!draft.yearOfBirth || !draft.monthOfBirth || !draft.dayOfBirth) return "";

  const monthNumber = getMonthNumber(draft.monthOfBirth);
  const day = String(draft.dayOfBirth).padStart(2, "0");

  if (!monthNumber) return "";
  return `${draft.yearOfBirth}-${monthNumber}-${day}`;
}

function normalizeSingleChoice(value?: string, otherValue?: string) {
  if (!value) return "";
  if (value.startsWith("Other:")) {
    return otherValue?.trim() || "Other";
  }
  return value;
}

function normalizeMultiChoice(values?: string[], otherValue?: string) {
  if (!values || values.length === 0) return [];

  return values.map((value) => {
    if (value.startsWith("Other:")) {
      return otherValue?.trim() || "Other";
    }
    return value;
  });
}

function deriveYouthClassification(draft: ProfilingDraft) {
  if (draft.personWithDisability === "Yes (Oo)") {
    return "Youth with Disability";
  }

  if (draft.currentlyStudyingOrEnrolled === "Yes (Oo)") {
    return "In-school Youth";
  }

  if (draft.employmentStatus === "Yes, I am currently employed (Oo, ako ay kasalukuyang employed)") {
    return "Working Youth";
  }

  return "Out-of-school Youth";
}

function deriveWorkStatus(draft: ProfilingDraft) {
  if (draft.employmentStatus === "Yes, I am currently employed (Oo, ako ay kasalukuyang employed)") {
    return "Employed";
  }

  if (draft.employmentStatus === "No, but I am currently looking for work (Hindi, ngunit ako ay kasalukuyang naghahanap ng trabaho)") {
    return "Looking for Work";
  }

  if (draft.employmentStatus === "No, I am currently not employed (Hindi, ako ay kasalukuyang hindi employed)") {
    return "Unemployed";
  }

  return "";
}

export function buildProfilingPayload(draft: ProfilingDraft) {
  const sanitizedDraft = sanitizeDraftForVisibility({ ...draft });
  const { digitalIdSignatureDataUrl: _digitalIdSignatureDataUrl, ...profileDraft } = sanitizedDraft;
  const age = parseInt(String(profileDraft.ageAtLastBirthday || ""), 10);
  const birthday = deriveBirthday(profileDraft);
  const youthAgeGroup = getAgeGroupFromAge(Number.isNaN(age) ? "" : age);
  const currentBarangay = profileDraft.currentAddressBarangay || "";
  const sameAddress = sameAsPermanentAddress(profileDraft);
  const permanentBarangay = sameAddress
    ? currentBarangay
    : profileDraft.permanentAddressBarangay || "";
  const permanentStreetAddress = sameAddress
    ? profileDraft.currentAddressStreetAddress || ""
    : profileDraft.permanentAddressStreetAddress || "";
  const permanentHouseUnit = sameAddress
    ? profileDraft.currentAddressHouseBlockUnitNumber || ""
    : profileDraft.permanentAddressHouseBlockUnitNumber || "";
  const voted2023 = profileDraft.votedDuring2023BarangayAndSkElections === "Yes (Oo)";
  const voted2025 = profileDraft.votedDuring2025MidtermAndLocalElections === "Yes (Oo)";
  const attendedAssembly = profileDraft.attendedKkAssemblySinceJanuary2024 === "Yes (Oo)";

  return {
    ...profileDraft,
    privacyConsentGranted: profileDraft.privacyConsent === CONSENT_AGREE,
    sexualOrientation: normalizeSingleChoice(
      profileDraft.sexualOrientation,
      profileDraft.sexualOrientationOther
    ),
    seniorHighSchoolTrack: normalizeSingleChoice(
      profileDraft.seniorHighSchoolTrack,
      profileDraft.seniorHighSchoolTrackOther
    ),
    seniorHighSchoolStrand: normalizeSingleChoice(
      profileDraft.seniorHighSchoolStrand,
      profileDraft.seniorHighSchoolStrandOther
    ),
    vocationalTradeCourse: normalizeSingleChoice(
      profileDraft.vocationalTradeCourse,
      profileDraft.vocationalTradeCourseOther
    ),
    mainReasonNotInSchool: normalizeSingleChoice(
      profileDraft.mainReasonNotInSchool,
      profileDraft.mainReasonNotInSchoolOther
    ),
    primarySourceOfFunds: normalizeSingleChoice(
      profileDraft.primarySourceOfFunds,
      profileDraft.primarySourceOfFundsOther
    ),
    businessSector: normalizeSingleChoice(
      profileDraft.businessSector,
      profileDraft.businessSectorOther
    ),
    disabilityType: normalizeSingleChoice(
      profileDraft.disabilityType,
      profileDraft.disabilityTypeOther
    ),
    biggestSourceOfStress: normalizeSingleChoice(
      profileDraft.biggestSourceOfStress,
      profileDraft.biggestSourceOfStressOther
    ),
    firstSupportInStress: normalizeSingleChoice(
      profileDraft.firstSupportInStress,
      profileDraft.firstSupportInStressOther
    ),
    mentalHealthSupportType: normalizeSingleChoice(
      profileDraft.mentalHealthSupportType,
      profileDraft.mentalHealthSupportTypeOther
    ),
    mentalHealthInfoSource: normalizeSingleChoice(
      profileDraft.mentalHealthInfoSource,
      profileDraft.mentalHealthInfoSourceOther
    ),
    contraceptiveMethodsUsed: normalizeMultiChoice(
      profileDraft.contraceptiveMethodsUsed,
      profileDraft.contraceptiveMethodsUsedOther
    ),
    contraceptiveInfoSource: normalizeSingleChoice(
      profileDraft.contraceptiveInfoSource,
      profileDraft.contraceptiveInfoSourceOther
    ),
    vaccineInfoSource: normalizeSingleChoice(
      profileDraft.vaccineInfoSource,
      profileDraft.vaccineInfoSourceOther
    ),
    transportationModesUsedDaily: normalizeMultiChoice(
      profileDraft.transportationModesUsedDaily,
      profileDraft.transportationModesUsedDailyOther
    ),

    // Legacy profile compatibility for the existing backend, admin, and digital ID flows.
    firstName: profileDraft.firstName?.trim() || "",
    middleName: profileDraft.middleName?.trim() || "",
    lastName: profileDraft.lastName?.trim() || "",
    suffix: "",
    gender: profileDraft.sexAssignedAtBirth || "",
    age: Number.isNaN(age) ? null : age,
    birthday,
    email: "",
    contactNumber: "",
    digitalIdEmergencyContactName: "",
    digitalIdEmergencyContactRelationship: "",
    digitalIdEmergencyContactPhone: "",
    region: "National Capital Region (NCR)",
    province: "Metro Manila",
    city: "Pasig City",
    barangay: currentBarangay,
    purok: "",
    civilStatus: profileDraft.civilStatus || "",
    youthAgeGroup,
    educationalBackground: profileDraft.highestEducationalAttainment || "",
    youthClassification: deriveYouthClassification(profileDraft),
    workStatus: deriveWorkStatus(profileDraft),
    registeredSkVoter: voted2023,
    votedLastSkElections: voted2023,
    registeredNationalVoter: voted2025,
    attendedKkAssembly: attendedAssembly,
    kkAssemblyTimesAttended: attendedAssembly ? 1 : 0,
    kkAssemblyReason: "",
    permanentAddressBarangay: permanentBarangay,
    permanentAddressStreetAddress: permanentStreetAddress,
    permanentAddressHouseBlockUnitNumber: permanentHouseUnit,
  };
}

export function formatFieldValueForReview(
  field: ProfilingFieldConfig,
  draft: ProfilingDraft
) {
  const value = draft[field.key];

  if (field.type === "signature") {
    return typeof value === "string" && value ? "Ready for your Digital ID" : "";
  }

  if (Array.isArray(value)) {
    const normalized = normalizeMultiChoice(value, field.otherKey ? String(draft[field.otherKey] || "") : "");
    return normalized.join(", ");
  }

  if (typeof value === "string" && value.startsWith("Other:")) {
    return field.otherKey ? String(draft[field.otherKey] || "").trim() : value;
  }

  return String(value || "");
}
