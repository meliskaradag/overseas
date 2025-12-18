import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Default marker icons fix for bundlers
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function PropertyMap({ property }) {
  if (!property?.lat || !property?.lng) {
    return (
      <div style={{ padding: 10, background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 10 }}>
        Location not available for this listing.
      </div>
    );
  }

  const center = [property.lat, property.lng];

  return (
    <MapContainer
      key={property.id}
      center={center}
      zoom={13}
      style={{ height: 280, width: "100%", borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center} icon={markerIcon}>
        <Popup>
          <strong>{property.title}</strong>
          <div>
            {property.city}, {property.country}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
