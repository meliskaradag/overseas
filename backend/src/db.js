const { Pool } = require("pg");
const { v4: uuid } = require("uuid");
const bcrypt = require("bcryptjs");
const {
  users: seedUsers,
  properties: seedProperties,
  conversations: seedConversations,
  messages: seedMessages,
  cityCountryMap
} = require("./mockData");

// Use DATABASE_URL from environment (Render sets this automatically)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

const SALT_ROUNDS = 10;

const parseJSON = (value, fallback) => {
  try {
    return value ? (typeof value === "string" ? JSON.parse(value) : value) : fallback;
  } catch (err) {
    return fallback;
  }
};

const hashPasswordIfNeeded = (password) => {
  if (!password) return password;
  if (password.startsWith("$2")) return password;
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
  ownerId: row.owner_id,
  ownerName: row.owner_name,
  ownerEmail: row.owner_email,
  quality: parseJSON(row.quality, {}),
  features: parseJSON(row.features, {}),
  hasRepresentative: row.has_representative,
  bestOffer: row.best_offer
});

const rowToConversation = (row) => ({
  id: row.id,
  participants: parseJSON(row.participants, [])
});

const rowToMessage = (row) => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  text: row.text,
  createdAt: row.created_at
});

const rowToDocument = (row) => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  url: row.url,
  uploadedAt: row.uploaded_at
});

const rowToAppointment = (row) => ({
  id: row.id,
  type: row.type,
  time: row.time,
  status: row.status,
  participantIds: parseJSON(row.participants, []),
  note: row.note,
  createdBy: row.created_by,
  createdAt: row.created_at
});

const rowToPreference = (row) => ({
  userId: row.user_id,
  data: parseJSON(row.data, {}),
  updatedAt: row.updated_at
});

const rowToRating = (row) => ({
  userId: row.user_id,
  consultant: row.consultant,
  representative: row.representative,
  updatedAt: row.updated_at
});

// Initialize database tables and seed data
const init = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL
      )
    `);

    await client.query(`
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
        images JSONB,
        owner_id TEXT,
        owner_name TEXT,
        owner_email TEXT,
        quality JSONB,
        features JSONB,
        has_representative BOOLEAN,
        best_offer BOOLEAN
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        participants JSONB
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        sender_id TEXT,
        text TEXT,
        created_at TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT,
        url TEXT,
        uploaded_at TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        type TEXT,
        time TEXT,
        status TEXT,
        participants JSONB,
        note TEXT,
        created_by TEXT,
        created_at TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS preferences (
        user_id TEXT PRIMARY KEY,
        data JSONB,
        updated_at TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        user_id TEXT PRIMARY KEY,
        consultant INTEGER,
        representative INTEGER,
        updated_at TEXT
      )
    `);

    // Seed users if empty
    const userCount = await client.query("SELECT COUNT(*) as count FROM users");
    if (parseInt(userCount.rows[0].count) === 0) {
      for (const u of seedUsers) {
        await client.query(
          `INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)`,
          [u.id, u.name, u.email, hashPasswordIfNeeded(u.password), u.role]
        );
      }
    }

    // Seed properties if empty
    const propCount = await client.query("SELECT COUNT(*) as count FROM properties");
    if (parseInt(propCount.rows[0].count) === 0) {
      for (const p of seedProperties) {
        await client.query(
          `INSERT INTO properties (id, title, city, country, price, lat, lng, type, description, images, owner_id, owner_name, owner_email, quality, features, has_representative, best_offer)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            p.id, p.title, p.city, p.country, p.price, p.lat ?? null, p.lng ?? null,
            p.type, p.description, JSON.stringify(p.images || []),
            p.ownerId, p.ownerName, p.ownerEmail,
            JSON.stringify(p.quality || {}), JSON.stringify(p.features || {}),
            p.hasRepresentative || false, p.bestOffer || false
          ]
        );
      }
    }

    // Seed conversations if empty
    const convCount = await client.query("SELECT COUNT(*) as count FROM conversations");
    if (parseInt(convCount.rows[0].count) === 0) {
      for (const c of seedConversations) {
        await client.query(
          `INSERT INTO conversations (id, participants) VALUES ($1, $2)`,
          [c.id, JSON.stringify(c.participants || [])]
        );
      }
    }

    // Seed messages if empty
    const msgCount = await client.query("SELECT COUNT(*) as count FROM messages");
    if (parseInt(msgCount.rows[0].count) === 0) {
      for (const m of seedMessages) {
        await client.query(
          `INSERT INTO messages (id, conversation_id, sender_id, text, created_at) VALUES ($1, $2, $3, $4, $5)`,
          [m.id, m.conversationId, m.senderId, m.text, m.createdAt]
        );
      }
    }

    console.log("[db] PostgreSQL initialized successfully");
  } finally {
    client.release();
  }
};

