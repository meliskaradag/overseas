import { useEffect, useState } from "react";
import api from "../api";

export default function PropertyList({ filters, onSelect, selectedId, listRef }) {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const params = {};
        if (filters.city) params.city = filters.city;
        if (filters.country) params.country = filters.country;
        if (filters.noiseTolerance) params.noise = filters.noiseTolerance;
        if (filters.safetyImportance) params.safety = filters.safetyImportance;
        if (filters.transportImportance) params.transit = filters.transportImportance;
        if (filters.neighborsPreference) params.neighbors = filters.neighborsPreference;
        if (filters.marketDistancePreference) params.market = filters.marketDistancePreference;
        if (filters.transitDistancePreference) params.transitDistance = filters.transitDistancePreference;
        if (filters.socialPreference) params.social = filters.socialPreference;
        if (filters.elevatorNeeded) params.elevator = true;
        if (filters.wifiNeeded) params.wifi = true;
        if (filters.washerNeeded) params.washer = true;
        const res = await api.get("/properties", { params });
        setProperties(res.data);
      } catch (err) {
        console.error("Failed to load properties", err);
      }
    };
    load();
  }, [filters]);

  return (
    <div className="card" ref={listRef}>
      <div className="section-title">
        <h3 style={{ margin: 0 }}>Recommended properties</h3>
        <span className="badge">{properties.length} matches</span>
      </div>
      {properties.length === 0 && <p>No homes to show yet.</p>}
      <div className="grid-three">
        {properties.map((p) => (
          <div
            key={p.id}
            className="property-card"
            style={
              selectedId === p.id
                ? { borderColor: "rgba(13, 148, 136, 0.4)", background: "#f0fbf9" }
                : {}
            }
            onClick={() => onSelect(p)}
          >
            <h4 style={{ marginTop: 0, marginBottom: 6 }}>{p.title}</h4>
            <p style={{ margin: "4px 0", color: "var(--muted)" }}>
              {p.city}, {p.country}
            </p>
            <p style={{ margin: "4px 0", fontWeight: 700 }}>EUR {p.price}</p>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Representative: {p.hasRepresentative ? "Available for live tour" : "Not available"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
