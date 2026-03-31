"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export const PROFILING_STORAGE_KEY = "profiling";
export const TOTAL_STEPS = 9;

export type ProfilingDraft = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  gender?: string;
  age?: number;
  birthday?: string;
  email?: string;
  contactNumber?: string;
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  purok?: string;
  civilStatus?: string;
  youthAgeGroup?: string;
  educationalBackground?: string;
  youthClassification?: string;
  workStatus?: string;
  registeredSkVoter?: boolean;
  votedLastSkElections?: boolean;
  registeredNationalVoter?: boolean;
  attendedKkAssembly?: boolean;
  kkAssemblyTimesAttended?: number;
  kkAssemblyReason?: string;
};

export function readProfilingDraft(): ProfilingDraft {
  if (typeof window === "undefined") return {};

  try {
    const localValue = localStorage.getItem(PROFILING_STORAGE_KEY);
    const sessionValue = sessionStorage.getItem(PROFILING_STORAGE_KEY);
    const rawValue = localValue || sessionValue || "{}";
    const parsed = JSON.parse(rawValue);

    if (!localValue && sessionValue) {
      localStorage.setItem(PROFILING_STORAGE_KEY, sessionValue);
    }

    if (!sessionValue && localValue) {
      sessionStorage.setItem(PROFILING_STORAGE_KEY, localValue);
    }

    return parsed;
  } catch {
    return {};
  }
}

export function saveProfilingDraft(partial: ProfilingDraft) {
  const existing = readProfilingDraft();
  const nextValue = JSON.stringify({ ...existing, ...partial });
  localStorage.setItem(PROFILING_STORAGE_KEY, nextValue);
  sessionStorage.setItem(PROFILING_STORAGE_KEY, nextValue);
}

export function clearProfilingDraft() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(PROFILING_STORAGE_KEY);
    localStorage.removeItem(PROFILING_STORAGE_KEY);
  }
}

export function useHydratedDraft<T>(factory: (draft: ProfilingDraft) => T) {
  const [state, setState] = useState<T | null>(null);

  useEffect(() => {
    setState(factory(readProfilingDraft()));
  }, [factory]);

  return [state, setState] as const;
}

export function getAgeFromBirthday(birthday: string) {
  if (!birthday) return "";

  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "";
}

export function getAgeGroupFromAge(age: number | string) {
  const value = typeof age === "string" ? parseInt(age, 10) : age;
  if (!value || Number.isNaN(value)) return "";
  if (value >= 15 && value <= 17) return "Child Youth";
  if (value >= 18 && value <= 24) return "Core Youth";
  if (value >= 25 && value <= 30) return "Young Adult";
  return "";
}

export function getProfilingResumePath(draft: ProfilingDraft = readProfilingDraft()) {
  const hasStep1 =
    Boolean(draft.firstName?.trim()) &&
    Boolean(draft.middleName?.trim()) &&
    Boolean(draft.lastName?.trim()) &&
    Boolean(draft.region) &&
    Boolean(draft.province) &&
    Boolean(draft.city) &&
    Boolean(draft.barangay) &&
    Boolean(draft.purok);

  if (!hasStep1) return "/profiling/step-1";

  const hasStep2 =
    Boolean(draft.gender) &&
    Boolean(draft.birthday) &&
    Boolean(draft.age) &&
    Boolean(draft.email) &&
    Boolean(draft.contactNumber) &&
    String(draft.contactNumber).length === 11;

  if (!hasStep2) return "/profiling/step-2";

  const hasStep3 =
    Boolean(draft.civilStatus) &&
    Boolean(draft.youthAgeGroup) &&
    Boolean(draft.educationalBackground) &&
    Boolean(draft.youthClassification) &&
    Boolean(draft.workStatus);

  if (!hasStep3) return "/profiling/step-3";

  if (typeof draft.registeredSkVoter !== "boolean") return "/profiling/step-4";
  if (typeof draft.votedLastSkElections !== "boolean") return "/profiling/step-5";
  if (typeof draft.registeredNationalVoter !== "boolean") return "/profiling/step-6";
  if (typeof draft.attendedKkAssembly !== "boolean") return "/profiling/step-7";

  if (draft.attendedKkAssembly) {
    if (!draft.kkAssemblyTimesAttended || draft.kkAssemblyTimesAttended <= 0) {
      return "/profiling/step-8";
    }
  } else if (!draft.kkAssemblyReason) {
    return "/profiling/step-9";
  }

  return "/profiling/review";
}

