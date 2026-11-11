import { match } from "path-to-regexp";
export function main(input) {
  const m = match("/users/:id/posts/:post{.:format}")(input);
  return m ? m.params : null;
}
export const inputs = ["/users/42/posts/hello.json", "/users/42/posts/hello", "/users/caf%C3%A9/posts/x", "/nope/x", "", "/users/%E0%A4%A/posts/1"];
