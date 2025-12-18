const path = require("path");
const Database = require("better-sqlite3");
const { v4: uuid } = require("uuid");
const bcrypt = require("bcryptjs");
const {
  users: seedUsers,
  properties: seedProperties,
  conversations: seedConversations,
  messages: seedMessages,
  cityCountryMap
} = require("./mockData");

const dbPath = path.join(__dirname, "..", "data.sqlite");
const db = new Database(dbPath);

// Slightly safer defaults for local dev
db.pragma("journal_mode = WAL");

const SALT_ROUNDS = 10;

const parseJSON = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (err) {
    return fallback;
  }
};

const boolFromDb = (val) => Boolean(Number(val));

const normalizePropertyCountries = () => {
  const rows = db
    .prepare(
      "SELECT id, city, country FROM properties WHERE country IS NULL OR TRIM(country) = '' OR LOWER(country) = 'eu'"
    )
    .all();
  if (!rows.length) return;
  const update = db.prepare("UPDATE properties SET country=@country WHERE id=@id");
  rows.forEach((row) => {
    const normalized = (cityCountryMap && cityCountryMap[row.city]) || row.city || row.country || "Unknown";
    update.run({ id: row.id, country: normalized });
  });
};

const hashPasswordIfNeeded = (password) => {
  if (!password) return password;
  if (password.startsWith("$2")) return password; // already hashed
  return bcrypt.hashSync(password, SALT_ROUNDS);
};

const rowToUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  password: row.password,
  role: row.role
});

const rowToProperty = (row) => ({
  id: row.id,
  title: row.title,
  city: row.city,
  country: row.country,
  price: row.price,
  lat: row.lat,
  lng: row.lng,
  type: row.type,
  description: row.description,
  images: parseJSON(row.images, []),
  ownerId: row.ownerId,
  ownerName: row.ownerName,
  ownerEmail: row.ownerEmail,
  quality: parseJSON(row.quality, {}),
  features: parseJSON(row.features, {}),
  hasRepresentative: boolFromDb(row.hasRepresentative),
  bestOffer: boolFromDb(row.bestOffer)
});

const ensurePropertyColumns = () => {
  const columns = db.prepare("PRAGMA table_info(properties)").all().map((c) => c.name);
  if (!columns.includes("lat")) {
    db.prepare("ALTER TABLE properties ADD COLUMN lat REAL").run();
  }
  if (!columns.includes("lng")) {
    db.prepare("ALTER TABLE properties ADD COLUMN lng REAL").run();
  }
};

const rowToConversation = (row) => ({
  id: row.id,
  participants: parseJSON(row.participants, [])
});

const rowToMessage = (row) => ({
  id: row.id,
  conversationId: row.conversationId,
  senderId: row.senderId,
  text: row.text,
  createdAt: row.createdAt
});

const rowToDocument = (row) => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  url: row.url,
  uploadedAt: row.uploadedAt
});

const rowToAppointment = (row) => ({
  id: row.id,
  type: row.type,
  time: row.time,
  status: row.status,
  participantIds: parseJSON(row.participants, []),
  note: row.note,
  createdBy: row.createdBy,
  createdAt: row.createdAt
});

const rowToPreference = (row) => ({
  userId: row.userId,
  data: parseJSON(row.data, {}),
  updatedAt: row.updatedAt
});

const rowToRating = (row) => ({
  userId: row.userId,
  consultant: row.consultant,
  representative: row.representative,
  updatedAt: row.updatedAt
});

