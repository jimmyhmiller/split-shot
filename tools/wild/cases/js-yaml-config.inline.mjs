import { load } from "js-yaml";
export function main(input) {
  const config = load("server:\n  port: 8080\n  hosts: [a.example, b.example]\nlimits: {rate: 100, burst: 20}\n");
  return { port: config.server.port + input.offset, host: config.server.hosts[input.i], over: input.rate > config.limits.rate };
}
export const inputs = [{ offset: 1, i: 0, rate: 5 }, { offset: -80, i: 1, rate: 500 }, { offset: 0, i: 9, rate: 100 }, {}, null];
