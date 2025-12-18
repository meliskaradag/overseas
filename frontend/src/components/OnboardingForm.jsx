import { useState, useEffect } from "react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const TIMES = ["13:00", "14:00", "15:00", "16:00"];

export default function OnboardingForm({ onComplete, initialData }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(() =>
    initialData || {
      workWithConsultant: "",
      reason: "",
      country: "",
      city: "",
      duration: "",
      housingType: "",
      budgetMin: "",
      budgetMax: "",
      campusDistance: "",
      noiseTolerance: "",
      safetyImportance: "",
      transportImportance: "",
      neighborsPreference: "",
      marketDistancePreference: "",
      transitDistancePreference: "",
      socialPreference: "",
      roommatePref: "",
      furnished: "",
      consultantFocus: "",
      consultantLanguages: "",
      wifiNeeded: false,
      washerNeeded: false,
      petsOk: false,
      smokingOk: false,
      elevatorNeeded: false,
      ensuiteBathroom: false
    }
  );

  useEffect(() => {
    if (initialData) setData(initialData);
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setData((d) => ({ ...d, [name]: type === "checkbox" ? checked : value }));
  };

  const next = () => setStep((s) => s + 1);
  const prev = () => setStep((s) => s - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(data);
    setStep(1);
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Your preferences</h2>
      <p style={{ color: "var(--muted)", marginTop: 4 }}>Quick steps to tailor listings.</p>
      <form onSubmit={handleSubmit} className="form-grid" style={{ display: "grid", gap: 14 }}>
        {step === 1 && (
          <>
            <h3>Step 1 - Consultant choice</h3>
            <label>
              Do you want to work with a consultant?
              <select name="workWithConsultant" value={data.workWithConsultant} onChange={handleChange}>
                <option value="">Select</option>
                <option value="no">Not now</option>
                <option value="yes">Yes, pair me with a consultant</option>
              </select>
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h3>Step 2 - About you</h3>
            <label>
              Purpose of stay
              <select name="reason" value={data.reason} onChange={handleChange}>
                <option value="">Select</option>
                <option value="erasmus">Erasmus / exchange</option>
                <option value="degree">Full degree</option>
                <option value="job">Work assignment</option>
                <option value="internship">Internship</option>
                <option value="research">Research visit</option>
                <option value="relocation">Long-term relocation</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Country
              <input name="country" value={data.country} onChange={handleChange} />
            </label>
            <label>
              City
              <input name="city" value={data.city} onChange={handleChange} />
            </label>
            <label>
              Planned duration
              <select name="duration" value={data.duration} onChange={handleChange}>
                <option value="">Select</option>
                <option value="6-12">6-12 months</option>
                <option value="12+">12+ months</option>
                <option value="3-6">3-6 months</option>
              </select>
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <h3>Step 3 - Home preferences</h3>
            <label>
              Housing type
              <select name="housingType" value={data.housingType} onChange={handleChange}>
                <option value="">Select</option>
                <option value="shared_room">Shared apartment / room</option>
                <option value="entire_place">Entire place</option>
                <option value="dorm">Dorm</option>
                <option value="studio">Studio</option>
                <option value="co_living">Co-living</option>
                <option value="host_family">Host family</option>
                <option value="serviced">Serviced apartment</option>
              </select>
            </label>
            <label>
              Minimum budget (EUR)
              <input type="number" name="budgetMin" value={data.budgetMin} onChange={handleChange} />
            </label>
            <label>
              Maximum budget (EUR)
              <input type="number" name="budgetMax" value={data.budgetMax} onChange={handleChange} />
            </label>
            <label>
              Campus distance
              <select name="campusDistance" value={data.campusDistance} onChange={handleChange}>
                <option value="">Select</option>
                <option value="near">Walking distance</option>
                <option value="medium">Transit 20-30 min</option>
                <option value="far">Farther is fine</option>
              </select>
            </label>
            <label>
              Roommate preference
              <select name="roommatePref" value={data.roommatePref} onChange={handleChange}>
                <option value="">Select</option>
                <option value="any">No preference</option>
                <option value="students">Students only</option>
                <option value="professionals">Young professionals</option>
                <option value="female_only">Female-only</option>
                <option value="male_only">Male-only</option>
              </select>
            </label>
            <label>
              Furnished
              <select name="furnished" value={data.furnished} onChange={handleChange}>
                <option value="">Select</option>
                <option value="yes">Yes, fully furnished</option>
                <option value="partial">Partially furnished</option>
                <option value="no">Unfurnished</option>
              </select>
            </label>
            <label>
              Wi-Fi required
              <input type="checkbox" name="wifiNeeded" checked={data.wifiNeeded} onChange={handleChange} />
            </label>
            <label>
              Washing machine required
              <input type="checkbox" name="washerNeeded" checked={data.washerNeeded} onChange={handleChange} />
            </label>
            <label>
              Elevator needed
              <input type="checkbox" name="elevatorNeeded" checked={data.elevatorNeeded} onChange={handleChange} />
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <h3>Step 4 - Lifestyle and consultant</h3>
            {data.workWithConsultant === "yes" && (
              <>
                <label>
                  Preferred consultant focus
                  <select name="consultantFocus" value={data.consultantFocus} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="fast_shortlist">Fast shortlist and tours</option>
                    <option value="paperwork">Paperwork and contracts</option>
                    <option value="budget_optimization">Budget optimization</option>
                  </select>
                </label>
                <label>
                  Consultant language
                  <select name="consultantLanguages" value={data.consultantLanguages} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="english">English</option>
                    <option value="turkish">Turkish</option>
                    <option value="german">German</option>
                    <option value="french">French</option>
                  </select>
                </label>
              </>
            )}
            <label>
              Neighbors preference
              <select name="neighborsPreference" value={data.neighborsPreference} onChange={handleChange}>
                <option value="">Select</option>
                <option value="mixed">Mixed</option>
                <option value="students">Students</option>
                <option value="families">Families</option>
              </select>
            </label>
            <label>
              Market distance preference
              <select name="marketDistancePreference" value={data.marketDistancePreference} onChange={handleChange}>
                <option value="">Select</option>
                <option value="close">Close</option>
                <option value="medium">Medium</option>
              </select>
            </label>
            <label>
              Transit distance preference
              <select name="transitDistancePreference" value={data.transitDistancePreference} onChange={handleChange}>
                <option value="">Select</option>
                <option value="close">Close</option>
                <option value="medium">Medium</option>
              </select>
            </label>
            <label>
              Social amenities preference
              <select name="socialPreference" value={data.socialPreference} onChange={handleChange}>
                <option value="">Select</option>
                <option value="good">Good</option>
                <option value="vibrant">Vibrant</option>
              </select>
            </label>
            <label>
              Noise tolerance
              <select name="noiseTolerance" value={data.noiseTolerance} onChange={handleChange}>
                <option value="">Select</option>
                <option value="low">Prefer quiet</option>
                <option value="medium">Average</option>
                <option value="high">Noise is fine</option>
              </select>
            </label>
            <label>
              Neighborhood safety priority
              <select name="safetyImportance" value={data.safetyImportance} onChange={handleChange}>
                <option value="">Select</option>
                <option value="high">Very important</option>
                <option value="medium">Important</option>
                <option value="low">Flexible</option>
              </select>
            </label>
            <label>
              Transit proximity
              <select name="transportImportance" value={data.transportImportance} onChange={handleChange}>
                <option value="">Select</option>
                <option value="high">Must be close</option>
                <option value="medium">Nice to have</option>
                <option value="low">Not critical</option>
              </select>
            </label>
            <label className="label-inline">
              <input type="checkbox" name="petsOk" checked={data.petsOk} onChange={handleChange} />
              Pets allowed
            </label>
            <label className="label-inline">
              <input type="checkbox" name="smokingOk" checked={data.smokingOk} onChange={handleChange} />
              Smoking allowed
            </label>
            <label className="label-inline">
              <input type="checkbox" name="ensuiteBathroom" checked={data.ensuiteBathroom} onChange={handleChange} />
              En-suite bathroom preferred
            </label>
          </>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          {step > 1 && (
            <button type="button" className="btn btn-ghost" onClick={prev}>
              Back
            </button>
          )}
          {step < 4 && (
            <button type="button" className="btn btn-secondary" onClick={next}>
              Next step
            </button>
          )}
          {step === 4 && (
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
