

#define _POSIX_C_SOURCE 200809L
#include "partial_runtime.h"
#include <stdlib.h>
#include <time.h>
#include <stdint.h>
#include <string.h>
extern const size_t pe_program_function_count;
extern pe_value pe_run(pe_ctx *, pe_value);
static double now(void) {
  struct timespec t;
  clock_gettime(CLOCK_MONOTONIC, &t);
  return t.tv_sec + t.tv_nsec * 1e-9;
}
int main(int argc, char **argv) {
  if (argc != 3)
    return 2;
  double input = strtod(argv[1], 0);
  int count = atoi(argv[2]), warmup = count ? 5 : 0;
  if (!count)
    count = 1;
  for (int i = 0; i < count + warmup; i++) {
    pe_ctx *c = pe_context_new(pe_program_function_count);
    pe_gc_major_only(c, getenv("PE_GC_MAJOR_ONLY") != NULL);
    double start = now();
    pe_value v = pe_run(c, pe_num(input));
    double elapsed = now() - start;
    if (pe_thrown(c))
      return 3;
    if (i >= warmup) {
      printf("%.9f ", elapsed);
      if (v.tag != PE_NUMBER) return 4;
      uint64_t bits; memcpy(&bits, &v.as.num, sizeof(bits));
      printf("%016llx\n", (unsigned long long)bits);
      fprintf(stderr,
              "{\"peak_bytes\":%zu,\"reserved_object_bytes\":%zu,\"minor_"
              "collections\":%zu,\"major_collections\":%zu}\n",
              pe_gc_peak_bytes(c), pe_gc_reserved_object_bytes(c),
              pe_gc_minor_collections(c), pe_gc_major_collections(c));
    }
    pe_context_free(c);
  }
  return 0;
}