// User helpers
const getUserByEmail = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] || null;
};

const createUser = async ({ name, email, password, role }) => {
  const countResult = await pool.query("SELECT COUNT(*) as count FROM users");
  const count = parseInt(countResult.rows[0].count);
  const newUser = {
    id: "u" + (count + 1),
    name,
    email,
    password: hashPasswordIfNeeded(password),
    role
  };
  await pool.query(
    `INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)`,
    [newUser.id, newUser.name, newUser.email, newUser.password, newUser.role]
  );
  return newUser;
};

const listUsersByRole = async (role) => {
  const result = await pool.query("SELECT * FROM users WHERE role = $1", [role]);
  return result.rows.map(rowToUser);
};

// Property helpers
const listProperties = async (filters = {}) => {
  const result = await pool.query("SELECT * FROM properties");
  const allProps = result.rows.map(rowToProperty);

  const {
    city, country, minPrice, maxPrice, ownerId,
    noise, safety, transit, neighbors, market,
    transitDistance, social, elevator, wifi, washer
  } = filters;

  const featured = allProps.filter((p) => p.bestOffer);
  let filtered = allProps.filter((p) => !p.bestOffer);

  if (city) filtered = filtered.filter((p) => p.city.toLowerCase() === city.toLowerCase());
  if (country) filtered = filtered.filter((p) => p.country.toLowerCase() === country.toLowerCase());
  if (ownerId) filtered = filtered.filter((p) => p.ownerId === ownerId);
  if (minPrice) filtered = filtered.filter((p) => p.price >= Number(minPrice));
  if (maxPrice) filtered = filtered.filter((p) => p.price <= Number(maxPrice));
  if (noise) filtered = filtered.filter((p) => p.quality?.noise === noise);
  if (safety) filtered = filtered.filter((p) => p.quality?.safety === safety);
  if (transit) filtered = filtered.filter((p) => p.quality?.transport === transit || p.quality?.transitDistance === transit);
  if (neighbors) filtered = filtered.filter((p) => p.quality?.neighbors === neighbors);
  if (market) filtered = filtered.filter((p) => p.quality?.marketDistance === market);
  if (transitDistance) filtered = filtered.filter((p) => p.quality?.transitDistance === transitDistance);
  if (social) filtered = filtered.filter((p) => p.quality?.social === social);
  if (typeof elevator !== "undefined") {
    const val = String(elevator) === "true";
    filtered = filtered.filter((p) => Boolean(p.features?.elevator) === val);
  }
  if (typeof wifi !== "undefined") {
    const val = String(wifi) === "true";
    filtered = filtered.filter((p) => Boolean(p.features?.wifi) === val);
  }
  if (typeof washer !== "undefined") {
    const val = String(washer) === "true";
    filtered = filtered.filter((p) => Boolean(p.features?.washer) === val);
  }

  return [...featured, ...filtered.filter((p) => !featured.find((f) => f.id === p.id))];
};

const getPropertyById = async (id) => {
  const result = await pool.query("SELECT * FROM properties WHERE id = $1", [id]);
  return result.rows[0] ? rowToProperty(result.rows[0]) : null;
};

