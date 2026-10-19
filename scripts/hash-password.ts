import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Usage: npm run hash-password -- "a-password-of-8-or-more-characters"');
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 12);
console.log(`For Vercel (paste as the value of ADMIN_PASSWORD_HASH):\n${hash}\n`);
// Next.js expands $VARS when it reads .env files, so each $ in the hash has to be escaped there.
console.log(`For a local .env file:\nADMIN_PASSWORD_HASH=${hash.replaceAll("$", "\\$")}`);
