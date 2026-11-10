/* Numeric-only residual. Indices must be integral and in bounds. */
#include <stdlib.h>
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <math.h>
static int numeric_truth(double x) { return x != 0.0 && !isnan(x); }
static double *numeric_alloc(double n) {
  if (!isfinite(n) || n <= 0 || floor(n) != n || n >= (double)(SIZE_MAX / sizeof(double))) abort();
  double *p = (double *)calloc((size_t)n, sizeof(double));
  if (!p) abort();
  return p;
}
double numeric_main(double input) {
double numeric_result;
double v_61_n;
v_61_n = input;
if (numeric_truth(((0.00000000000000000e0) == (fmod((v_61_n), (3.00000000000000000e0)))))) {
{
numeric_result = ((v_61_n) + (7.00000000000000000e0)); goto numeric_cleanup;
}
} else {
}
if (numeric_truth(((1.00000000000000000e0) == (fmod((v_61_n), (3.00000000000000000e0)))))) {
{
numeric_result = 9.00000000000000000e0; goto numeric_cleanup;
}
} else {
}
if (numeric_truth(((2.00000000000000000e0) == (fmod((v_61_n), (3.00000000000000000e0)))))) {
{
numeric_result = 1.00000000000000000e1; goto numeric_cleanup;
}
} else {
}
numeric_result = 7.00000000000000000e0; goto numeric_cleanup;
numeric_cleanup: ;
return numeric_result;
}
#ifdef NUMERIC_STANDALONE
int main(int argc, char **argv) {
  if (argc != 2) { fprintf(stderr, "usage: %s number\n", argv[0]); return 2; }
  char *end; double x = strtod(argv[1], &end);
  if (end == argv[1] || *end) return 2;
  printf("%.17g\n", numeric_main(x)); return 0;
}
#endif
