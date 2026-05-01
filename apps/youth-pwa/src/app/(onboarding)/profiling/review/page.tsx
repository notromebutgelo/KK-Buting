"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitProfiling } from "@/services/profiling.service";
import AlertModal from "@/components/ui/AlertModal";
import {
  PROFILING_STEPS,
  buildProfilingPayload,
  formatFieldValueForReview,
  isFieldVisible,
  type ProfilingDraft,
} from "../profiling-schema";
import {
  FooterBranding,
  ReviewAccordion,
  clearProfilingDraft,
  readProfilingDraft,
} from "../profiling-ui";

export default function ProfilingReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<ProfilingDraft>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(readProfilingDraft());
  }, []);

  const reviewSections = useMemo(() => {
    return PROFILING_STEPS.map((step) => ({
      title: step.title,
      fields: step.sections.flatMap((section) =>
        section.fields
          .filter((field) => isFieldVisible(field, draft))
          .map((field) => ({
            label: field.reviewLabel || field.label,
            value: formatFieldValueForReview(field, draft),
          }))
          .filter((field) => field.value)
      ),
    })).filter((section) => section.fields.length > 0);
  }, [draft]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await submitProfiling(buildProfilingPayload(readProfilingDraft()));
      clearProfilingDraft();
      router.push("/profiling/sucess");
    } catch {
      setError("Failed to submit profiling. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="pf-review-page">
      <div className="pf-review-topbar">
        <button
          className="pf-review-back"
          onClick={() => router.push("/profiling/step-9")}
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
          Kindly double check your answers before submitting the 2026 KK profiling form.
        </p>
      </div>
      <div className="pf-review-divider" />

      <div className="pf-review-cards">
        {reviewSections.map((section, index) => (
          <ReviewAccordion
            key={section.title}
            title={section.title}
            openByDefault={index === 0}
            icon={<SectionIcon />}
          >
            <div className="pf-review-grid">
              {section.fields.map((field) => (
                <Field key={field.label} label={field.label} value={field.value} />
              ))}
            </div>
          </ReviewAccordion>
        ))}
      </div>

      <form className="pf-review-bottombar" onSubmit={handleSubmit}>
        <button className="pf-review-next-btn" type="submit" disabled={isLoading}>
          {isLoading ? "Submitting..." : "Submit"}
        </button>
      </form>

      <FooterBranding dark />

      <AlertModal
        isOpen={Boolean(error)}
        title="Profiling Submission Failed"
        message={error}
        onClose={() => setError("")}
      />
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="pf-review-field full">
      <span className="pf-review-field-label">{label}</span>
      <span className="pf-review-field-value">{value || "-"}</span>
    </div>
  );
}

function SectionIcon() {
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
      <path d="M5 6h14M5 12h14M5 18h9" />
    </svg>
  );
}
