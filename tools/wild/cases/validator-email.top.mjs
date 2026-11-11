import validator from "validator";
const OPTIONS = { allow_display_name: false, require_tld: true, allow_utf8_local_part: true, host_blacklist: ["spam.example"] };
export function main(input) { return validator.isEmail(input, OPTIONS); }
export const inputs = ["a@b.co", "bad@", "ünï@exämple.de", "x@spam.example", "", "Name <a@b.co>", "a@localhost", 5, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@b.co"];
