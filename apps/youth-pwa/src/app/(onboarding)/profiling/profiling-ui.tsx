"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  TOTAL_STEPS,
  type ProfilingDraft,
  getProfilingResumePathFromDraft,
  sanitizeDraftForVisibility,
} from "./profiling-schema";

export const PROFILING_STORAGE_KEY = "profiling-2026";

export function readProfilingDraft(): ProfilingDraft {
  if (typeof window === "undefined") return {};

  try {
    const localValue = localStorage.getItem(PROFILING_STORAGE_KEY);
    const sessionValue = sessionStorage.getItem(PROFILING_STORAGE_KEY);
    const rawValue = localValue || sessionValue || "{}";
    const parsed = JSON.parse(rawValue);
    const sanitizedDraft =
      parsed && typeof parsed === "object"
        ? sanitizeDraftForVisibility(parsed as ProfilingDraft)
        : {};
    const serializedDraft = JSON.stringify(sanitizedDraft);

    if (localValue !== serializedDraft) {
      localStorage.setItem(PROFILING_STORAGE_KEY, serializedDraft);
    }

    if (sessionValue !== serializedDraft) {
      sessionStorage.setItem(PROFILING_STORAGE_KEY, serializedDraft);
    }

    return sanitizedDraft;
  } catch {
    return {};
  }
}

export function saveProfilingDraft(partial: ProfilingDraft) {
  const existing = readProfilingDraft();
  const nextValue = JSON.stringify(
    sanitizeDraftForVisibility({ ...existing, ...partial })
  );
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

export function getProfilingResumePath(draft: ProfilingDraft = readProfilingDraft()) {
  return getProfilingResumePathFromDraft(draft);
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
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
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
        inputMode={inputMode}
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
  options: readonly string[];
  placeholder: string;
  required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selectedLabel = useMemo(
    () => options.find((option) => option === value) || "",
    [options, value]
  );
  const hasSelectedOption = Boolean(selectedLabel);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current) return;

      const target = event.target;
      if (target instanceof Node && !wrapperRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="pf-col">
      <label className="pf-label">
        {label}
        {required ? <span className="req">*</span> : null}
      </label>
      <div
        className={`pf-select-wrap${isOpen ? " open" : ""}`}
        ref={wrapperRef}
      >
        <button
          type="button"
          className={`pf-select-trigger${hasSelectedOption ? "" : " placeholder"}`}
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-required={required}
        >
          <span className="pf-select-value">
            {selectedLabel || placeholder}
          </span>
          <ChevronDownIcon className="pf-select-chevron" />
        </button>

        {isOpen ? (
          <div className="pf-select-popover">
            <div
              id={listboxId}
              className="pf-select-options"
              role="listbox"
              aria-label={label}
            >
              {!required ? (
                <button
                  type="button"
                  role="option"
                  aria-selected={value === ""}
                  className={`pf-select-option${value === "" ? " selected" : ""}`}
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                >
                  {placeholder}
                </button>
              ) : null}
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={value === option}
                  className={`pf-select-option${value === option ? " selected" : ""}`}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}
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

export function RadioListField({
  label,
  description,
  options,
  value,
  onChange,
  helperText,
}: {
  label: string;
  description?: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
}) {
  return (
    <div className="pf-question-field">
      <p className="pf-choice-label">{label}</p>
      {description ? <p className="pf-question-copy">{description}</p> : null}
      {helperText ? <p className="pf-input-hint">{helperText}</p> : null}
      <div className="pf-option-list" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = value === option;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`pf-option-card ${selected ? "selected" : "unselected"}`}
              onClick={() => onChange(option)}
            >
              <span className={`pf-option-indicator ${selected ? "selected" : ""}`} />
              <span className="pf-option-text">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CheckboxListField({
  label,
  description,
  options,
  value,
  onChange,
  helperText,
}: {
  label: string;
  description?: string;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  helperText?: string;
}) {
  function toggleOption(option: string) {
    const nextValue = value.includes(option)
      ? value.filter((entry) => entry !== option)
      : [...value, option];

    onChange(nextValue);
  }

  return (
    <div className="pf-question-field">
      <p className="pf-choice-label">{label}</p>
      {description ? <p className="pf-question-copy">{description}</p> : null}
      {helperText ? <p className="pf-input-hint">{helperText}</p> : null}
      <div className="pf-option-list" role="group" aria-label={label}>
        {options.map((option) => {
          const selected = value.includes(option);

          return (
            <button
              key={option}
              type="button"
              className={`pf-option-card ${selected ? "selected" : "unselected"}`}
              aria-pressed={selected}
              onClick={() => toggleOption(option)}
            >
              <span className={`pf-checkbox-indicator ${selected ? "selected" : ""}`}>
                {selected ? "✓" : ""}
              </span>
              <span className="pf-option-text">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  required,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <div className="pf-col">
      <label className="pf-label">
        {label}
        {required ? <span className="req">*</span> : null}
      </label>
      <textarea
        className="pf-input pf-textarea"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        required={required}
      />
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
