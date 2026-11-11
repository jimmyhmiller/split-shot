import isURL from "validator/lib/isURL.js";
const OPTIONS = { protocols: ["https"], require_protocol: true, require_tld: true, allow_query_components: true };
export function main(input) { return isURL(input, OPTIONS); }
export const inputs = ["https://example.com/a?b=c#d", "http://example.com", "example.com", "https://localhost:3000", "https://exämple.de/ü", "", "https://user:pw@example.com:8080/", null, "https://[::1]/"];
