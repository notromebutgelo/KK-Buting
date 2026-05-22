"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  TOTAL_STEPS,
  type ProfilingDraft,
  getProfilingResumePathFromDraft,
  sanitizeDraftForVisibility,
} from "./profiling-schema";

export const PROFILING_STORAGE_KEY = "profiling-2026";
const RADIO_CARD_MAX_OPTIONS = 5;
const SEARCHABLE_PICKER_MIN_OPTIONS = 12;
const SEARCHABLE_PICKER_LONG_LABEL_LENGTH = 28;

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
  maxLength,
  error,
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
  maxLength?: number;
  error?: string;
}) {
  return (
    <div className="pf-col">
      <label className="pf-label">
        {label}
        {required ? <span className="req">*</span> : null}
      </label>
      <input
        className={`pf-input${error ? " pf-input-invalid" : ""}`}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="pf-input-error">{error}</p> : null}
    </div>
  );
}

export function AdaptiveSingleChoiceField({
  label,
  description,
  options,
  value,
  onChange,
  helperText,
  placeholder = "Select an option",
  required = true,
}: {
  label: string;
  description?: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
}) {
  if (shouldUseRadioCards(options)) {
    return (
      <RadioListField
        label={label}
        description={description}
        helperText={helperText}
        options={options}
        value={value}
        onChange={onChange}
      />
    );
  }

  return (
    <SelectField
      label={label}
      description={description}
      helperText={helperText}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      required={required}
      searchable={shouldEnablePickerSearch(options)}
    />
  );
}

export function SelectField({
  label,
  description,
  helperText,
  value,
  onChange,
  options,
  placeholder,
  required = true,
  searchable = false,
}: {
  label: string;
  description?: string;
  helperText?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  required?: boolean;
  searchable?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();
  const titleId = useId();
  const sheetTitleId = useId();
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const selectedLabel = useMemo(
    () => options.find((option) => option === value) || "",
    [options, value]
  );
  const hasSelectedOption = Boolean(selectedLabel);
  const filteredOptions = useMemo(() => {
    if (!searchable || !deferredSearchQuery) {
      return options;
    }

    return options.filter((option) =>
      option.toLowerCase().includes(deferredSearchQuery)
    );
  }, [deferredSearchQuery, options, searchable]);

  function closePicker() {
    setIsOpen(false);
    setSearchQuery("");
  }

  const pickerSubtitle =
    helperText ||
    description ||
    (searchable
      ? "Search or browse the options below."
      : "Choose one option below.");

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPickerState = document.body.dataset.profilingPickerOpen;
    document.body.style.overflow = "hidden";
    document.body.dataset.profilingPickerOpen = "true";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePicker();
      }
    };

    document.addEventListener("keydown", handleEscape);

    const focusTimeout = searchable
      ? window.setTimeout(() => searchInputRef.current?.focus(), 30)
      : null;

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousPickerState) {
        document.body.dataset.profilingPickerOpen = previousPickerState;
      } else {
        delete document.body.dataset.profilingPickerOpen;
      }
      document.removeEventListener("keydown", handleEscape);
      if (focusTimeout) {
        window.clearTimeout(focusTimeout);
      }
    };
  }, [isOpen, searchable]);

  return (
    <div className="pf-question-field">
      <label className="pf-label" id={titleId}>
        {label}
        {required ? <span className="req">*</span> : null}
      </label>
      {description ? <p className="pf-question-copy">{description}</p> : null}
      {helperText ? <p className="pf-input-hint">{helperText}</p> : null}
      <div className={`pf-select-wrap${isOpen ? " open" : ""}`}>
        <button
          type="button"
          className={`pf-select-trigger${hasSelectedOption ? "" : " placeholder"}`}
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-controls={listboxId}
          aria-labelledby={titleId}
          aria-required={required}
        >
          <span className="pf-select-value">
            {selectedLabel || placeholder}
          </span>
          <ChevronDownIcon className="pf-select-chevron" />
        </button>

        {isOpen ? (
          <div className="pf-picker-portal" role="presentation">
            <button
              type="button"
              className="pf-picker-backdrop"
              aria-label={`Close ${label} options`}
              onClick={closePicker}
            />
            <div
              className="pf-picker-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={sheetTitleId}
            >
              <div className="pf-picker-handle" aria-hidden="true" />
              <div className="pf-picker-head">
                <div className="pf-picker-copy">
                  <h3 className="pf-picker-title" id={sheetTitleId}>{label}</h3>
                  <p className="pf-picker-subtitle">{pickerSubtitle}</p>
                </div>
                <button
                  type="button"
                  className="pf-picker-close"
                  aria-label={`Close ${label} selector`}
                  onClick={closePicker}
                >
                  <CloseIcon />
                </button>
              </div>

              {searchable ? (
                <div className="pf-picker-search-wrap">
                  <SearchIcon className="pf-picker-search-icon" />
                  <input
                    ref={searchInputRef}
                    className="pf-picker-search-input"
                    type="search"
                    inputMode="search"
                    value={searchQuery}
                    placeholder={`Search ${label.toLowerCase()}`}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    aria-label={`Search ${label} options`}
                  />
                </div>
              ) : null}

              <div
                id={listboxId}
                className="pf-picker-list"
                role="listbox"
                aria-label={label}
              >
                {!required ? (
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === ""}
                    className={`pf-picker-option${value === "" ? " selected" : ""}`}
                    onClick={() => {
                      onChange("");
                      closePicker();
                    }}
                  >
                    <span className="pf-picker-option-copy">
                      <span className="pf-picker-option-label">{placeholder}</span>
                    </span>
                    <span
                      className={`pf-picker-option-indicator${value === "" ? " selected" : ""}`}
                      aria-hidden="true"
                    >
                      {value === "" ? <CheckIcon /> : null}
                    </span>
                  </button>
                ) : null}

                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => {
                    const selected = value === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`pf-picker-option${selected ? " selected" : ""}`}
                        onClick={() => {
                          onChange(option);
                          closePicker();
                        }}
                      >
                        <span className="pf-picker-option-copy">
                          <span className="pf-picker-option-label">{option}</span>
                        </span>
                        <span
                          className={`pf-picker-option-indicator${selected ? " selected" : ""}`}
                          aria-hidden="true"
                        >
                          {selected ? <CheckIcon /> : null}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="pf-picker-empty">
                    No matching options found. Try a shorter keyword.
                  </div>
                )}
                <div className="pf-picker-list-spacer" aria-hidden="true" />
              </div>
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

function CloseIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 21-4.35-4.35" />
      <circle cx="11" cy="11" r="6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 4 4L19 7" />
    </svg>
  );
}

function shouldUseRadioCards(options: readonly string[]) {
  return options.length <= RADIO_CARD_MAX_OPTIONS;
}

function shouldEnablePickerSearch(options: readonly string[]) {
  return (
    options.length >= SEARCHABLE_PICKER_MIN_OPTIONS ||
    options.some((option) => option.length >= SEARCHABLE_PICKER_LONG_LABEL_LENGTH)
  );
}
