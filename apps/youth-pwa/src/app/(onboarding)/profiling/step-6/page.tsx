"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FooterBranding,
  NextArrowButton,
  ProfilingShell,
  readProfilingDraft,
  saveProfilingDraft,
} from "../profiling-ui";

export default function ProfilingStep6() {
  const router = useRouter();
  const [registeredNationalVoter, setRegisteredNationalVoter] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    const saved = readProfilingDraft();
    setRegisteredNationalVoter(
      typeof saved.registeredNationalVoter === "boolean"
        ? saved.registeredNationalVoter
        : null
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (registeredNationalVoter === null) return;
    saveProfilingDraft({ registeredNationalVoter });
    router.push("/profiling/step-7");
  };

  return (
    <form onSubmit={handleSubmit}>
      <ProfilingShell
        currentStep={6}
        title="Demographic Characteristics"
        onBack={() => router.push("/profiling/step-5")}
        actions={<NextArrowButton disabled={registeredNationalVoter === null} />}
      >
        <div className="pf-question-block">
          <h2 className="pf-question-title">
            Are you a registered National Voter?
          </h2>
          <div className="pf-question-actions">
            <button
              type="button"
              className={`pf-yn-btn ${
                registeredNationalVoter === true ? "selected" : "unselected"
              }`}
              onClick={() => setRegisteredNationalVoter(true)}
            >
              Yes
            </button>
            <button
              type="button"
              className={`pf-yn-btn ${
                registeredNationalVoter === false ? "selected" : "unselected"
              }`}
              onClick={() => setRegisteredNationalVoter(false)}
            >
              No
            </button>
          </div>
        </div>
        <FooterBranding />
      </ProfilingShell>
    </form>
  );
}
