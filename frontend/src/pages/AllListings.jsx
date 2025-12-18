import { useState, useEffect, useRef } from "react";
import api from "../api";
import PropertyDetail from "../components/PropertyDetail";

export default function AllListings() {
  const [properties, setProperties] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sortOption, setSortOption] = useState("none");
  const [filters, setFilters] = useState({ city: "", country: "", minPrice: "", maxPrice: "" });
  const listRef = useRef(null);

  const loadProperties = async (params = {}) => {
    const res = await api.get("/properties", { params });
    setProperties(res.data);
    if (res.data[0]) setSelected(res.data[0]);
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const sortedProperties = [...properties].sort((a, b) => {
    if (sortOption === "priceAsc") return a.price - b.price;
    if (sortOption === "priceDesc") return b.price - a.price;
    return 0;
  });

  const scrollToListTop = () => {
    if (listRef.current) {
      const top = listRef.current.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleSelect = (p) => {
    setSelected(p);
    scrollToListTop();
  };

  const handleClose = () => {
    setSelected(null);
    scrollToListTop();
  };

  return (
    <div className="main-content">
      <button className="btn btn-ghost" onClick={() => window.history.back()} style={{ marginBottom: 10 }}>Back</button>
      <div className="card" style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>All listings</h1>
        <p style={{ color: "var(--muted)" }}>Browse every mock listing, including the pinned best-offer item.</p>
      </div>
      <div className="grid-two" style={{ alignItems: "start", gap: 16 }}>
        <div className="card" ref={listRef}>
          <div className="section-title">
            <h3 style={{ margin: 0 }}>Listings ({properties.length})</h3>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>Sort by</span>
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                <option value="none">Default</option>
                <option value="priceAsc">Price (low to high)</option>
                <option value="priceDesc">Price (high to low)</option>
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 12 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: "var(--muted)" }}>
              City
              <input
                type="text"
                value={filters.city}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                placeholder="e.g. Paris"
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: "var(--muted)" }}>
              Country
              <input
                type="text"
                value={filters.country}
                onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
                placeholder="e.g. France"
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: "var(--muted)" }}>
              Min price
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
                placeholder="EUR"
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13, color: "var(--muted)" }}>
              Max price
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
                placeholder="EUR"
              />
            </label>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => loadProperties({
                  city: filters.city || undefined,
                  country: filters.country || undefined,
                  minPrice: filters.minPrice || undefined,
                  maxPrice: filters.maxPrice || undefined
                })}
              >
                Apply filters
              </button>
            </div>
          </div>
          <div className="grid-three" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {sortedProperties.map((p) => (
              <div
                key={p.id}
                className="property-card"
                style={
                  selected?.id === p.id
                    ? { borderColor: "rgba(13, 148, 136, 0.4)", background: "#f0fbf9" }
                    : {}
                }
                onClick={() => handleSelect(p)}
              >
                <h4 style={{ marginTop: 0, marginBottom: 6 }}>{p.title}</h4>
                <p style={{ margin: "4px 0", color: "var(--muted)" }}>
                  {p.city}, {p.country}
                </p>
                <p style={{ margin: "4px 0", fontWeight: 700 }}>EUR {p.price}</p>
                {p.bestOffer && <span className="badge">Best offer</span>}
              </div>
            ))}
          </div>
        </div>
        <div>
          <PropertyDetail
            property={selected}
            repRequests={[]}
            repSlotsRemaining={99}
            onRepresentativeRequest={() => ({ ok: true })}
            onRepresentativeTerminate={() => {}}
            onMessageOwner={() => {}}
            onMessageRepresentative={() => {}}
            onClose={handleClose}
          />
        </div>
      </div>
    </div>
  );
}
