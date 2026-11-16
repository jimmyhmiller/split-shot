// A mode's state in the URL: JSON, deflated, base64url.
async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

export async function encodeState(obj) {
  const bytes = await pipe(new TextEncoder().encode(JSON.stringify(obj)), new CompressionStream("deflate-raw"));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function decodeState(text) {
  const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(await pipe(bytes, new DecompressionStream("deflate-raw"))));
}
