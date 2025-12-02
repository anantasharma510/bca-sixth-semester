/**
 * Environment variable validation utility
 * Ensures all required environment variables are set before the app starts
 */
export function validateEnvironmentVariables() {
    console.log('🔍 Validating environment variables...');
    const requiredVars = [
        'CLERK_SECRET_KEY',
        'CLERK_ISSUER',
        'MONGODB_URI',
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
        'CLERK_WEBHOOK_SECRET'
    ];
    const missingVars = [];
    // Check required environment variables
    requiredVars.forEach(varName => {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    });
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:');
        missingVars.forEach(varName => {
            console.error(`   - ${varName}`);
        });
        console.error('\nPlease set these environment variables before starting the application.');
        process.exit(1);
    }
    // Validate specific environment variables
    validateClerkIssuer();
    validateMongoDBUri();
    validateCloudinaryConfig();
    console.log('✅ All required environment variables are set');
}
function validateClerkIssuer() {
    const issuer = process.env.CLERK_ISSUER;
    if (!issuer.startsWith('https://') || (!issuer.includes('clerk.accounts.dev') && !issuer.includes('clerk.'))) {
        console.error('❌ CLERK_ISSUER must be a valid Clerk issuer URL (https://*.clerk.accounts.dev or https://clerk.yourdomain.com)');
        process.exit(1);
    }
}
function validateMongoDBUri() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
        console.error('❌ MONGODB_URI must be a valid MongoDB connection string');
        process.exit(1);
    }
}
function validateCloudinaryConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || cloudName.length < 3) {
        console.error('❌ CLOUDINARY_CLOUD_NAME must be a valid Cloudinary cloud name');
        process.exit(1);
    }
    if (!apiKey || apiKey.length < 10) {
        console.error('❌ CLOUDINARY_API_KEY must be a valid Cloudinary API key');
        process.exit(1);
    }
    if (!apiSecret || apiSecret.length < 10) {
        console.error('❌ CLOUDINARY_API_SECRET must be a valid Cloudinary API secret');
        process.exit(1);
    }
}
// Get environment variables with proper typing
export function getEnvVar(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment variable ${key} is not set`);
    }
    return value;
}
// Get optional environment variables with defaults
export function getOptionalEnvVar(key, defaultValue) {
    return process.env[key] || defaultValue;
}
