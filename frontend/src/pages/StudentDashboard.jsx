import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import OnboardingForm from "../components/OnboardingForm";
import PropertyList from "../components/PropertyList";
import PropertyDetail from "../components/PropertyDetail";
import ChatWindow from "../components/ChatWindow";
import PaymentModal from "../components/PaymentModal";

const FALLBACK_CONVERSATION_CONTACTS = [
  { title: "Owner relations", name: "Support team" },
  { title: "Operations desk", name: "Housing HQ" },
  { title: "General queue", name: "Team Overseas" }
];
const STUDENT_CACHE_KEY = "studentDashboardCache";

const safeStorage = {
  read(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      console.warn("Storage read failed", err);
      return null;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.warn("Storage write failed", err);
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn("Storage remove failed", err);
    }
  }
};

export default function StudentDashboard() {
  const { user } = useAuth();

  const [preferences, setPreferences] = useState(() => null);
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [consultantRequestStatus, setConsultantRequestStatus] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [consultantCall, setConsultantCall] = useState({ date: "", time: "", note: "", status: "idle" });
  const [ratings, setRatings] = useState({ consultant: null, representative: null });
  const chatBoxRef = useRef(null);
  const listRef = useRef(null);
  const [toast, setToast] = useState(null);
  const [view, setView] = useState("overview");
  const [payment, setPayment] = useState({ open: false, item: null });
  const [pendingConsultantAssign, setPendingConsultantAssign] = useState(false);
  const [pendingRepRequest, setPendingRepRequest] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const navigate = useNavigate();
  const offlineNoticeShown = useRef(false);

  const parseNote = (note) => {
    if (!note) return {};
    try {
      return JSON.parse(note);
    } catch (err) {
      return {};
    }
  };

  const repAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.type === "representative")
        .map((a) => ({ ...a, meta: parseNote(a.note) })),
    [appointments]
  );
  const representativeMap = useMemo(() => {
    const map = {};
    repAppointments.forEach((appt) => {
      if (appt.meta?.representativeId) {
        map[appt.meta.representativeId] = appt.meta?.representativeName || "Representative";
      }
    });
    return map;
  }, [repAppointments]);

  const activeRepCount = useMemo(
    () => repAppointments.filter((r) => r.status !== "terminated").length,
    [repAppointments]
  );
  const repLimit = preferences?.repPackage ? (preferences.repPackage === "5" ? 5 : 3) : null;
  const repRemainingFromPrefs =
    preferences?.repMatchesRemaining != null ? preferences.repMatchesRemaining : null;
  const fallbackRepRemaining = repLimit != null ? Math.max(repLimit - activeRepCount, 0) : null;
  const repRemaining = repRemainingFromPrefs != null ? repRemainingFromPrefs : fallbackRepRemaining;

  const filters = useMemo(() => {
    const base = {
      city: preferences?.city || "",
      country: preferences?.country || ""
    };
    if (!preferences) return base;
    return {
      ...base,
      noiseTolerance: preferences.noiseTolerance,
      safetyImportance: preferences.safetyImportance,
      transportImportance: preferences.transportImportance,
      neighborsPreference: preferences.neighborsPreference,
      marketDistancePreference: preferences.marketDistancePreference,
      transitDistancePreference: preferences.transitDistancePreference,
      socialPreference: preferences.socialPreference,
      elevatorNeeded: preferences.elevatorNeeded,
      wifiNeeded: preferences.wifiNeeded,
      washerNeeded: preferences.washerNeeded
    };
  }, [preferences]);

  const consultantId = preferences?.consultantId || null;
  const hasConsultant = Boolean(consultantId);
  const consultantName = hasConsultant ? preferences?.consultantName || "Assigned: Alice Cooper" : "-";
  const needsConsultantPaymentNotice = preferences?.workWithConsultant === "yes" && !hasConsultant;
  const activeRepresentative = repAppointments.find((r) => r.status !== "terminated");
  const representativeName = activeRepresentative?.meta?.representativeName || null;
  const repId = activeRepresentative?.meta?.representativeId || null;
  const hasRep = repAppointments.length > 0;

  const ownerMap = {
    u4: "Anna Bauer",
    u7: "Michael Roth",
    u8: "Sofia Marino",
    u9: "Lucas Weber"
  };

  const knownConversationLabel = (conv) => {
    if (consultantId && conv.participants.includes(consultantId)) return `Consultant (${consultantName})`;
    const repEntry = Object.entries(representativeMap).find(([id]) => conv.participants.includes(id));
    if (repEntry) {
      const [, name] = repEntry;
      return `Representative (${name})`;
    }
    const ownerId = conv.participants.find((p) => ownerMap[p]);
    if (ownerId) return `Owner (${ownerMap[ownerId]})`;
    return null;
  };

  const fallbackConversationMap = useMemo(() => {
    let cursor = 0;
    return conversations.reduce((acc, conv) => {
      if (knownConversationLabel(conv)) return acc;
      const contact = FALLBACK_CONVERSATION_CONTACTS[cursor % FALLBACK_CONVERSATION_CONTACTS.length];
      acc[conv.id] = `${contact.title} (${contact.name})`;
      cursor += 1;
      return acc;
    }, {});
  }, [conversations, consultantId, consultantName, representativeMap]);

  const conversationLabel = (conv) => {
    const known = knownConversationLabel(conv);
    if (known) return known;
    return fallbackConversationMap[conv.id] || `Conversation ${conv.id}`;
  };

  useEffect(() => {
    let cancelled = false;
    const loadAllDashboardData = async () => {
      setLoadingDashboard(true);
      setDashboardError(null);
      setSelectedProperty(null);
      setSelectedConversationId(null);
      setConsultantCall({ date: "", time: "", note: "", status: "idle" });
      setConsultantRequestStatus("");
      try {
        const [prefsRes, ratingsRes, convRes, apptRes] = await Promise.all([
          api.get("/preferences"),
          api.get("/ratings"),
          api.get("/conversations", { params: { userId: user.id } }),
          api.get("/appointments")
        ]);
        if (cancelled) return;
        const prefs = prefsRes.data && Object.keys(prefsRes.data).length ? prefsRes.data : null;
        if (prefs?.consultantName) {
          prefs.consultantName = prefs.consultantName.replace(/\s*\(assigning\)\s*$/i, "");
        }
        const ratingsPayload = {
          consultant: ratingsRes.data.consultant ?? null,
          representative: ratingsRes.data.representative ?? null
        };
        const conversationsPayload = convRes.data || [];
        const appointmentsPayload = apptRes.data || [];

        setPreferences(prefs);
        setRatings(ratingsPayload);
        setConversations(conversationsPayload);
        setAppointments(appointmentsPayload);
        setSelectedConversationId(conversationsPayload[0] ? conversationsPayload[0].id : null);

        safeStorage.write(
          STUDENT_CACHE_KEY,
          JSON.stringify({
            preferences: prefs,
            ratings: ratingsPayload,
            conversations: conversationsPayload,
            appointments: appointmentsPayload
          })
        );
        offlineNoticeShown.current = false;
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load dashboard data", err);
        const cachedRaw = safeStorage.read(STUDENT_CACHE_KEY);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw);
            setPreferences(cached.preferences || null);
            setRatings(cached.ratings || { consultant: null, representative: null });
            setConversations(cached.conversations || []);
            setAppointments(cached.appointments || []);
            setSelectedConversationId(cached.conversations?.[0]?.id || null);
            setDashboardError(null);
            if (!offlineNoticeShown.current) {
              setToast({ text: "Offline mode: showing your last saved dashboard.", type: "info" });
              offlineNoticeShown.current = true;
              setTimeout(() => setToast(null), 4000);
            }
          } catch (parseErr) {
            console.error("Failed to parse cached dashboard data", parseErr);
            safeStorage.remove(STUDENT_CACHE_KEY);
            setPreferences(null);
            setRatings({ consultant: null, representative: null });
            setConversations([]);
            setAppointments([]);
            setDashboardError("Dashboard verileri yüklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.");
          }
        } else {
          setPreferences(null);
          setRatings({ consultant: null, representative: null });
          setConversations([]);
          setAppointments([]);
          setDashboardError("Dashboard verileri yüklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.");
        }
      } finally {
        if (!cancelled) {
          setLoadingDashboard(false);
        }
      }
    };
    loadAllDashboardData();
    return () => {
      cancelled = true;
    };
  }, [reloadToken, user.id]);

  const retryDashboardLoad = () => setReloadToken((v) => v + 1);

  if (loadingDashboard) {
    return (
      <div className="main-content">
        <h1>Loading dashboard...</h1>
        <p style={{ color: "var(--muted)" }}>Preparing your saved criteria and conversations.</p>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="main-content">
        <h1>Couldn't load dashboard</h1>
        <p style={{ color: "var(--muted)", marginBottom: 12 }}>{dashboardError}</p>
        <button className="btn btn-primary" onClick={retryDashboardLoad}>
          Retry
        </button>
      </div>
    );
  }

  const updatePrefs = async (next) => {
    setPreferences(next);
    try {
      await api.put("/preferences", next);
    } catch (err) {
      console.error("Failed to save preferences", err);
      throw err;
    }
  };

  const resetProfile = async () => {
    try {
      await api.delete("/preferences");
      await api.put("/ratings", { consultant: null, representative: null });
      setPreferences(null);
      setSelectedProperty(null);
      setSelectedConversationId(null);
      setRatings({ consultant: null, representative: null });
      setConsultantCall({ date: "", time: "", note: "", status: "idle" });
    } catch (err) {
      console.error("Failed to reset profile", err);
    }
  };

  const handleOnboardingComplete = async (data) => {
    try {
      await updatePrefs(data);
    } catch (err) {
      setToast({ text: "Preferences could not be saved. Please try again.", type: "info" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setEditingPrefs(false);
    setSelectedProperty(null);
    setView("tours");
    // Ensure we are on the main dashboard and scroll to listings when rendered
    navigate("/student", { replace: true });
    setTimeout(() => scrollToListTop(), 80);
    setToast({ text: "Preferences saved. Listings updated.", type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  const scrollToListTop = () => {
    if (listRef.current) {
      const top = listRef.current.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleSelectProperty = (prop) => {
    setSelectedProperty(prop);
    scrollToListTop();
  };

  const handleCloseProperty = () => {
    setSelectedProperty(null);
    scrollToListTop();
  };

  const ensureConversation = async (targetId) => {
    if (!targetId) return null;
    const existing = conversations.find((c) => c.participants.includes(user.id) && c.participants.includes(targetId));
    if (existing) return existing.id;
    try {
      const res = await api.post("/conversations", { participantIds: [user.id, targetId] });
      const newConv = res.data;
      setConversations((c) => [...c, newConv]);
      return newConv.id;
    } catch (err) {
      console.error("Failed to start conversation", err);
      return null;
    }
  };

  const consultantPool = [
    { id: "u2", name: "Jordan Lee", focuses: ["fast_shortlist", "budget_optimization"], languages: ["english", "german"] },
    { id: "u5", name: "Taylor Brooks", focuses: ["paperwork", "fast_shortlist"], languages: ["english", "french"] },
    { id: "u6", name: "Casey Morgan", focuses: ["budget_optimization", "paperwork"], languages: ["english", "turkish"] }
  ];
  const representativePool = [
    { id: "rep_amelia", name: "Amelia Duarte", languages: ["english", "spanish"] },
    { id: "rep_jules", name: "Jules Martin", languages: ["french", "english"] },
    { id: "rep_sofia", name: "Sofia Nilsson", languages: ["swedish", "english"] },
    { id: "rep_kaya", name: "Kaya Demir", languages: ["turkish", "english"] },
    { id: "rep_mateo", name: "Mateo Rossi", languages: ["italian", "english"] }
  ];
  const pickRepresentative = (language = "english") => {
    const normalized = (language || "english").toLowerCase();
    const matches = representativePool.filter((rep) => rep.languages.includes(normalized));
    const pool = matches.length > 0 ? matches : representativePool;
    return pool[Math.floor(Math.random() * pool.length)] || representativePool[0];
  };

  const handleRequestConsultant = (opts = {}) => {
    if (!opts.triggeredByClick) return;
    setPendingConsultantAssign(true);
    setPayment({ open: true, item: { title: "Consultant plan (EUR 65/month)", amount: 65, type: "consultant" } });
  };

  const handleConsultantFocusChange = async (value) => {
    try {
      await updatePrefs({ ...(preferences || {}), consultantFocus: value });
    } catch (err) {
      console.error("Failed to update consultant focus", err);
    }
  };

  const handleConsultantLanguageChange = async (value) => {
    try {
      await updatePrefs({ ...(preferences || {}), consultantLanguages: value });
    } catch (err) {
      console.error("Failed to update consultant language", err);
    }
  };

  const finalizeConsultantAssign = async () => {
    setPendingConsultantAssign(false);
    const desiredFocus = preferences?.consultantFocus;
    const desiredLang = preferences?.consultantLanguages;
    const match =
      consultantPool.find((c) => c.focuses.includes(desiredFocus) && c.languages.includes(desiredLang)) ||
      consultantPool.find((c) => c.languages.includes(desiredLang)) ||
      consultantPool[0];

    const updated = {
      ...(preferences || {}),
      workWithConsultant: "yes",
      consultantName: `${match.name}`,
      consultantId: match.id
    };
    try {
      await updatePrefs(updated);
      setConsultantRequestStatus("Consultant request confirmed.");
      setToast({ text: "Consultant assigned.", type: "success" });
      setTimeout(() => setToast(null), 3000);
      return true;
    } catch (err) {
      console.error("Failed to finalize consultant assignment", err);
      setToast({ text: "Consultant could not be assigned. Please try again.", type: "info" });
      setTimeout(() => setToast(null), 3000);
      return false;
    }
  };

  const createRepresentativeAppointment = async (payload, packageChoice, options = {}) => {
    const { resolve, useExistingPackage = false } = options;
    const limit = packageChoice === "5" ? 5 : 3;
    const currentRemaining =
      preferences?.repMatchesRemaining != null
        ? preferences.repMatchesRemaining
        : repRemaining ?? limit;
    const nextRemaining = useExistingPackage ? Math.max(currentRemaining - 1, 0) : Math.max(limit - 1, 0);
    const repMatch = pickRepresentative(payload.language);
    const note = JSON.stringify({
      ...payload,
      representativeName: repMatch.name,
      representativeId: repMatch.id
    });
    try {
      const res = await api.post("/appointments", {
        type: "representative",
        time: payload.session,
        note,
        participantIds: []
      });
      setAppointments((prev) => [res.data, ...prev]);
      const updatedPrefs = { ...(preferences || {}), repPackage: packageChoice, repMatchesRemaining: nextRemaining };
      await updatePrefs(updatedPrefs);
      setToast({ text: "Representative request created.", type: "success" });
      setTimeout(() => setToast(null), 4000);
      resolve?.({ ok: true, message: "Representative request sent. Awaiting owner approval." });
    } catch (err) {
      const message = err.response?.data?.message || "Request could not be created.";
      resolve?.({ ok: false, message });
      throw new Error(message);
    }
  };

  const handleRepresentativeRequest = (payload = {}) => {
    return new Promise((resolve) => {
      if (!payload?.triggeredByClick) {
        resolve({ ok: false, message: "Please click Send request to create it." });
        return;
      }
      const packageChoice = payload.repPackageChoice || preferences?.repPackage;
      if (!packageChoice) {
        resolve({ ok: false, message: "Please select a representative package." });
        return;
      }
      const isExistingPackage = preferences?.repPackage && preferences.repPackage === packageChoice;
      const hasExistingSlots = isExistingPackage && repRemaining != null && repRemaining > 0;
      const useExistingPackage = hasExistingSlots;

      if (useExistingPackage) {
        createRepresentativeAppointment(
          {
            propertyId: payload.propertyId,
            propertyTitle: payload.propertyTitle,
            language: payload.language,
            session: payload.session
          },
          packageChoice,
          { resolve, useExistingPackage: true }
        ).catch(() => {});
        return;
      }
      if (pendingRepRequest?.resolve) {
        pendingRepRequest.resolve({ ok: false, message: "Previous payment cancelled." });
      }
      setPendingRepRequest({
        payload: {
          propertyId: payload.propertyId,
          propertyTitle: payload.propertyTitle,
          language: payload.language,
          session: payload.session
        },
        packageChoice,
        resolve
      });
      setPayment({
        open: true,
        item: {
          title:
            packageChoice === "5"
              ? "Representative plan (Up to 5 homes)"
              : "Representative plan (Up to 3 homes)",
          description:
            packageChoice === "5"
              ? "Includes language matching and verified reps for up to five properties."
              : "Includes language matching and verified reps for up to three properties.",
          amount: packageChoice === "5" ? 40 : 30,
          type: "representative"
        }
      });
    });
  };

  const finalizeRepresentativeRequest = async () => {
    if (!pendingRepRequest) throw new Error("No representative request in progress.");
    const { payload, packageChoice, resolve } = pendingRepRequest;
    try {
      await createRepresentativeAppointment(payload, packageChoice, { resolve, useExistingPackage: false });
    } finally {
      setPendingRepRequest(null);
    }
  };

  const handlePaymentConfirm = async () => {
    if (payment.item?.type === "consultant") {
      const ok = await finalizeConsultantAssign();
      return ok ? { ok: true } : { ok: false, message: "Consultant request could not be completed." };
    }
    if (payment.item?.type === "representative") {
      try {
        await finalizeRepresentativeRequest();
        return { ok: true, label: payment.item?.title || "Representative plan" };
      } catch (err) {
        console.error("Representative request payment failed", err);
        return { ok: false, message: err?.message || "Representative request failed." };
      }
    }
    return { ok: true };
  };

  const handlePaymentClose = (reason = "cancel") => {
    setPayment({ open: false, item: null });
    if (reason === "success") return;
    if (pendingConsultantAssign) {
      setPendingConsultantAssign(false);
    }
    if (pendingRepRequest?.resolve) {
      pendingRepRequest.resolve({ ok: false, message: "Payment cancelled before completion." });
      setPendingRepRequest(null);
    }
  };

  const handleRepresentativeTerminate = async (propertyId) => {
    const target = repAppointments.find((r) => r.meta.propertyId === propertyId);
    if (!target) return;
    try {
      const res = await api.patch(`/appointments/${target.id}/status`, { status: "terminated" });
      setAppointments((prev) => prev.map((a) => (a.id === target.id ? res.data : a)));
    } catch (err) {
      setToast({ text: err.response?.data?.message || "Could not terminate request.", type: "info" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const submitConsultantCall = async (e) => {
    e.preventDefault();
    if (!consultantCall.date || !consultantCall.time) {
      setConsultantCall((c) => ({ ...c, status: "error" }));
      return;
    }
    const timeLabel = `${consultantCall.date} ${consultantCall.time}`;
    try {
      const res = await api.post("/appointments", {
        type: "consultant_call",
        time: timeLabel,
        note: consultantCall.note || "",
        participantIds: []
      });
      setAppointments((prev) => [res.data, ...prev]);
      setConsultantCall((c) => ({ ...c, status: "pending", note: "" }));
      setToast({ text: "Consultant call request submitted.", type: "info" });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setToast({ text: err.response?.data?.message || "Could not create call request", type: "info" });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const messageTarget = async (targetId, goMessages = false) => {
    const convId = await ensureConversation(targetId);
    if (convId) setSelectedConversationId(convId);
    if (goMessages) setView("messages");
    if (chatBoxRef.current) chatBoxRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateRating = async (type, value) => {
    const next = { ...ratings, [type]: value };
    setRatings(next);
    try {
      await api.put("/ratings", next);
    } catch (err) {
      console.error("Failed to update rating", err);
    }
  };

  // Onboarding considered complete once preferences exist
  const isIncomplete = !preferences;
  if (isIncomplete) {
    return (
      <div className="main-content">
        <h1>Welcome, {user.name}</h1>
        <p style={{ color: "var(--muted)", marginBottom: 16 }}>
          Tell us your stay details so we can tailor listings and, if you want, pair you with a consultant.
        </p>
        <OnboardingForm onComplete={handleOnboardingComplete} initialData={preferences || undefined} />
      </div>
    );
  }

  const appointmentList = appointments.map((a) => {
    if (a.type === "representative") {
      const meta = repAppointments.find((r) => r.id === a.id)?.meta || {};
      return {
        type: `Representative (${meta.propertyTitle || "-"})`,
        time: a.time,
        status: a.status
      };
    }
    if (a.type === "consultant_call") {
      return {
        type: "Consultant call",
        time: a.time,
        status: a.status
      };
    }
    return {
      type: a.type,
      time: a.time,
      status: a.status
    };
  });

  const consultantStatusText =
    consultantCall.status === "pending"
      ? "Consultant call pending."
      : consultantCall.status === "error"
      ? "Please add date and time."
      : "";

  const criteriaItems = [
    { label: "Location", value: preferences.city ? `${preferences.city}, ${preferences.country}` : "Unspecified" },
    { label: "Purpose", value: preferences.reason },
    { label: "Duration", value: preferences.duration },
    { label: "Type", value: preferences.housingType },
    { label: "Budget", value: `EUR ${preferences.budgetMin} - ${preferences.budgetMax}` },
    { label: "Roommates", value: preferences.roommatePref },
    { label: "Furnished", value: preferences.furnished },
    { label: "Transit", value: preferences.transportImportance },
    { label: "Safety", value: preferences.safetyImportance },
    { label: "Noise", value: preferences.noiseTolerance },
    { label: "Neighbors", value: preferences.neighborsPreference },
    { label: "Market distance", value: preferences.marketDistancePreference },
    { label: "Transit distance", value: preferences.transitDistancePreference },
    { label: "Social amenities", value: preferences.socialPreference },
    { label: "Wi-Fi", value: preferences.wifiNeeded ? "Required" : "Optional" },
    { label: "Washer", value: preferences.washerNeeded ? "Required" : "Optional" },
    { label: "Elevator", value: preferences.elevatorNeeded ? "Required" : "Optional" }
  ];

  return (
    <div className="main-content">
      {toast && (
        <div style={{ position: "sticky", top: 0, zIndex: 20, marginBottom: 10 }}>
          <div style={{
            background: toast.type === "success" ? "#ecfdf3" : "#eff6ff",
            color: "#0f172a",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 12px",
            boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 10
          }}>
            <span style={{ fontWeight: 700 }}>{toast.type === "success" ? "Notice" : "Info"}</span>
            <span>{toast.text}</span>
            <span style={{ marginLeft: "auto", fontWeight: 600 }}>Info</span>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button>
            <h1 style={{ margin: 0 }}>Welcome back, {user.name} ★</h1>
          </div>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            We are showing homes based on your saved criteria. You can refine them anytime.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn btn-secondary" onClick={() => setEditingPrefs((v) => !v)}>
            {editingPrefs ? "Close" : "Edit"}
          </button>
          <button className="btn btn-ghost" onClick={resetProfile}>Start over</button>
        </div>
      </div>

      <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <button className={`btn ${view === "overview" ? "btn-primary" : "btn-ghost"}`} onClick={() => setView("overview")}>Overview</button>
        <button className={`btn ${view === "tours" ? "btn-primary" : "btn-ghost"}`} onClick={() => setView("tours")}>Suggested homes & tours</button>
        <button className={`btn ${view === "consultant" ? "btn-primary" : "btn-ghost"}`} onClick={() => setView("consultant")}>Consultant</button>
        {hasRep && (
          <button
            className={`btn ${view === "representative" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setView("representative")}
          >
            Representative{representativeName ? ` (${representativeName})` : ""}
          </button>
        )}
        <button className={`btn ${view === "messages" ? "btn-primary" : "btn-ghost"}`} onClick={() => setView("messages")}>Messages</button>
      </div>

      {view === "overview" && (
        <div className="grid-two" style={{ marginTop: 8 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div className="card" style={{ display: "grid", gap: 10 }}>
              <div className="section-title" style={{ marginBottom: 4 }}>
                <h3 style={{ margin: 0 }}>Your criteria</h3>
              </div>
              {hasConsultant && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "#f2fbf7", borderRadius: 10 }}>
                  <span style={{ fontWeight: 600 }}>Consultant: {consultantName}</span>
                  <button className="btn btn-secondary" onClick={() => setView("consultant")}>Go to consultant</button>
                </div>
              )}
              {needsConsultantPaymentNotice && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "1px dashed #0f172a20", background: "#fff9f0" }}>
                  <div style={{ fontWeight: 600, color: "#b45309" }}>
                    Consultant pairing pending — complete payment to finish assignment.
                  </div>
                  <button className="btn btn-secondary" onClick={() => handleRequestConsultant({ triggeredByClick: true })}>
                    Complete payment
                  </button>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                {criteriaItems.map((item) => (
                  <div key={item.label} style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "#f8fafc"
                  }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {item.label}
                    </div>
                    <div style={{ fontWeight: 600, marginTop: 4 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            {editingPrefs && <OnboardingForm onComplete={handleOnboardingComplete} initialData={preferences} />}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div className="card" style={{ marginTop: 0 }}>
              <h3 style={{ marginTop: 0 }}>Appointments</h3>
              <ul className="list-clean" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                {appointments.length === 0 && <li>No scheduled appointments yet.</li>}
                {appointments.map((a, idx) => (
                  <li
                    key={`${a.type}-${idx}`}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "8px 10px",
                      background: a.status === "approved_owner" || a.status === "approved"
                        ? "linear-gradient(135deg, #e8fff4, #f6fffa)"
                        : "#f8fafc"
                    }}
                  >
                    {a.type}: {a.time} {a.status && a.status !== "approved" ? `(status: ${a.status})` : ""}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card" style={{ display: "grid", gap: 6 }}>
              <h3 style={{ marginTop: 0 }}>Consultant requests</h3>
              <div style={{ color: "var(--muted)" }}>
                Status: {consultantCall.status === "idle" ? "None yet" : consultantCall.status}
              </div>
              {consultantCall.date && consultantCall.time && (
                <div style={{ color: "var(--muted)" }}>
                  Scheduled: {consultantCall.date} {consultantCall.time}
                </div>
              )}
              {hasConsultant && (
                <div style={{ color: "var(--muted)" }}>
                  Assigned consultant: {consultantName}
                </div>
              )}
            </div>

            <div className="card" style={{ display: "grid", gap: 6 }}>
              <h3 style={{ marginTop: 0 }}>Representative requests</h3>
              {repAppointments.length === 0 && <div style={{ color: "var(--muted)" }}>No representative requests yet.</div>}
              {repAppointments.slice(-4).map((r) => (
                <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "#f8fafc" }}>
                  <div style={{ fontWeight: 600 }}>{r.meta.propertyTitle || "-"}</div>
                  <div style={{ color: "var(--muted)" }}>{r.meta.session || "-"} • {r.meta.language || "-"}</div>
                  <div style={{ color: "var(--muted)" }}>Status: {r.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "tours" && (
        <div className="grid-two" style={{ marginTop: 10 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <PropertyList
              filters={filters}
              onSelect={handleSelectProperty}
              selectedId={selectedProperty?.id}
              listRef={listRef}
            />
            <div className="card" style={{ display: "grid", gap: 8, maxHeight: 240, overflowY: "auto" }}>
              <h3 style={{ marginTop: 0 }}>Representative requests</h3>
              {!preferences.repPackage && (
                <div style={{ color: "var(--muted)" }}>
                  No representative package yet. Choose one on a listing when you request a live tour (EUR 30 for 3 homes, EUR 40 for 5 homes).
                </div>
              )}
              {preferences.repPackage && (
                <div style={{ color: "var(--muted)" }}>
                  Package: {preferences.repPackage === "5" ? "Up to 5 homes (EUR 40)" : "Up to 3 homes (EUR 30)"}
                  {repRemaining != null && ` | Remaining: ${repRemaining}`}
                </div>
              )}
              <ul className="list-clean" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
              {repAppointments.length === 0 && <li>No representative requests yet.</li>}
              {repAppointments.map((r) => (
                <li key={r.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                  {r.meta.propertyTitle || "-"} - {r.meta.session || "-"} - {r.meta.language || "-"} -{" "}
                  {r.meta.representativeName ? r.meta.representativeName + " - " : ""}
                  {r.status.toUpperCase()}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
        <PropertyDetail
            property={selectedProperty}
            repRequests={repAppointments.map((r) => ({
              id: r.id,
              propertyId: r.meta.propertyId,
              propertyTitle: r.meta.propertyTitle,
              language: r.meta.language,
              session: r.meta.session,
              representativeName: r.meta.representativeName,
              representativeId: r.meta.representativeId,
              status: r.status
            }))}
            repSlotsRemaining={repRemaining == null ? 99 : repRemaining}
            currentRepPackage={preferences.repPackage}
            onClose={handleCloseProperty}
            onRepresentativeRequest={handleRepresentativeRequest}
            onRepresentativeTerminate={handleRepresentativeTerminate}
            onMessageOwner={(ownerId) => messageTarget(ownerId, true)}
            onMessageRepresentative={() => repId && messageTarget(repId, true)}
            onReserve={(prop) => setPayment({ open: true, item: { title: `Reserve ${prop.title}`, amount: prop.price } })}
          />
        </div>
      </div>
    )}

      {view === "consultant" && (
        <div className="grid-two" style={{ marginTop: 10, gridTemplateColumns: "1fr 1.2fr" }}>
          <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
            <div className="card" style={{ display: "grid", gap: 10 }}>
              <h3 style={{ marginTop: 0 }}>Consultant</h3>
              <div style={{ color: "var(--muted)" }}>Assigned: {hasConsultant ? consultantName : "None"}</div>
              {!hasConsultant && (
                <div style={{ display: "grid", gap: 8 }}>
                  {needsConsultantPaymentNotice && (
                    <div style={{ border: "1px dashed #f97316", borderRadius: 10, padding: "8px 10px", background: "#fff7ed", color: "#b45309", fontWeight: 600 }}>
                      You already selected “Pair me with a consultant” during onboarding. Complete the payment below to finish the match.
                    </div>
                  )}
                  <label>
                    Preferred focus
                    <select
                      value={preferences.consultantFocus || ""}
                      onChange={(e) => handleConsultantFocusChange(e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="fast_shortlist">Fast shortlist and tours</option>
                      <option value="paperwork">Paperwork and contracts</option>
                      <option value="budget_optimization">Budget optimization</option>
                    </select>
                  </label>
                  <label>
                    Preferred language
                    <select
                      value={preferences.consultantLanguages || ""}
                      onChange={(e) => handleConsultantLanguageChange(e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="english">English</option>
                      <option value="turkish">Turkish</option>
                      <option value="german">German</option>
                      <option value="french">French</option>
                    </select>
                  </label>
                  <button className="btn btn-primary" onClick={() => handleRequestConsultant({ triggeredByClick: true })}>
                    Request a consultant (EUR 65/month)
                  </button>
                </div>
              )}
              {hasConsultant && (
                <button className="btn btn-secondary" onClick={() => messageTarget(consultantId, true)}>
                  <div style={{ display: "grid", lineHeight: 1.2 }}>
                    <span>Message consultant</span>
                    <small style={{ color: "var(--muted)", fontWeight: 500 }}>{consultantName}</small>
                  </div>
                </button>
              )}
              {consultantRequestStatus && <div style={{ color: "var(--muted)" }}>{consultantRequestStatus}</div>}
            </div>

            <div className="card" style={{ display: "grid", gap: 8 }}>
              <h3 style={{ marginTop: 0 }}>Consultant requests</h3>
              <ul className="list-clean" style={{ color: "var(--muted)" }}>
                <li>Call status: {consultantCall.status === "idle" ? "Not requested" : consultantCall.status}</li>
                {consultantCall.date && consultantCall.time && (
                  <li>Requested: {consultantCall.date} {consultantCall.time}</li>
                )}
              </ul>
            </div>

            <div className="card" style={{ display: "grid", gap: 8 }}>
              <h3 style={{ marginTop: 0 }}>Documents from your consultant</h3>
              {hasConsultant ? (
                <ul className="list-clean" style={{ color: "var(--muted)" }}>
                  {[
                    { name: "Shortlist (PDF)", date: "2025-12-12" },
                    { name: "Lease checklist (DOCX)", date: "2025-12-10" },
                    { name: "City guide (PDF)", date: "2025-12-09" }
                  ].map((d) => (
                    <li key={d.name} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "#f8fafc" }}>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div style={{ color: "var(--muted)" }}>Uploaded: {d.date}</div>
                      <button className="btn btn-ghost" style={{ marginTop: 6 }}>View / download</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: "var(--muted)" }}>No documents yet.</div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div className="card" style={{ display: "grid", gap: 8 }}>
              <h3 style={{ marginTop: 0 }}>Consultant call request</h3>
              <form onSubmit={submitConsultantCall} style={{ display: "grid", gap: 8 }}>
                <label>
                  Date
                  <input
                    type="date"
                    value={consultantCall.date}
                    onChange={(e) => setConsultantCall((c) => ({ ...c, date: e.target.value }))}
                  />
                </label>
                <label>
                  Time
                  <input
                    type="time"
                    value={consultantCall.time}
                    onChange={(e) => setConsultantCall((c) => ({ ...c, time: e.target.value }))}
                  />
                </label>
                <label>
                  Notes
                  <textarea
                    value={consultantCall.note}
                    onChange={(e) => setConsultantCall((c) => ({ ...c, note: e.target.value }))}
                    placeholder="Share your priorities"
                  />
                </label>
                <button className="btn btn-primary" type="submit" disabled={!hasConsultant}>
                  {hasConsultant ? "Send consultant request" : "Get a consultant first"}
                </button>
                {consultantStatusText && <div style={{ color: "var(--muted)" }}>{consultantStatusText}</div>}
              </form>
            </div>

            {(hasConsultant || repAppointments.length > 0) && (
              <div className="card" style={{ display: "grid", gap: 8 }}>
                <h3 style={{ marginTop: 0 }}>Rate your support</h3>
                <div style={{ display: "grid", gap: 6, color: "var(--muted)" }}>
                  {hasConsultant && (
                    <label>
                      Consultant rating
                      <select value={ratings.consultant || ""} onChange={(e) => updateRating("consultant", e.target.value)}>
                        <option value="">Select rating</option>
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={`c-${v}`} value={v}>{`${v} / 5`}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {repAppointments.length > 0 && (
                    <label>
                      Representative rating
                      <select value={ratings.representative || ""} onChange={(e) => updateRating("representative", e.target.value)}>
                        <option value="">Select rating</option>
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={`r-${v}`} value={v}>{`${v} / 5`}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Appointments</h3>
              <ul className="list-clean" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
              {appointmentList.filter((a) => a.type.includes("Consultant")).length === 0 && <li>No consultant appointments yet.</li>}
              {appointmentList.filter((a) => a.type.includes("Consultant")).map((a, idx) => (
                  <li key={`capp-${idx}`} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "#f8fafc" }}>
                    {a.type}: {a.time}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {view === "representative" && (
        <div className="grid-two" style={{ marginTop: 10 }}>
          <div className="card" style={{ display: "grid", gap: 10 }}>
            <h3 style={{ marginTop: 0 }}>Representatives</h3>
            <div style={{ color: "var(--muted)" }}>
              Assigned requests: {repAppointments.length}
            </div>
            {repId && (
              <button className="btn btn-secondary" onClick={() => messageTarget(repId, true)}>
                Message representative{representativeName ? ` (${representativeName})` : ""}
              </button>
            )}
            <ul className="list-clean" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
              {repAppointments.length === 0 && <li>No representative requests yet.</li>}
              {repAppointments.map((r) => {
                const approved = r.status === "approved_owner" || r.status === "approved";
                return (
                  <li key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "#f8fafc" }}>
                    <div style={{ fontWeight: 600 }}>{r.meta.propertyTitle || "-"}</div>
                    <div>
                      {r.meta.session || "-"} • {r.meta.language || "-"}
                      {r.meta.representativeName ? ` • ${r.meta.representativeName}` : ""}
                    </div>
                    <div>Status: {r.status.toUpperCase()}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      {repId && (
                        <button className="btn btn-ghost" type="button" onClick={() => messageTarget(repId, true)}>
                          Chat
                        </button>
                      )}
                      <button className="btn btn-primary" type="button" disabled={!approved} onClick={() => setView("tours")}>
                        {approved ? "Open video at scheduled time" : "Waiting for approval"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Representative appointments</h3>
            <ul className="list-clean" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
              {appointmentList.filter((a) => a.type.includes("Representative")).length === 0 && <li>No representative appointments yet.</li>}
              {appointmentList.filter((a) => a.type.includes("Representative")).map((a, idx) => (
                <li key={`rapp-${idx}`} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "#f8fafc" }}>
                  {a.type}: {a.time} {a.status && a.status !== "approved" ? `(status: ${a.status})` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {view === "messages" && (
        <div className="card" style={{ marginTop: 10 }}>
          <h3 style={{ marginTop: 0 }}>Conversations</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {consultantId && (
              <button className="btn btn-secondary" onClick={() => messageTarget(consultantId)}>
                <div style={{ display: "grid", lineHeight: 1.2 }}>
                  <span>Message consultant</span>
                  <small style={{ color: "var(--muted)", fontWeight: 500 }}>{consultantName}</small>
                </div>
              </button>
            )}
            {repId && (
              <button className="btn btn-secondary" onClick={() => messageTarget(repId)}>
                Message representative{representativeName ? ` (${representativeName})` : ""}
              </button>
            )}
          </div>
          <ul className="list-clean" style={{ display: "grid", gap: 8 }}>
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  className={`btn ${selectedConversationId === c.id ? "btn-primary" : "btn-ghost"}`}
                  style={{ width: "100%" }}
                  onClick={() => setSelectedConversationId(c.id)}
                >
                  {conversationLabel(c)}
                </button>
              </li>
            ))}
            {conversations.length === 0 && <li style={{ color: "var(--muted)" }}>No conversations yet.</li>}
          </ul>
          <div style={{ marginTop: 8 }} ref={chatBoxRef}>
            <ChatWindow conversationId={selectedConversationId} />
          </div>
        </div>
      )}
      <PaymentModal
        open={payment.open}
        onClose={handlePaymentClose}
        item={payment.item}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
}
