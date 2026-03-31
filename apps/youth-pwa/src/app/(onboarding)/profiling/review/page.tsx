"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitProfiling } from "@/services/profiling.service";
import {
  FooterBranding,
  ReviewAccordion,
  clearProfilingDraft,
  readProfilingDraft,
} from "../profiling-ui";

export default function ProfilingReviewPage() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setProfileData(readProfilingDraft() as Record<string, unknown>);
  }, []);

  const previousStep = useMemo(() => {
    return profileData.attendedKkAssembly === false
      ? "/profiling/step-9"
      : "/profiling/step-8";
  }, [profileData.attendedKkAssembly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await submitProfiling(
        readProfilingDraft() as Parameters<typeof submitProfiling>[0]
      );
      clearProfilingDraft();
      router.push("/profiling/sucess");
    } catch {
      setError("Failed to submit profiling. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pf-review-page">
      <div className="pf-review-topbar">
        <button
          className="pf-review-back"
          onClick={() => router.push(previousStep)}
          aria-label="Back"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="pf-review-topbar-title">KK Profiling</span>
      </div>

      <div className="pf-review-head">
        <h1 className="pf-review-title">Review Your Profile</h1>
        <p className="pf-review-subtitle">
          Kindly double check your information and ensure everything is correct
        </p>
      </div>
      <div className="pf-review-divider" />

      <div className="pf-review-cards">
        <ReviewAccordion
          title="Profile"
          openByDefault
          icon={<ProfileIcon />}
        >
          <div className="pf-review-grid">
            <Field label="First Name" value={profileData.firstName} />
            <Field label="Middle Name" value={profileData.middleName} />
            <Field label="Last Name" value={profileData.lastName} />
            <Field label="Suffix" value={profileData.suffix} />
            <Field label="Region" value={profileData.region} full />
            <Field label="Province" value={profileData.province} />
            <Field label="City/Municipality" value={profileData.city} />
            <Field label="Barangay" value={profileData.barangay} />
            <Field label="Purok/Zone" value={profileData.purok} />
            <Field
              label="Birthday"
              value={formatBirthday(profileData.birthday)}
              full
            />
            <Field label="Gender" value={profileData.gender} />
            <Field label="Age" value={profileData.age} />
            <Field label="Email" value={profileData.email} full />
            <Field
              label="Contact No."
              value={formatContactNumber(profileData.contactNumber)}
              full
            />
          </div>
        </ReviewAccordion>

        <ReviewAccordion
          title="Demographic Characteristics"
          icon={<DemographicIcon />}
        >
          <div className="pf-review-grid">
            <Field label="Civil Status" value={profileData.civilStatus} />
            <Field label="Youth Age Group" value={profileData.youthAgeGroup} />
            <Field
              label="Educational Background"
              value={profileData.educationalBackground}
              full
            />
            <Field
              label="Youth Classification"
              value={profileData.youthClassification}
            />
            <Field label="Work Status" value={profileData.workStatus} />
            <Field
              label="Registered SK Voter"
              value={toYesNo(profileData.registeredSkVoter)}
            />
            <Field
              label="Voted in Last SK Elections"
              value={toYesNo(profileData.votedLastSkElections)}
            />
            <Field
              label="Registered National Voter"
              value={toYesNo(profileData.registeredNationalVoter)}
            />
            <Field
              label="Attended KK Assembly"
              value={toYesNo(profileData.attendedKkAssembly)}
            />
            {profileData.attendedKkAssembly === true ? (
              <Field
                label="Times Attended"
                value={formatAssemblyAttendance(profileData.kkAssemblyTimesAttended)}
                full
              />
            ) : (
              <Field
                label="Reason"
                value={profileData.kkAssemblyReason}
                full
              />
            )}
          </div>
        </ReviewAccordion>
      </div>

      <form className="pf-review-bottombar" onSubmit={handleSubmit}>
        {error ? <p className="pf-review-error">{error}</p> : null}
        <button className="pf-review-next-btn" type="submit" disabled={isLoading}>
          {isLoading ? "Submitting..." : "Next"}
        </button>
      </form>

      <FooterBranding dark />
    </div>
  );
}

function Field({
  label,
  value,
  full,
}: {
  label: string;
  value: unknown;
  full?: boolean;
}) {
  return (
    <div className={`pf-review-field ${full ? "full" : ""}`}>
      <span className="pf-review-field-label">{label}</span>
      <span className="pf-review-field-value">
        {value === undefined || value === null || value === "" ? "-" : String(value)}
      </span>
    </div>
  );
}

function toYesNo(value: unknown) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "-";
}

function formatBirthday(value: unknown) {
  if (!value || typeof value !== "string") return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatContactNumber(value: unknown) {
  if (!value || typeof value !== "string") return "-";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}

function formatAssemblyAttendance(value: unknown) {
  if (typeof value !== "number") return "-";
  if (value <= 0) return "-";
  if (value <= 2) return "1-2 times";
  if (value <= 4) return "3-4 times";
  return "5 and above";
}

function ProfileIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 1 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function DemographicIcon() {
  return (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="7" r="2.5" />
      <path d="M3.5 18c.8-3 3.1-4.5 6.5-4.5s5.7 1.5 6.5 4.5" />
      <path d="M14.5 18c.5-2.1 2.1-3.3 4.5-3.3 1 0 1.8.2 2.5.6" />
    </svg>
  );
}
