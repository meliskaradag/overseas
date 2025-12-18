const { v4: uuid } = require("uuid");
const cityCoords = {
  Berlin: { lat: 52.52, lng: 13.405 },
  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  London: { lat: 51.5074, lng: -0.1278 },
  Paris: { lat: 48.8566, lng: 2.3522 },
  Madrid: { lat: 40.4168, lng: -3.7038 },
  Lisbon: { lat: 38.7223, lng: -9.1393 },
  Prague: { lat: 50.0755, lng: 14.4378 },
  Vienna: { lat: 48.2082, lng: 16.3738 }
};

// Roles: student, consultant, representative, owner
const users = [
  { id: "u1", name: "Berna Cetinkaya", email: "berna@student.com", password: "123456", role: "student" },
  { id: "u2", name: "Jordan Lee", email: "jordan@consultant.com", password: "123456", role: "consultant" },
  { id: "u5", name: "Taylor Brooks", email: "taylor@consultant.com", password: "123456", role: "consultant" },
  { id: "u6", name: "Casey Morgan", email: "casey@consultant.com", password: "123456", role: "consultant" },
  { id: "u3", name: "Alice Cooper", email: "alice@rep.com", password: "123456", role: "representative" },
  { id: "u4", name: "Anna Bauer", email: "anna@owner.com", password: "123456", role: "owner" },
  { id: "u7", name: "Michael Roth", email: "michael@owner.com", password: "123456", role: "owner" },
  { id: "u8", name: "Sofia Marino", email: "sofia@owner.com", password: "123456", role: "owner" },
  { id: "u9", name: "Lucas Weber", email: "lucas@owner.com", password: "123456", role: "owner" }
];

const imagePool = [
  "https://images.unsplash.com/photo-1484154218962-a197022b5858", // cozy bedroom
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511", // sunny living area
  "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e", // bright kitchen
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85", // kitchen + lounge
  "https://images.unsplash.com/photo-1505691723518-36a5ac3be353", // airy bedroom
  "https://images.unsplash.com/photo-1481277542470-605612bd2d61", // calm bedroom
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267", // modern dorm/apt
  "https://images.unsplash.com/photo-1497366216548-37526070297c"  // cozy common area
];

const buildUrl = (base, sig) => `${base}?auto=format&fit=crop&w=1000&q=80&sig=${sig}`;
const pickImages = (seed) => [
  buildUrl(imagePool[seed % imagePool.length], seed),
  buildUrl(imagePool[(seed + 1) % imagePool.length], seed + 1),
  buildUrl(imagePool[(seed + 2) % imagePool.length], seed + 2)
];

const baseProperties = [
  {
    id: "p1",
    title: "Shared Student Apartment in Berlin",
    city: "Berlin",
    country: "Germany",
    price: 650,
    lat: cityCoords.Berlin.lat,
    lng: cityCoords.Berlin.lng,
    type: "shared_room",
    description: "5 min to U-Bahn, 15 min to campus. Quiet and safe neighborhood.",
    images: pickImages(1),
    ownerId: "u7",
    ownerName: "Michael Roth",
    ownerEmail: "michael@owner.com",
    quality: {
      noise: "low",
      safety: "high",
      transport: "close",
      smell: "neutral",
      neighbors: "students",
      marketDistance: "close",
      transitDistance: "close",
      social: "good"
    },
    features: { elevator: true, wifi: true, washer: true },
    hasRepresentative: true
  },
  {
    id: "p2",
    title: "Amsterdam Studio",
    city: "Amsterdam",
    country: "Netherlands",
    price: 1100,
    lat: cityCoords.Amsterdam.lat,
    lng: cityCoords.Amsterdam.lng,
    type: "studio",
    description: "Compact studio by the canal. Quiet, views, and focus-friendly.",
    images: pickImages(4),
    ownerId: "u8",
    ownerName: "Sofia Marino",
    ownerEmail: "sofia@owner.com",
    quality: {
      noise: "medium",
      safety: "high",
      transport: "medium",
      smell: "fresh",
      neighbors: "mixed",
      marketDistance: "medium",
      transitDistance: "medium",
      social: "vibrant"
    },
    features: { elevator: false, wifi: true, washer: true },
    hasRepresentative: false
  },
  {
    id: "p3",
    title: "London Kings Cross 1BR",
    city: "London",
    country: "United Kingdom",
    price: 1450,
    lat: cityCoords.London.lat,
    lng: cityCoords.London.lng,
    type: "entire_place",
    description: "Bright 1BR near Kings Cross. 8 min walk to tube, secure building.",
    images: pickImages(7),
    ownerId: "u9",
    ownerName: "Lucas Weber",
    ownerEmail: "lucas@owner.com",
    quality: {
      noise: "medium",
      safety: "high",
      transport: "close",
      smell: "neutral",
      neighbors: "professionals",
      marketDistance: "close",
      transitDistance: "close",
      social: "good"
    },
    features: { elevator: true, wifi: true, washer: true },
    hasRepresentative: true
  },
  {
    id: "p4",
    title: "Paris Latin Quarter Loft",
    city: "Paris",
    country: "France",
    price: 1300,
    lat: cityCoords.Paris.lat,
    lng: cityCoords.Paris.lng,
    type: "loft",
    description: "Stylish loft near universities, cafes around the corner.",
    images: pickImages(10),
    ownerId: "u4",
    ownerName: "Anna Bauer",
    ownerEmail: "anna@owner.com",
    quality: {
      noise: "medium",
      safety: "medium",
      transport: "medium",
      smell: "neutral",
      neighbors: "mixed",
      marketDistance: "close",
      transitDistance: "medium",
      social: "vibrant"
    },
    features: { elevator: false, wifi: true, washer: false },
    hasRepresentative: true
  }
];