const init = () => {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      title TEXT,
      city TEXT,
      country TEXT,
      price INTEGER,
      lat REAL,
      lng REAL,
      type TEXT,
      description TEXT,
      images TEXT,
      ownerId TEXT,
      ownerName TEXT,
      ownerEmail TEXT,
      quality TEXT,
      features TEXT,
      hasRepresentative INTEGER,
      bestOffer INTEGER
    )
  `).run();
  ensurePropertyColumns();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      participants TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT,
      senderId TEXT,
      text TEXT,
      createdAt TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT,
      url TEXT,
      uploadedAt TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      type TEXT,
      time TEXT,
      status TEXT,
      participants TEXT,
      note TEXT,
      createdBy TEXT,
      createdAt TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS preferences (
      userId TEXT PRIMARY KEY,
      data TEXT,
      updatedAt TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS ratings (
      userId TEXT PRIMARY KEY,
      consultant INTEGER,
      representative INTEGER,
      updatedAt TEXT
    )
  `).run();

  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (userCount === 0) {
    const insert = db.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (@id, @name, @email, @password, @role)
    `);
    seedUsers.forEach((u) =>
      insert.run({
        ...u,
        password: hashPasswordIfNeeded(u.password)
      })
    );
  } else {
    // Migrate existing plain-text passwords to hashed
    const users = db.prepare("SELECT * FROM users").all();
    const updatePw = db.prepare("UPDATE users SET password = @password WHERE id = @id");
    users.forEach((u) => {
      if (!u.password?.startsWith("$2")) {
        updatePw.run({ id: u.id, password: hashPasswordIfNeeded(u.password) });
      }
    });
  }

  const propertyCount = db.prepare("SELECT COUNT(*) as count FROM properties").get().count;
  if (propertyCount === 0) {
    const insert = db.prepare(`
      INSERT INTO properties (
        id, title, city, country, price, lat, lng, type, description, images,
        ownerId, ownerName, ownerEmail, quality, features, hasRepresentative, bestOffer
      )
      VALUES (
        @id, @title, @city, @country, @price, @lat, @lng, @type, @description, @images,
        @ownerId, @ownerName, @ownerEmail, @quality, @features, @hasRepresentative, @bestOffer
      )
    `);

    seedProperties.forEach((p) =>
      insert.run({
        ...p,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        images: JSON.stringify(p.images || []),
        quality: JSON.stringify(p.quality || {}),
        features: JSON.stringify(p.features || {}),
        hasRepresentative: p.hasRepresentative ? 1 : 0,
        bestOffer: p.bestOffer ? 1 : 0
      })
    );
  } else {
    const updateLatLng = db.prepare(`
      UPDATE properties SET lat=@lat, lng=@lng WHERE id=@id AND (lat IS NULL OR lng IS NULL)
    `);
    seedProperties.forEach((p) =>
      updateLatLng.run({
        id: p.id,
        lat: p.lat ?? null,
        lng: p.lng ?? null
      })
    );
  }
  normalizePropertyCountries();

  const conversationCount = db.prepare("SELECT COUNT(*) as count FROM conversations").get().count;
  if (conversationCount === 0) {
    const insert = db.prepare(`INSERT INTO conversations (id, participants) VALUES (@id, @participants)`);
    seedConversations.forEach((c) =>
      insert.run({
        id: c.id,
        participants: JSON.stringify(c.participants || [])
      })
    );
  }

  const messageCount = db.prepare("SELECT COUNT(*) as count FROM messages").get().count;
  if (messageCount === 0) {
    const insert = db.prepare(`
      INSERT INTO messages (id, conversationId, senderId, text, createdAt)
      VALUES (@id, @conversationId, @senderId, @text, @createdAt)
    `);
    seedMessages.forEach((m) => insert.run(m));
  }

  // Appointments are empty by default; no seed
};

init();

// User helpers
const getUserByEmail = (email) =>
  db.prepare("SELECT * FROM users WHERE email = ?").get(email);

const getUserForLogin = (email, password, role) =>
  db.prepare("SELECT * FROM users WHERE email = ? AND password = ? AND role = ?").get(email, password, role);

const createUser = ({ name, email, password, role }) => {
  const count = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  const newUser = {
    id: "u" + (count + 1),
    name,
    email,
    password: hashPasswordIfNeeded(password),
    role
  };
  db.prepare(`
    INSERT INTO users (id, name, email, password, role)
    VALUES (@id, @name, @email, @password, @role)
  `).run(newUser);
  return newUser;
};

const listUsersByRole = (role) =>
  db.prepare("SELECT * FROM users WHERE role = ?").all(role).map(rowToUser);

const getUserByEmailAndRole = (email, role) =>
  db.prepare("SELECT * FROM users WHERE email = ? AND role = ?").get(email, role);

// Property helpers
const listProperties = (filters = {}) => {
  const rows = db.prepare("SELECT * FROM properties").all();
  const allProps = rows.map(rowToProperty);

  const {
    city,
    country,
    minPrice,
    maxPrice,
    ownerId,
    noise,
    safety,
    transit,
    neighbors,
    market,
    transitDistance,
    social,
    elevator,
    wifi,
    washer
  } = filters;

  const featured = allProps.filter((p) => p.bestOffer);
  let result = allProps.filter((p) => !p.bestOffer);

  if (city) {
    result = result.filter((p) => p.city.toLowerCase() === city.toLowerCase());
  }
  if (country) {
    result = result.filter((p) => p.country.toLowerCase() === country.toLowerCase());
  }
  if (ownerId) {
    result = result.filter((p) => p.ownerId === ownerId);
  }
  if (minPrice) {
    result = result.filter((p) => p.price >= Number(minPrice));
  }
  if (maxPrice) {
    result = result.filter((p) => p.price <= Number(maxPrice));
  }
  if (noise) {
    result = result.filter((p) => p.quality?.noise === noise);
  }
  if (safety) {
    result = result.filter((p) => p.quality?.safety === safety);
  }
  if (transit) {
    result = result.filter(
      (p) => p.quality?.transport === transit || p.quality?.transitDistance === transit
    );
  }
  if (neighbors) {
    result = result.filter((p) => p.quality?.neighbors === neighbors);
  }
  if (market) {
    result = result.filter((p) => p.quality?.marketDistance === market);
  }
  if (transitDistance) {
    result = result.filter((p) => p.quality?.transitDistance === transitDistance);
  }
  if (social) {
    result = result.filter((p) => p.quality?.social === social);
  }
  if (typeof elevator !== "undefined") {
    const val = String(elevator) === "true";
    result = result.filter((p) => Boolean(p.features?.elevator) === val);
  }
  if (typeof wifi !== "undefined") {
    const val = String(wifi) === "true";
    result = result.filter((p) => Boolean(p.features?.wifi) === val);
  }
  if (typeof washer !== "undefined") {
    const val = String(washer) === "true";
    result = result.filter((p) => Boolean(p.features?.washer) === val);
  }

  // Preserve best-offers at the top, avoid duplicates
  const combined = [
    ...featured,
    ...result.filter((p) => !featured.find((f) => f.id === p.id))
  ];

  return combined;
};

const getPropertyById = (id) => {
  const row = db.prepare("SELECT * FROM properties WHERE id = ?").get(id);
  return row ? rowToProperty(row) : null;
};

const createProperty = (data) => {
  const id = uuid();
  const insert = db.prepare(`
    INSERT INTO properties (
      id, title, city, country, price, lat, lng, type, description, images,
      ownerId, ownerName, ownerEmail, quality, features, hasRepresentative, bestOffer
    )
    VALUES (
      @id, @title, @city, @country, @price, @lat, @lng, @type, @description, @images,
      @ownerId, @ownerName, @ownerEmail, @quality, @features, @hasRepresentative, @bestOffer
    )
  `);

  const payload = {
    id,
    title: data.title,
    city: data.city,
    country: data.country,
    price: Number(data.price) || 0,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    type: data.type || "entire_place",
    description: data.description || "",
    images: JSON.stringify(data.images || []),
    ownerId: data.ownerId,
    ownerName: data.ownerName || "",
    ownerEmail: data.ownerEmail || "",
    quality: JSON.stringify(data.quality || {}),
    features: JSON.stringify(data.features || {}),
    hasRepresentative: data.hasRepresentative ? 1 : 0,
    bestOffer: data.bestOffer ? 1 : 0
  };

  insert.run(payload);
  return getPropertyById(id);
};

// Conversations
const listConversationsForUser = (userId) =>
  db
    .prepare("SELECT * FROM conversations")
    .all()
    .map(rowToConversation)
    .filter((c) => c.participants.includes(userId));

const getConversationById = (conversationId) => {
  const row = db.prepare("SELECT * FROM conversations WHERE id = ?").get(conversationId);
  return row ? rowToConversation(row) : null;
};

const listMessagesForConversation = (conversationId) =>
  db
    .prepare("SELECT * FROM messages WHERE conversationId = ?")
    .all(conversationId)
    .map(rowToMessage);

const createMessage = (conversationId, senderId, text) => {
  const msg = {
    id: uuid(),
    conversationId,
    senderId,
    text,
    createdAt: new Date().toISOString()
  };
  db.prepare(`
    INSERT INTO messages (id, conversationId, senderId, text, createdAt)
    VALUES (@id, @conversationId, @senderId, @text, @createdAt)
  `).run(msg);
  return msg;
};

const createConversation = (participantIds) => {
  const count = db.prepare("SELECT COUNT(*) as count FROM conversations").get().count;
  const conv = {
    id: "c" + (count + 1),
    participants: participantIds
  };
  db.prepare(`
    INSERT INTO conversations (id, participants)
    VALUES (@id, @participants)
  `).run({ id: conv.id, participants: JSON.stringify(conv.participants) });
  return conv;
};

// Documents
const listDocumentsForUser = (userId) =>
  db.prepare("SELECT * FROM documents WHERE userId = ? ORDER BY uploadedAt DESC").all(userId).map(rowToDocument);

const createDocument = ({ userId, name, url }) => {
  const doc = {
    id: uuid(),
    userId,
    name,
    url,
    uploadedAt: new Date().toISOString()
  };
  db.prepare(`
    INSERT INTO documents (id, userId, name, url, uploadedAt)
    VALUES (@id, @userId, @name, @url, @uploadedAt)
  `).run(doc);
  return doc;
};

// Appointments
const listAppointmentsForUser = (userId) =>
  db
    .prepare("SELECT * FROM appointments")
    .all()
    .map(rowToAppointment)
    .filter((a) => a.participantIds.includes(userId));

const createAppointment = ({ type, time, participantIds, note, createdBy }) => {
  const app = {
    id: uuid(),
    type,
    time,
    status: "pending",
    participants: JSON.stringify(participantIds || []),
    note: note || "",
    createdBy,
    createdAt: new Date().toISOString()
  };
  db.prepare(`
    INSERT INTO appointments (id, type, time, status, participants, note, createdBy, createdAt)
    VALUES (@id, @type, @time, @status, @participants, @note, @createdBy, @createdAt)
  `).run(app);
  return rowToAppointment(app);
};

const updateAppointmentStatus = (id, status, userId) => {
  const app = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  if (!app) return null;
  const parsed = rowToAppointment(app);
  if (!parsed.participantIds.includes(userId) && parsed.createdBy !== userId) {
    return null;
  }
  db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
  return { ...parsed, status };
};

// Preferences
const getPreferences = (userId) => {
  const row = db.prepare("SELECT * FROM preferences WHERE userId = ?").get(userId);
  return row ? rowToPreference(row) : null;
};

const savePreferences = (userId, data) => {
  const existing = getPreferences(userId);
  const payload = {
    userId,
    data: JSON.stringify(data || {}),
    updatedAt: new Date().toISOString()
  };
  if (existing) {
    db.prepare("UPDATE preferences SET data=@data, updatedAt=@updatedAt WHERE userId=@userId").run(payload);
  } else {
    db.prepare("INSERT INTO preferences (userId, data, updatedAt) VALUES (@userId, @data, @updatedAt)").run(payload);
  }
  return getPreferences(userId);
};

const deletePreferences = (userId) => {
  db.prepare("DELETE FROM preferences WHERE userId = ?").run(userId);
};

// Ratings
const getRatings = (userId) => {
  const row = db.prepare("SELECT * FROM ratings WHERE userId = ?").get(userId);
  return row ? rowToRating(row) : { userId, consultant: null, representative: null, updatedAt: null };
};

const saveRatings = (userId, ratings) => {
  const payload = {
    userId,
    consultant: ratings.consultant ?? null,
    representative: ratings.representative ?? null,
    updatedAt: new Date().toISOString()
  };
  const existing = db.prepare("SELECT 1 FROM ratings WHERE userId = ?").get(userId);
  if (existing) {
    db.prepare("UPDATE ratings SET consultant=@consultant, representative=@representative, updatedAt=@updatedAt WHERE userId=@userId").run(payload);
  } else {
    db.prepare("INSERT INTO ratings (userId, consultant, representative, updatedAt) VALUES (@userId, @consultant, @representative, @updatedAt)").run(payload);
  }
  return getRatings(userId);
};

module.exports = {
  db,
  getUserForLogin,
  getUserByEmail,
  getUserByEmailAndRole,
  createUser,
  listUsersByRole,
  listProperties,
  getPropertyById,
  createProperty,
  listConversationsForUser,
  getConversationById,
  listMessagesForConversation,
  createMessage,
  createConversation,
  listDocumentsForUser,
  createDocument,
  listAppointmentsForUser,
  createAppointment,
  updateAppointmentStatus,
  getPreferences,
  savePreferences,
  deletePreferences,
  getRatings,
  saveRatings
};
