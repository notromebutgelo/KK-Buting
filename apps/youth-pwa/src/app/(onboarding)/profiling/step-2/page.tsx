"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FooterBranding,
  NextArrowButton,
  ProfilingShell,
  SelectField,
  getAgeFromBirthday,
  getAgeGroupFromAge,
  readProfilingDraft,
  saveProfilingDraft,
} from "../profiling-ui";

const genderOptions = ["Male", "Female", "Prefer not to say"];

function normalizePhilippineMobileInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 10);

  if (!digitsOnly) return "";

  return `9${digitsOnly.slice(1)}`;
}

export default function ProfilingStep2() {
  const router = useRouter();
  const [form, setForm] = useState({
    gender: "",
    birthday: "",
    age: "",
    email: "",
    contactNumber: "",
  });

  useEffect(() => {
    const saved = readProfilingDraft();
    setForm({
      gender: saved.gender || "",
      birthday: saved.birthday || "",
      age: saved.birthday ? getAgeFromBirthday(saved.birthday) : saved.age ? String(saved.age) : "",
      email: saved.email || "",
      contactNumber: normalizePhilippineMobileInput(saved.contactNumber || ""),
    });
  }, []);

  const ageGroup = useMemo(() => getAgeGroupFromAge(form.age), [form.age]);
  const isValid =
    form.gender &&
    form.birthday &&
    form.age &&
    form.email &&
    form.contactNumber.length === 10 &&
    form.contactNumber.startsWith("9");

  const handleContactNumberChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      contactNumber: normalizePhilippineMobileInput(value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    saveProfilingDraft({
      gender: form.gender,
      birthday: form.birthday,
      age: parseInt(form.age, 10),
      email: form.email,
      contactNumber: form.contactNumber,
      youthAgeGroup: ageGroup,
    });
    router.push("/profiling/step-3");
  };

  return (
    <form onSubmit={handleSubmit}>
      <ProfilingShell
        currentStep={2}
        title="Profile"
        subtitle="Tell us more about yourself."
        onBack={() => router.push("/profiling/step-1")}
        actions={<NextArrowButton disabled={!isValid} />}
      >
        <div className="pf-form-card">
          <div className="pf-row pf-row-2">
            <SelectField
              label="Gender"
              value={form.gender}
              onChange={(gender) => setForm((prev) => ({ ...prev, gender }))}
              options={genderOptions}
              placeholder="Select gender"
            />

            <div className="pf-col">
              <label className="pf-label">
                Age<span className="req">*</span>
              </label>
              <input
                className="pf-input pf-input-readonly"
                type="text"
                value={form.age}
                placeholder="Auto-filled from birthday"
                readOnly
                aria-readonly="true"
                required
              />
            </div>
          </div>

          <div className="pf-col pf-short-field">
            <label className="pf-label">
              Birthday<span className="req">*</span>
            </label>
            <input
              className="pf-input"
              type="date"
              value={form.birthday}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  birthday: e.target.value,
                  age: getAgeFromBirthday(e.target.value),
                }))
              }
              required
            />
          </div>

          <div className="pf-col">
            <label className="pf-label">
              Email<span className="req">*</span>
            </label>
            <input
              className="pf-input"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="stdwight24@gmail.com"
              required
            />
          </div>

          <div className="pf-col">
            <label className="pf-label">
              Contact Number<span className="req">*</span>
            </label>
            <div className="pf-phone-row">
              <div className="pf-phone-prefix-box">
                <span>+63</span>
              </div>
              <input
                className="pf-input"
                type="tel"
                value={form.contactNumber}
                onChange={(e) => handleContactNumberChange(e.target.value)}
                inputMode="numeric"
                pattern="9[0-9]{9}"
                placeholder="9XXXXXXXXX"
                maxLength={10}
                required
              />
            </div>
            <p className="pf-input-hint">Enter 10 digits only. Mobile numbers always begin with 9.</p>
          </div>
        </div>

        <FooterBranding />
      </ProfilingShell>
    </form>
  );
}
