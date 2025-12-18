import { useEffect, useState } from "react";
import VideoCall from "./VideoCall";
import PropertyMap from "./PropertyMap";

const DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" }
];

const TIMES = ["13:00", "14:00", "15:00", "16:00"];

export default function PropertyDetail({
  property,
  repRequests = [],
  repSlotsRemaining = 0,
  onRepresentativeRequest,
  onRepresentativeTerminate,
  onMessageOwner,
  onMessageRepresentative,
  currentRepPackage,
  onClose,
  onReserve
}) {
  const [showVideo, setShowVideo] = useState(false);
  const [repPrefs, setRepPrefs] = useState({
    representativeLanguage: "",
    representativeAvailability: "",
    representativeTime: "",
    repPackageChoice: ""
  });
  const [requestStatus, setRequestStatus] = useState("");
  const [submittingRep, setSubmittingRep] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTerminated, setSessionTerminated] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState(false);
  const SESSION_MS = 15 * 60 * 1000; // 15 minutes
  const hasExistingPackageCredits = !!currentRepPackage && repSlotsRemaining > 0;
  const ranOutOfMatches = !!currentRepPackage && repSlotsRemaining <= 0;

  useEffect(() => {
    if (!hasExistingPackageCredits) return;
    setRepPrefs((prev) =>
      prev.repPackageChoice === currentRepPackage
        ? prev
        : { ...prev, repPackageChoice: currentRepPackage }
    );
  }, [hasExistingPackageCredits, currentRepPackage]);

  if (!property)
    return (
      <div className="card">
        <p>Select a property to see details, images, and make representative requests.</p>
      </div>
    );

  const existingReq = repRequests.find((r) => r.propertyId === property.id && r.status !== "terminated");
  const videoEnabled = existingReq && existingReq.status === "approved_owner";
  const allowRepMessaging = !!existingReq;

  const handleRepPrefChange = (e) => {
    const { name, value } = e.target;
    setRepPrefs((p) => ({ ...p, [name]: value }));
  };

  const submitRepresentative = async (e) => {
    e.preventDefault();
    if (existingReq) {
      setRequestStatus("You already have a representative request for this property.");
      return;
    }
    if (!repPrefs.repPackageChoice && !hasExistingPackageCredits) {
      setRequestStatus("Please select a representative package.");
      return;
    }
    if (!repPrefs.representativeAvailability || !repPrefs.representativeTime) {
      setRequestStatus("Please choose a day and time.");
      return;
    }
    if (!confirmRequest) {
      setRequestStatus("Please confirm before sending the request.");
      return;
    }
    setRequestStatus(
      hasExistingPackageCredits
        ? "Using your remaining representative match. Submitting request..."
        : ranOutOfMatches
          ? "No representative matches left in your package. Complete the payment to purchase a new package."
          : "Complete the payment to finalize your representative request."
    );
    setSubmittingRep(true);
    try {
      let result = { ok: false, message: "Request handler unavailable." };
      if (onRepresentativeRequest) {
        result = await onRepresentativeRequest({
          propertyId: property.id,
          propertyTitle: property.title,
          language: repPrefs.representativeLanguage || "english",
          session: `${repPrefs.representativeAvailability} ${repPrefs.representativeTime}`,
          repPackageChoice: repPrefs.repPackageChoice,
          triggeredByClick: true
        });
      }
      if (!result || result.ok === false) {
        setRequestStatus(result?.message || "Request could not be created.");
        return;
      }
      setRequestStatus(result.message || "Representative request sent. Awaiting owner approval.");
      setConfirmRequest(false);
    } finally {
      setSubmittingRep(false);
    }
  };

  const startSession = () => {
    if (!videoEnabled || sessionTerminated) return;
    setShowVideo(true);
    setSessionActive(true);
    setSessionTerminated(false);
    setTimeout(() => {
      setShowVideo(false);
      setSessionActive(false);
      setSessionTerminated(true);
      if (onRepresentativeTerminate) onRepresentativeTerminate(property.id);
    }, SESSION_MS);
  };

  const endSessionEarly = () => {
    setShowVideo(false);
    setSessionActive(false);
    setSessionTerminated(true);
    if (onRepresentativeTerminate) onRepresentativeTerminate(property.id);
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h3 style={{ marginTop: 0 }}>{property.title}</h3>
        {typeof onClose === "function" && (
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      <p style={{ margin: "4px 0", color: "var(--muted)" }}>
        {property.city}, {property.country}
      </p>
      <p style={{ margin: "4px 0", fontWeight: 700 }}>EUR {property.price} per month</p>
      <p>{property.description}</p>

      <div style={{ marginTop: 12 }}>
        <h4 style={{ marginBottom: 6 }}>Location</h4>
        <PropertyMap property={property} />
      </div>

      {property.images && property.images.length > 0 && (
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 10 }}>
          {property.images.map((img) => (
            <img
              key={img}
              src={img}
              alt={property.title}
              style={{ width: "100%", borderRadius: 12, objectFit: "cover" }}
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button className="btn btn-secondary" onClick={() => onMessageOwner && onMessageOwner(property.ownerId)}>
          Message owner{property.ownerName ? ` (${property.ownerName})` : ""}
        </button>
        <button className="btn btn-primary" onClick={() => onReserve && onReserve(property)}>
          Reserve this home
        </button>
        {allowRepMessaging && (
          <button className="btn btn-ghost" onClick={() => onMessageRepresentative && onMessageRepresentative()}>
            Message representative
            {existingReq?.representativeName ? ` (${existingReq.representativeName})` : ""}
          </button>
        )}
      </div>

      <h4 style={{ marginTop: 12 }}>Owner</h4>
      <p style={{ margin: 0 }}>
        {property.ownerName || "Listing owner"} {property.ownerEmail ? `- ${property.ownerEmail}` : ""}
      </p>
      <h4 style={{ marginTop: 12 }}>Quality & features</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
        {[
          { label: "Noise", value: property.quality && property.quality.noise },
          { label: "Safety", value: property.quality && property.quality.safety },
          { label: "Transport", value: property.quality && property.quality.transport },
          { label: "Neighbors", value: property.quality && property.quality.neighbors },
          { label: "Market distance", value: property.quality && property.quality.marketDistance },
          { label: "Transit distance", value: property.quality && property.quality.transitDistance },
          { label: "Social amenities", value: property.quality && property.quality.social },
          { label: "Elevator", value: property.features && property.features.elevator ? "Yes" : "No" },
          { label: "Wi-Fi", value: property.features && property.features.wifi ? "Yes" : "No" },
          { label: "Washer", value: property.features && property.features.washer ? "Yes" : "No" }
        ].map((item) => (
          <div
            key={item.label}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "10px 12px",
              background: "#f8fafc"
            }}
          >
            <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {item.label}
            </div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{item.value || "-"}</div>
          </div>
        ))}
      </div>

      {property.hasRepresentative && (
        <>
          <h4 style={{ marginTop: 12 }}>Representative matching</h4>
          <form onSubmit={(e) => e.preventDefault()} style={{ display: "grid", gap: 8 }}>
            {hasExistingPackageCredits ? (
              <div style={{ background: "#eaf7ef", padding: 10, borderRadius: 10, border: "1px solid var(--border)" }}>
                <strong>Using existing package</strong>
                <div>
                  {currentRepPackage === "5" ? "Up to 5 homes (EUR 40)" : "Up to 3 homes (EUR 30)"}
                </div>
                <div>Remaining matches: {repSlotsRemaining < 0 ? 0 : repSlotsRemaining}</div>
              </div>
            ) : (
              <label>
                Representative package
                <select
                  name="repPackageChoice"
                  value={repPrefs.repPackageChoice}
                  onChange={handleRepPrefChange}
                >
                  <option value="">Select a package</option>
                  <option value="3">Up to 3 homes (EUR 30)</option>
                  <option value="5">Up to 5 homes (EUR 40)</option>
                </select>
              </label>
            )}
            {!hasExistingPackageCredits && ranOutOfMatches && (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                No representative matches left in your current package. Select a package above to continue.
              </div>
            )}
            <label>
              Representative day (local to {property.city})
              <select
                name="representativeAvailability"
                value={repPrefs.representativeAvailability}
                onChange={handleRepPrefChange}
              >
                <option value="">Select day</option>
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Time (local to {property.city})
              <select
                name="representativeTime"
                value={repPrefs.representativeTime}
                onChange={handleRepPrefChange}
              >
                <option value="">Select time</option>
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Representative language
              <select
                name="representativeLanguage"
                value={repPrefs.representativeLanguage}
                onChange={handleRepPrefChange}
              >
                <option value="">Select language</option>
                <option value="english">English</option>
                <option value="turkish">Turkish</option>
                <option value="german">German</option>
                <option value="french">French</option>
              </select>
            </label>
            {currentRepPackage && !hasExistingPackageCredits && (
              <div style={{ background: "#f3f7f7", padding: 10, borderRadius: 10, border: "1px solid var(--border)" }}>
                <strong>Representative package</strong>
                <div>
                  {currentRepPackage === "5" ? "Up to 5 homes (EUR 40)" : "Up to 3 homes (EUR 30)"}
                </div>
                <div>Remaining matches: {repSlotsRemaining < 0 ? 0 : repSlotsRemaining}</div>
              </div>
            )}
            <label className="label-inline">
              <input
                type="checkbox"
                checked={confirmRequest}
                onChange={(e) => setConfirmRequest(e.target.checked)}
              />
              <span>I confirm to send this request</span>
            </label>
            <button className="btn btn-primary" type="button" disabled={!confirmRequest || submittingRep} onClick={submitRepresentative}>
              Request a representative
            </button>
            {requestStatus && <div style={{ color: "var(--muted)" }}>{requestStatus}</div>}
            {existingReq && (
              <div style={{ color: "var(--muted)" }}>
                Current status: {existingReq.status === "approved_owner" ? "APPROVED (owner confirmed)" : existingReq.status.toUpperCase()}
              </div>
            )}
          </form>

          <div style={{ marginTop: 16 }}>
            <h4>Live walkthrough</h4>
            {!videoEnabled && (
              <p>Video room will be enabled after matching and at the confirmed time.</p>
            )}
            {sessionTerminated && (
              <p style={{ color: "var(--muted)" }}>Representative session terminated successfully.</p>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button
                className="btn btn-secondary"
                disabled={!videoEnabled || sessionTerminated}
                onClick={startSession}
              >
                {!videoEnabled
                  ? "Video disabled"
                  : sessionActive
                    ? "Session in progress (15 min)"
                    : sessionTerminated
                      ? "Session terminated"
                      : "Open video room"}
              </button>
              {videoEnabled && sessionActive && (
                <button className="btn btn-ghost" type="button" onClick={endSessionEarly}>
                  Close session
                </button>
              )}
            </div>
            {videoEnabled && showVideo && (
              <VideoCall
                roomName={`property-${property.id}-demo-room`}
                height={400}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