const cityCountryMap = {
  Berlin: "Germany",
  Amsterdam: "Netherlands",
  London: "United Kingdom",
  Paris: "France",
  Madrid: "Spain",
  Lisbon: "Portugal",
  Prague: "Czech Republic",
  Vienna: "Austria"
};

const generated = Array.from({ length: 55 }).map((_, idx) => {
  const i = idx + 6;
  const cities = ["Berlin", "Amsterdam", "London", "Paris", "Madrid", "Lisbon", "Prague", "Vienna"];
  const types = ["studio", "shared_room", "entire_place", "loft", "co_living"];
  const city = cities[idx % cities.length];
  const type = types[idx % types.length];
  const baseSig = 20 + idx * 3;
  const owners = [
    { id: "u4", name: "Anna Bauer", email: "anna@owner.com" },
    { id: "u7", name: "Michael Roth", email: "michael@owner.com" },
    { id: "u8", name: "Sofia Marino", email: "sofia@owner.com" },
    { id: "u9", name: "Lucas Weber", email: "lucas@owner.com" }
  ];
  const owner = owners[idx % owners.length];
  return {
    id: `p${i}`,
    title: `${city} ${type} option #${i}`,
    city,
    country: cityCountryMap[city] || city,
    price: 600 + (idx % 12) * 50,
    type,
    lat: cityCoords[city]?.lat,
    lng: cityCoords[city]?.lng,
    description: `Mock listing ${i} in ${city} with ${type} layout for testing.`,
    images: pickImages(baseSig),
    ownerId: owner.id,
    ownerName: owner.name,
    ownerEmail: owner.email,
    quality: {
      noise: idx % 2 === 0 ? "low" : "medium",
      safety: "high",
      transport: idx % 3 === 0 ? "close" : "medium",
      smell: "neutral",
      neighbors: idx % 2 === 0 ? "students" : "mixed",
      marketDistance: idx % 3 === 0 ? "close" : "medium",
      transitDistance: idx % 3 === 0 ? "close" : "medium",
      social: idx % 2 === 0 ? "good" : "vibrant"
    },
    features: { elevator: idx % 2 === 0, wifi: true, washer: idx % 3 !== 0 },
    hasRepresentative: idx % 2 === 0
  };
});

const properties = [...baseProperties, ...generated];

const conversations = [
  { id: "c1", participants: ["u1", "u2"] }
];

const messages = [
  {
    id: uuid(),
    conversationId: "c1",
    senderId: "u2",
    text: "Hi Berna, I got your criteria. I found several homes for you.",
    createdAt: new Date().toISOString()
  }
];

module.exports = { users, properties, conversations, messages, cityCountryMap };
