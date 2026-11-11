import { load } from "js-yaml";
// KNOWN: the application's configuration, as YAML text. RUNTIME: an environment name.
const config = load(`
defaults: &defaults
  retries: 3
  timeout: 30
  hosts: [a.example, b.example]
environments:
  dev:
    <<: *defaults
    timeout: 5
  prod:
    <<: *defaults
    retries: 10
    hosts: [p1.example, p2.example, p3.example]
`);
export function main(input) {
  const env = config.environments[input];
  if (!env) throw new Error("unknown environment: " + input);
  return { url: "https://" + env.hosts[0] + "/?t=" + env.timeout, retries: env.retries, n: env.hosts.length };
}
export const inputs = ["dev", "prod", "staging", "", null, "toString"];
