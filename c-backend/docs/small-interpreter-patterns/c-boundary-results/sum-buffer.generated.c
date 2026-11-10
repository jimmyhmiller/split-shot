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
double * v_61_p;
double v_62_n;
double *owner_0 = NULL;
v_62_n = input;
(v_61_p = ((owner_0 = numeric_alloc(3.00000000000000000e0))));
((v_61_p)[(size_t)(0.00000000000000000e0)] = (v_62_n));
((v_61_p)[(size_t)(1.00000000000000000e0)] = (0.00000000000000000e0));
((v_61_p)[(size_t)(2.00000000000000000e0)] = (0.00000000000000000e0));
((v_61_p)[(size_t)(1.00000000000000000e0)] = (0.00000000000000000e0));
((v_61_p)[(size_t)(2.00000000000000000e0)] = (0.00000000000000000e0));
loop_1: ;
if (!numeric_truth((((v_61_p)[(size_t)(1.00000000000000000e0)]) < ((v_61_p)[(size_t)(0.00000000000000000e0)])))) goto end_2;
{
{
((v_61_p)[(size_t)(1.00000000000000000e0)] = ((v_61_p)[(size_t)(1.00000000000000000e0)]));
((v_61_p)[(size_t)(2.00000000000000000e0)] = ((((v_61_p)[(size_t)(2.00000000000000000e0)]) + ((v_61_p)[(size_t)(1.00000000000000000e0)]))));
((v_61_p)[(size_t)(1.00000000000000000e0)] = ((((v_61_p)[(size_t)(1.00000000000000000e0)]) + (1.00000000000000000e0))));
}
}
goto loop_1;
end_2: ;
numeric_result = (v_61_p)[(size_t)(2.00000000000000000e0)]; goto numeric_cleanup;
numeric_cleanup: ;
free(owner_0);
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
