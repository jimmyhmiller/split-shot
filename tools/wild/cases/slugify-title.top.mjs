import slugify from "slugify";
const OPTIONS = { lower: true, strict: true, replacement: "-", trim: true };
export function main(input) { return slugify(input, OPTIONS); }
export const inputs = ["Hello, World!", "  Ünïcödé & Größe  ", "", "100% ♥ $5", "日本語 text", "a--b__c", 5];
