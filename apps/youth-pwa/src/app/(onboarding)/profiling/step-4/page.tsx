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

export default function ProfilingStep4() {
  const router = useRouter();
  const [registeredSkVoter, setRegisteredSkVoter] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    const saved = readProfilingDraft();
    setRegisteredSkVoter(
      typeof saved.registeredSkVoter === "boolean"
        ? saved.registeredSkVoter
        : null
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (registeredSkVoter === null) return;
    saveProfilingDraft({ registeredSkVoter });
    router.push("/profiling/step-5");
  };

  return (
    <form onSubmit={handleSubmit}>
      <ProfilingShell
        currentStep={4}
        title="Demographic Characteristics"
        onBack={() => router.push("/profiling/step-3")}
        actions={<NextArrowButton disabled={registeredSkVoter === null} />}
      >
        <div className="pf-question-block">
          <h2 className="pf-question-title">Are you a registered SK Voter?</h2>
          <div className="pf-question-actions">
            <button
              type="button"
              className={`pf-yn-btn ${
                registeredSkVoter === true ? "selected" : "unselected"
              }`}
              onClick={() => setRegisteredSkVoter(true)}
            >
              Yes
            </button>
            <button
              type="button"
              className={`pf-yn-btn ${
                registeredSkVoter === false ? "selected" : "unselected"
              }`}
              onClick={() => setRegisteredSkVoter(false)}
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
