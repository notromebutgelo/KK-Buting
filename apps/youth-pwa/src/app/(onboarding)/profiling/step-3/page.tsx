"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FooterBranding,
  NextArrowButton,
  ProfilingShell,
  SelectField,
  readProfilingDraft,
  saveProfilingDraft,
} from "../profiling-ui";

const civilStatuses = ["Single", "Married", "Widowed", "Separated", "Annulled"];
const youthAgeGroups = ["Child Youth", "Core Youth", "Young Adult"];
const educationLevels = [
  "Elementary Level",
  "Elementary Graduate",
  "High School Level",
  "High School Graduate",
  "Vocational",
  "College Level",
  "College Graduate",
  "Post Graduate",
];
const youthClassifications = [
  "In-school Youth",
  "Out-of-school Youth",
  "Working Youth",
  "Youth with Disability",
  "Indigenous Youth",
];
const workStatuses = [
  "Employed",
  "Self-employed",
  "Unemployed",
  "Student",
  "OFW",
];

export default function ProfilingStep3() {
  const router = useRouter();
  const [form, setForm] = useState({
    civilStatus: "",
    youthAgeGroup: "",
    educationalBackground: "",
    youthClassification: "",
    workStatus: "",
  });

  useEffect(() => {
    const saved = readProfilingDraft();
    setForm({
      civilStatus: saved.civilStatus || "",
      youthAgeGroup: saved.youthAgeGroup || "",
      educationalBackground: saved.educationalBackground || "",
      youthClassification: saved.youthClassification || "",
      workStatus: saved.workStatus || "",
    });
  }, []);

  const isValid =
    form.civilStatus &&
    form.youthAgeGroup &&
    form.educationalBackground &&
    form.youthClassification &&
    form.workStatus;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    saveProfilingDraft(form);
    router.push("/profiling/step-4");
  };

  return (
    <form onSubmit={handleSubmit}>
      <ProfilingShell
        currentStep={3}
        title="Demographic Characteristics"
        subtitle=""
        onBack={() => router.push("/profiling/step-2")}
        actions={<NextArrowButton disabled={!isValid} />}
      >
        <div className="pf-form-card">
          <div className="pf-row pf-row-2">
            <SelectField
              label="Civil Status"
              value={form.civilStatus}
              onChange={(civilStatus) => setForm((prev) => ({ ...prev, civilStatus }))}
              options={civilStatuses}
              placeholder="Select civil status"
            />
            <SelectField
              label="Youth Age Group"
              value={form.youthAgeGroup}
              onChange={(youthAgeGroup) => setForm((prev) => ({ ...prev, youthAgeGroup }))}
              options={youthAgeGroups}
              placeholder="Select age group"
            />
          </div>

          <SelectField
            label="Educational Background"
            value={form.educationalBackground}
            onChange={(educationalBackground) =>
              setForm((prev) => ({ ...prev, educationalBackground }))
            }
            options={educationLevels}
            placeholder="Select educational background"
          />

          <div className="pf-row pf-row-2">
            <SelectField
              label="Youth Classification"
              value={form.youthClassification}
              onChange={(youthClassification) =>
                setForm((prev) => ({ ...prev, youthClassification }))
              }
              options={youthClassifications}
              placeholder="Select classification"
            />
            <SelectField
              label="Work Status"
              value={form.workStatus}
              onChange={(workStatus) => setForm((prev) => ({ ...prev, workStatus }))}
              options={workStatuses}
              placeholder="Select work status"
            />
          </div>
        </div>

        <FooterBranding />
      </ProfilingShell>
    </form>
  );
}
