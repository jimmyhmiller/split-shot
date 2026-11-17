typedef unsigned int u32;
__attribute__((noinline)) u32 mix(u32 h, u32 i) {
  h ^= i;
  h = (h << 5) | (h >> 27);
  return h * 0x9e3779b1u;
}
int hash(int n) {
  u32 h = 2166136261u;
  for (int i = 0; i < n; i++) h = mix(h, (u32)i);
  return (int)h;
}
