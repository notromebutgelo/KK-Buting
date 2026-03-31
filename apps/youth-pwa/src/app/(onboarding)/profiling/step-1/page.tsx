"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FooterBranding,
  NextArrowButton,
  ProfilingShell,
  SelectField,
  TextField,
  readProfilingDraft,
  saveProfilingDraft,
} from "../profiling-ui";

const suffixOptions = ["Jr.", "Sr.", "II", "III", "IV"];
const regions = [
  "National Capital Region (NCR)",
  "CAR",
  "Region I",
  "Region II",
  "Region III",
  "Region IV-A (CALABARZON)",
];
const provinces = ["Metro Manila", "Rizal", "Laguna"];
const cities = ["Pasig City"];
const barangays = ["Brgy. Buting"];
const purokOptions = ["Gitna", "Silangan", "Kanluran", "Poblacion"];

export default function ProfilingStep1() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    purok: "",
  });

  useEffect(() => {
    const saved = readProfilingDraft();
    setForm({
      firstName: saved.firstName || "",
      middleName: saved.middleName || "",
      lastName: saved.lastName || "",
      suffix: saved.suffix || "",
      region: saved.region || "",
      province: saved.province || "",
      city: saved.city || "",
      barangay: saved.barangay || "",
      purok: saved.purok || "",
    });
  }, []);

  const isValid =
    form.firstName.trim() &&
    form.middleName.trim() &&
    form.lastName.trim() &&
    form.region &&
    form.province &&
    form.city &&
    form.barangay &&
    form.purok;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    saveProfilingDraft(form);
    router.push("/profiling/step-2");
  };

  return (
    <form onSubmit={handleSubmit}>
      <ProfilingShell
        currentStep={1}
        title="Profile"
        subtitle="Let's start with the basics. Enter your personal details."
        onBack={() => router.push("/intro")}
        actions={<NextArrowButton disabled={!isValid} />}
      >
        <div className="pf-form-card">
          <div className="pf-row pf-row-2">
            <TextField
              label="First Name"
              value={form.firstName}
              onChange={(firstName) => setForm((prev) => ({ ...prev, firstName }))}
              placeholder="Dwight"
              required
            />
            <TextField
              label="Middle Name"
              value={form.middleName}
              onChange={(middleName) => setForm((prev) => ({ ...prev, middleName }))}
              placeholder="Parada"
              required
            />
          </div>

          <div className="pf-row pf-row-2">
            <TextField
              label="Last Name"
              value={form.lastName}
              onChange={(lastName) => setForm((prev) => ({ ...prev, lastName }))}
              placeholder="Ramos"
              required
            />
            <SelectField
              label="Suffix"
              value={form.suffix}
              onChange={(suffix) => setForm((prev) => ({ ...prev, suffix }))}
              options={suffixOptions}
              placeholder="Select suffix"
              required={false}
            />
          </div>

          <SelectField
            label="Region"
            value={form.region}
            onChange={(region) => setForm((prev) => ({ ...prev, region }))}
            options={regions}
            placeholder="Select region"
          />

          <div className="pf-row pf-row-2">
            <SelectField
              label="Province"
              value={form.province}
              onChange={(province) => setForm((prev) => ({ ...prev, province }))}
              options={provinces}
              placeholder="Select province"
            />
            <SelectField
              label="City / Municipality"
              value={form.city}
              onChange={(city) => setForm((prev) => ({ ...prev, city }))}
              options={cities}
              placeholder="Select city"
            />
          </div>

          <div className="pf-row pf-row-2">
            <SelectField
              label="Barangay"
              value={form.barangay}
              onChange={(barangay) => setForm((prev) => ({ ...prev, barangay }))}
              options={barangays}
              placeholder="Select barangay"
            />
            <SelectField
              label="Purok / Zone"
              value={form.purok}
              onChange={(purok) => setForm((prev) => ({ ...prev, purok }))}
              options={purokOptions}
              placeholder="Select purok / zone"
            />
          </div>
        </div>

        <FooterBranding />
      </ProfilingShell>
    </form>
  );
}