export function ProfilingShell({
  currentStep,
  title,
  subtitle,
  children,
  onBack,
  actions,
}: {
  currentStep: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack: () => void;
  actions?: React.ReactNode;
}) {
  const progressPercent = Math.max(
    0,
    Math.min(100, (currentStep / TOTAL_STEPS) * 100)
  );

  return (
    <div className="pf-page">
      <div className="pf-topbar">
        <button className="pf-back-btn" onClick={onBack} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        <span className="pf-topbar-title">KK Profiling</span>
      </div>

      <div className="pf-section-head">
        <h1 className="pf-section-title">{title}</h1>
        {subtitle ? <p className="pf-section-subtitle">{subtitle}</p> : null}
        <div className="pf-step-label">
          Step {currentStep} of {TOTAL_STEPS}
        </div>
        <div
          className="pf-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={currentStep}
          aria-label={`Profiling progress: step ${currentStep} of ${TOTAL_STEPS}`}
        >
          <div
            className="pf-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="pf-form-area">{children}</div>

      <div className="pf-bottombar">
        <div className="pf-dots">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <div
              key={index}
              className={`pf-dot ${
                index + 1 === currentStep
                  ? "active"
                  : index + 1 < currentStep
                    ? "done"
                    : "future"
              }`}
            />
          ))}
        </div>
        {actions}
      </div>
    </div>
  );
}

export function FooterBranding({ dark = false }: { dark?: boolean }) {
  return (
    <div className="pf-footer">
      <img
        src="/images/SKButingLogo.png"
        alt=""
        className="pf-footer-logo"
        aria-hidden="true"
      />
      <div className="pf-footer-copy">
        <span className={`pf-footer-top ${dark ? "dark" : ""}`}>
          Sangguniang Kabataan
        </span>
        <span className={`pf-footer-bottom ${dark ? "dark" : ""}`}>
          Barangay Buting
        </span>
      </div>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <div className="pf-col">
      <label className="pf-label">
        {label}
        {required ? <span className="req">*</span> : null}
      </label>
      <input
        className="pf-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        required={required}
      />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div className="pf-col">
      <label className="pf-label">
        {label}
        {required ? <span className="req">*</span> : null}
      </label>
      <div className="pf-select-wrap">
        <select
          className="pf-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="pf-choice-label">{label}</p>
      <div className="pf-choice-group">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`pf-choice-btn ${
              value === option ? "selected" : "unselected"
            }`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BooleanCard({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="pf-boolean-card">
      <p className="pf-boolean-label">{label}</p>
      <div className="pf-yn-group">
        <button
          type="button"
          className={`pf-yn-btn ${value === true ? "selected" : "unselected"}`}
          onClick={() => onChange(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={`pf-yn-btn ${value === false ? "selected" : "unselected"}`}
          onClick={() => onChange(false)}
        >
          No
        </button>
      </div>
    </div>
  );
}

export function NextArrowButton({
  disabled,
}: {
  disabled?: boolean;
}) {
  return (
    <button className="pf-next-btn" type="submit" disabled={disabled} aria-label="Next">
      <ArrowRightIcon />
    </button>
  );
}

export function ReviewAccordion({
  title,
  openByDefault,
  children,
  icon,
}: {
  title: string;
  openByDefault?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(openByDefault));

  return (
    <div className="pf-accordion">
      <button
        type="button"
        className="pf-accordion-header"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="pf-accordion-title-wrap">
          {icon ? <span className="pf-accordion-icon">{icon}</span> : null}
          <span className="pf-accordion-title">{title}</span>
        </span>
        <ChevronDownIcon className={`pf-accordion-chevron${open ? " open" : ""}`} />
      </button>
      {open ? <div className="pf-accordion-body">{children}</div> : null}
    </div>
  );
}

export function IntroCard() {
  return (
    <div className="pf-intro-page">
      <div className="pf-intro-copy">
        <img
          src="/images/SKButingLogo.png"
          alt="SK Buting seal"
          className="pf-intro-logo"
        />
        <h1 className="pf-intro-title">What is KK Profiling?</h1>
        <p className="pf-intro-body">
          The Katipunan ng Kabataan profiling gathers youth demographic data so
          your local SK can build better programs, policies, and opportunities
          for the community.
        </p>
        <div className="pf-intro-actions">
          <Link href="/profiling/step-1" className="pf-btn-start">
            Start
          </Link>
          <Link href="/intro" className="pf-btn-back">
            Go Back
          </Link>
        </div>
      </div>
      <FooterBranding />
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
