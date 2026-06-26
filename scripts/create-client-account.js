#!/usr/bin/env node
/**
 * Create a login account for a client.
 *   node scripts/create-client-account.js "<email>" "<Business Name>" "<password>"
 *
 * Prints a JSON account object. Add it to the CLIENT_ACCOUNTS env var on your
 * server (a JSON array). The client then logs into the CRM with that email +
 * password and sees only their own leads.
 *
 * The `business` MUST match the businessName in that client's assistant metadata
 * (the provisioner sets it) so their leads are matched correctly.
 */
const { hashPassword } = require("../server/auth");

const [, , email, business, password] = process.argv;
if (!email || !business || !password) {
  console.error('Usage: node scripts/create-client-account.js "<email>" "<Business Name>" "<password>"');
  process.exit(1);
}
const { salt, hash } = hashPassword(password);
const account = { username: email, business, salt, hash };

console.log("\nAdd this object to the CLIENT_ACCOUNTS JSON array on your server:\n");
console.log(JSON.stringify(account, null, 2));
console.log("\nExample CLIENT_ACCOUNTS with one account:");
console.log(JSON.stringify([account]));
console.log(`\nClient logs in with:  ${email}  /  (the password you chose)`);
