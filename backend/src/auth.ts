import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { expo } from "@better-auth/expo";
import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_TRUSTED_ORIGINS = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "https://airwig.ca",
  "https://www.airwig.ca",
  "http://localhost:3000",
  "http://192.168.101.6:5000",
  "http://192.168.101.5:5000",
  "http://192.168.101.10:5000",
  // Expo app scheme for deep linking
  "空中维格://",
  "空中维格://*",
];

const ENV_TRUSTED_ORIGINS = (process.env.BETTER_AUTH_TRUSTED_ORIGINS || process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

export const BETTER_AUTH_TRUSTED_ORIGINS = Array.from(
  new Set([...DEFAULT_TRUSTED_ORIGINS, ...ENV_TRUSTED_ORIGINS])
);

// Better Auth configuration
// Note: We use a separate MongoDB connection for Better Auth to avoid BSON version conflicts
// between Mongoose's bundled MongoDB driver and the standalone mongodb package

let authInstance: ReturnType<typeof betterAuth> | null = null;
let mongoClient: MongoClient | null = null;
let authDb: Db | null = null;

export const initializeAuth = async () => {
  if (authInstance) {
    return authInstance;
  }

  console.log('🔐 Initializing Better Auth...');
  
  // Create a separate MongoDB connection for Better Auth
  // This avoids BSON version conflicts with Mongoose
  const MONGODB_URI = process.env.MONGODB_URI || '';
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required for Better Auth");
  }

  try {
    // Create a new MongoDB client for Better Auth
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log('✅ Better Auth MongoDB client connected');
    
    // Get the database name from the connection string
    // MongoDB URI format: mongodb://host:port/dbname or mongodb+srv://host/dbname
    let dbName = 'airwig'; // default
    try {
      const uriMatch = MONGODB_URI.match(/\/([^/?]+)(\?|$)/);
      if (uriMatch && uriMatch[1]) {
        dbName = uriMatch[1];
      }
    } catch (e) {
      console.warn('Could not extract database name from URI, using default:', dbName);
    }
    authDb = mongoClient.db(dbName);
    
    authInstance = betterAuth({
      database: mongodbAdapter(authDb),
      plugins: [expo()],

      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false, // Set to true if you want email verification
      },

      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day - update session every day
      },

      trustedOrigins: BETTER_AUTH_TRUSTED_ORIGINS,

      baseURL: process.env.BETTER_AUTH_URL || process.env.BASE_URL || "http://localhost:5000",
      basePath: "/api/auth",

      secret: process.env.BETTER_AUTH_SECRET || process.env.SECRET || "change-me-in-production",

      // CORS settings
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      },
    });

    console.log('✅ Better Auth initialized successfully');
    return authInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Better Auth MongoDB connection:', error);
    throw error;
  }
};

// Cleanup function to close MongoDB connection
export const closeAuthConnection = async () => {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    authDb = null;
    authInstance = null;
    console.log('✅ Better Auth MongoDB connection closed');
  }
};

// Export auth getter - must be initialized before use
export function getAuth(): ReturnType<typeof betterAuth> {
  if (!authInstance) {
    throw new Error("Better Auth not initialized. Call initializeAuth() after connecting to MongoDB.");
  }
  return authInstance;
}

// Export auth as a getter property for convenience
// This will throw if accessed before initialization
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    const instance = getAuth();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

// Export session type for TypeScript
export type Session = ReturnType<typeof betterAuth>["$Infer"]["Session"];

