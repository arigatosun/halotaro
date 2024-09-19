const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, ".env.test") });
console.log("Jest setup: ENCRYPTION_KEY:", process.env.ENCRYPTION_KEY);
