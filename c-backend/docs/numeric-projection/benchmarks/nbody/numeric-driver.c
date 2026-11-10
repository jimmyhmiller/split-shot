#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <time.h>
extern double numeric_main(double);
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec * 1e-9; }
int main(int argc, char **argv) {
  if(argc != 3) return 2;
  double input = strtod(argv[1], 0); int samples = atoi(argv[2]);
  int warmup = samples ? 5 : 0; if (!samples) samples = 1;
  for(int i=0; i<samples+warmup; i++) {
    double start=now(), value=numeric_main(input), elapsed=now()-start;
    uint64_t bits; memcpy(&bits, &value, sizeof(bits));
    if(i>=warmup) printf("%.9f %016llx\n", elapsed, (unsigned long long)bits);
  }
  return 0;
}
