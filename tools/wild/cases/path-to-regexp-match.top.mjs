import { match } from "path-to-regexp";
// KNOWN: an application's route table. RUNTIME: the request path.
const routes = [
  ["home", match("/")],
  ["user", match("/users/:id")],
  ["post", match("/users/:id/posts/:post{.:format}")],
  ["files", match("/files/*path")],
];
export function main(input) {
  for (const [name, fn] of routes) {
    const m = fn(input);
    if (m) return { name, params: m.params };
  }
  return null;
}
export const inputs = ["/", "/users/42", "/users/42/posts/hello.json", "/files/a/b/c.txt", "/users/caf%C3%A9", "/nope/x", "", "/users/%E0%A4%A", 7];