const createProperty = async (data) => {
  const id = uuid();
  await pool.query(
    `INSERT INTO properties (id, title, city, country, price, lat, lng, type, description, images, owner_id, owner_name, owner_email, quality, features, has_representative, best_offer)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      id, data.title, data.city, data.country, Number(data.price) || 0,
      data.lat ?? null, data.lng ?? null, data.type || "entire_place",
      data.description || "", JSON.stringify(data.images || []),
      data.ownerId, data.ownerName || "", data.ownerEmail || "",
      JSON.stringify(data.quality || {}), JSON.stringify(data.features || {}),
      data.hasRepresentative || false, data.bestOffer || false
    ]
  );
  return getPropertyById(id);
};

// Conversations
const listConversationsForUser = async (userId) => {
  const result = await pool.query("SELECT * FROM conversations");
  return result.rows.map(rowToConversation).filter((c) => c.participants.includes(userId));
};

const getConversationById = async (conversationId) => {
  const result = await pool.query("SELECT * FROM conversations WHERE id = $1", [conversationId]);
  return result.rows[0] ? rowToConversation(result.rows[0]) : null;
};

const listMessagesForConversation = async (conversationId) => {
  const result = await pool.query("SELECT * FROM messages WHERE conversation_id = $1", [conversationId]);
  return result.rows.map(rowToMessage);
};

const createMessage = async (conversationId, senderId, text) => {
  const msg = {
    id: uuid(),
    conversationId,
    senderId,
    text,
    createdAt: new Date().toISOString()
  };
  await pool.query(
    `INSERT INTO messages (id, conversation_id, sender_id, text, created_at) VALUES ($1, $2, $3, $4, $5)`,
    [msg.id, msg.conversationId, msg.senderId, msg.text, msg.createdAt]
  );
  return msg;
};

const createConversation = async (participantIds) => {
  const countResult = await pool.query("SELECT COUNT(*) as count FROM conversations");
  const count = parseInt(countResult.rows[0].count);
  const conv = {
    id: "c" + (count + 1),
    participants: participantIds
  };
  await pool.query(
    `INSERT INTO conversations (id, participants) VALUES ($1, $2)`,
    [conv.id, JSON.stringify(conv.participants)]
  );
  return conv;
};

// Documents
const listDocumentsForUser = async (userId) => {
  const result = await pool.query("SELECT * FROM documents WHERE user_id = $1 ORDER BY uploaded_at DESC", [userId]);
  return result.rows.map(rowToDocument);
};

const createDocument = async ({ userId, name, url }) => {
  const doc = {
    id: uuid(),
    userId,
    name,
    url,
    uploadedAt: new Date().toISOString()
  };
  await pool.query(
    `INSERT INTO documents (id, user_id, name, url, uploaded_at) VALUES ($1, $2, $3, $4, $5)`,
    [doc.id, doc.userId, doc.name, doc.url, doc.uploadedAt]
  );
  return doc;
};

// Appointments
const listAppointmentsForUser = async (userId) => {
  const result = await pool.query("SELECT * FROM appointments");
  return result.rows.map(rowToAppointment).filter((a) => a.participantIds.includes(userId));
};

const createAppointment = async ({ type, time, participantIds, note, createdBy }) => {
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
  await pool.query(
    `INSERT INTO appointments (id, type, time, status, participants, note, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [app.id, app.type, app.time, app.status, app.participants, app.note, app.createdBy, app.createdAt]
  );
  return rowToAppointment({ ...app, participants: app.participants });
};

const updateAppointmentStatus = async (id, status, userId) => {
  const result = await pool.query("SELECT * FROM appointments WHERE id = $1", [id]);
  if (!result.rows[0]) return null;
  const parsed = rowToAppointment(result.rows[0]);
  if (!parsed.participantIds.includes(userId) && parsed.createdBy !== userId) {
    return null;
  }
  await pool.query("UPDATE appointments SET status = $1 WHERE id = $2", [status, id]);
  return { ...parsed, status };
};

// Preferences
const getPreferences = async (userId) => {
  const result = await pool.query("SELECT * FROM preferences WHERE user_id = $1", [userId]);
  return result.rows[0] ? rowToPreference(result.rows[0]) : null;
};

const savePreferences = async (userId, data) => {
  const existing = await getPreferences(userId);
  const payload = {
    userId,
    data: JSON.stringify(data || {}),
    updatedAt: new Date().toISOString()
  };
  if (existing) {
    await pool.query("UPDATE preferences SET data = $1, updated_at = $2 WHERE user_id = $3", [payload.data, payload.updatedAt, userId]);
  } else {
    await pool.query("INSERT INTO preferences (user_id, data, updated_at) VALUES ($1, $2, $3)", [userId, payload.data, payload.updatedAt]);
  }
  return getPreferences(userId);
};

const deletePreferences = async (userId) => {
  await pool.query("DELETE FROM preferences WHERE user_id = $1", [userId]);
};

// Ratings
const getRatings = async (userId) => {
  const result = await pool.query("SELECT * FROM ratings WHERE user_id = $1", [userId]);
  return result.rows[0] ? rowToRating(result.rows[0]) : { userId, consultant: null, representative: null, updatedAt: null };
};

const saveRatings = async (userId, ratings) => {
  const payload = {
    userId,
    consultant: ratings.consultant ?? null,
    representative: ratings.representative ?? null,
    updatedAt: new Date().toISOString()
  };
  const existing = await pool.query("SELECT 1 FROM ratings WHERE user_id = $1", [userId]);
  if (existing.rows.length > 0) {
    await pool.query("UPDATE ratings SET consultant = $1, representative = $2, updated_at = $3 WHERE user_id = $4",
      [payload.consultant, payload.representative, payload.updatedAt, userId]);
  } else {
    await pool.query("INSERT INTO ratings (user_id, consultant, representative, updated_at) VALUES ($1, $2, $3, $4)",
      [userId, payload.consultant, payload.representative, payload.updatedAt]);
  }
  return getRatings(userId);
};

module.exports = {
  pool,
  init,
  getUserByEmail,
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
