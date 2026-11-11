import escapeHtml from "escape-html";
export function main(input) { return "<p class=\"msg\">" + escapeHtml(input) + "</p>"; }
export const inputs = ["<script>alert('x')</script>", "a & b \"c\"", "", "plain é", 42, null];
