import { compile } from "path-to-regexp";
const toPath = compile("/user/:id/posts/:post{/comments/:comment}");
export function main(input) { return toPath(input); }
export const inputs = [{ id: "1", post: "a" }, { id: "x y", post: "é", comment: "7" }, {}, { id: "1" }, { id: 1, post: "a" }, null];
