"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad, { type SignaturePadHandle } from "@/components/ui/SignaturePad";
import {
  CONSENT_AGREE,
  type ProfilingDraft,
  type ProfilingFieldConfig,
  getNextStepPath,
  getPreviousStepPath,
  getStepByNumber,
  isFieldVisible,
  isOtherOptionSelected,
  sanitizeDraftForVisibility,
  isStepComplete,
} from "./profiling-schema";
import {
  CheckboxListField,
  FooterBranding,
  NextArrowButton,
  ProfilingShell,
  RadioListField,
  SelectField,
  TextAreaField,
  TextField,
  readProfilingDraft,
  saveProfilingDraft,
} from "./profiling-ui";

export function ProfilingStepPage({ stepNumber }: { stepNumber: number }) {
  const router = useRouter();
  const step = getStepByNumber(stepNumber);
  const [draft, setDraft] = useState<ProfilingDraft>({});

  useEffect(() => {
    setDraft(readProfilingDraft());
  }, []);

  const isValid = useMemo(() => isStepComplete(step, draft), [draft, step]);

  function updateField<K extends keyof ProfilingDraft>(key: K, value: ProfilingDraft[K]) {
    setDraft((prev) => sanitizeDraftForVisibility({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid) return;

    saveProfilingDraft(draft);
    router.push(getNextStepPath(stepNumber));
  }

  return (
    <form className="pf-step-form" onSubmit={handleSubmit}>
      <ProfilingShell
        currentStep={stepNumber}
        title={step.title}
        subtitle={step.subtitle}
        onBack={() => router.push(getPreviousStepPath(stepNumber))}
        actions={<NextArrowButton disabled={!isValid} />}
      >
        {step.sections.map((section) => {
          const visibleFields = section.fields.filter((field) => isFieldVisible(field, draft));

          if (visibleFields.length === 0) return null;

          return (
            <div key={section.title} className="pf-form-card pf-section-card">
              <div className="pf-section-copy">
                <h2 className="pf-subsection-title">{section.title}</h2>
                {section.description ? (
                  <p className="pf-subsection-copy">{section.description}</p>
                ) : null}
              </div>

              <div className="pf-section-fields">
                {visibleFields.map((field) => (
                  <QuestionField
                    key={String(field.key)}
                    field={field}
                    draft={draft}
                    onChange={updateField}
                  />
                ))}
              </div>

              {stepNumber === 1 && draft.privacyConsent && draft.privacyConsent !== CONSENT_AGREE ? (
                <p className="pf-question-error">
                  Kailangan ang pahintulot sa privacy notice bago mo maipagpatuloy ang profiling form.
                </p>
              ) : null}
            </div>
          );
        })}

        <FooterBranding />
      </ProfilingShell>
    </form>
  );
}

function QuestionField({
  field,
  draft,
  onChange,
}: {
  field: ProfilingFieldConfig;
  draft: ProfilingDraft;
  onChange: <K extends keyof ProfilingDraft>(key: K, value: ProfilingDraft[K]) => void;
}) {
  const rawValue = draft[field.key];
  const stringValue = typeof rawValue === "string" ? rawValue : "";
  const arrayValue = Array.isArray(rawValue) ? rawValue : [];
  const showOtherField = field.otherKey && isOtherOptionSelected(field, draft);
  const otherKey = field.otherKey;
  const otherValue =
    otherKey && typeof draft[otherKey] === "string" ? String(draft[otherKey]) : "";

  function renderControl() {
    switch (field.type) {
      case "text":
        return (
          <div>
            <TextField
              label={field.label}
              value={stringValue}
              onChange={(value) => onChange(field.key, value)}
              placeholder={field.placeholder}
              type={field.inputType || "text"}
              required={field.required}
              inputMode={field.inputMode}
            />
            {field.description ? <p className="pf-question-copy">{field.description}</p> : null}
            {field.helperText ? <p className="pf-input-hint">{field.helperText}</p> : null}
          </div>
        );
      case "textarea":
        return (
          <div>
            <TextAreaField
              label={field.label}
              value={stringValue}
              onChange={(value) => onChange(field.key, value)}
              placeholder={field.placeholder}
              required={field.required}
            />
            {field.description ? <p className="pf-question-copy">{field.description}</p> : null}
            {field.helperText ? <p className="pf-input-hint">{field.helperText}</p> : null}
          </div>
        );
      case "select":
        return (
          <div>
            <SelectField
              label={field.label}
              value={stringValue}
              onChange={(value) => onChange(field.key, value)}
              options={field.options || []}
              placeholder={field.placeholder || "Select an option"}
              required={field.required}
            />
            {field.description ? <p className="pf-question-copy">{field.description}</p> : null}
            {field.helperText ? <p className="pf-input-hint">{field.helperText}</p> : null}
          </div>
        );
      case "radio":
        return (
          <RadioListField
            label={field.label}
            description={field.description}
            helperText={field.helperText}
            options={field.options || []}
            value={stringValue}
            onChange={(value) => onChange(field.key, value)}
          />
        );
      case "checkbox":
        return (
          <CheckboxListField
            label={field.label}
            description={field.description}
            helperText={field.helperText}
            options={field.options || []}
            value={arrayValue}
            onChange={(value) => onChange(field.key, value)}
          />
        );
      case "signature":
        return (
          <SignatureQuestionField
            field={field}
            value={stringValue}
            onChange={onChange}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="pf-field-stack">
      {renderControl()}
      {showOtherField ? (
        <TextField
          label="Other (Please specify)"
          value={otherValue}
          onChange={(value) => {
            if (!otherKey) return;
            onChange(otherKey, value);
          }}
          placeholder="Type your answer"
          required
        />
      ) : null}
    </div>
  );
}

function SignatureQuestionField({
  field,
  value,
  onChange,
}: {
  field: ProfilingFieldConfig;
  value: string;
  onChange: <K extends keyof ProfilingDraft>(key: K, value: ProfilingDraft[K]) => void;
}) {
  const signaturePadRef = useRef<SignaturePadHandle | null>(null);
  const hasSignature = Boolean(value);

  return (
    <div className="rounded-[24px] border border-[#d8e5f4] bg-[#fbfdff] p-4">
      <div>
        <label className="pf-label">
          {field.label}
          {field.required ? <span className="req">*</span> : null}
        </label>
        {field.description ? <p className="pf-question-copy">{field.description}</p> : null}
        {field.helperText ? <p className="pf-input-hint">{field.helperText}</p> : null}
      </div>

      <div className="mt-4">
        <SignaturePad
          ref={signaturePadRef}
          initialValue={value || null}
          onSignatureChange={(nextValue) =>
            onChange(field.key, (nextValue || "") as ProfilingDraft[typeof field.key])
          }
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-[#c9daef] bg-white px-4 py-3 text-sm font-semibold text-[#014384] transition hover:bg-[#f7fbff]"
          onClick={() => {
            signaturePadRef.current?.clear();
            onChange(field.key, "" as ProfilingDraft[typeof field.key]);
          }}
        >
          Clear & Try Again
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#5c7aa3]">
        {hasSignature
          ? "Signature captured. You can still clear the pad and re-sign before moving to the next step."
          : "Sign inside the box using your finger or mouse. You can retry as many times as needed before continuing."}
      </p>
    </div>
  );
}
