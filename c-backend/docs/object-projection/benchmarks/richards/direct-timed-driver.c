/* Read-only direct-C backend comparison. All invocation lifetime work is timed. */
#define _POSIX_C_SOURCE 200809L
#include "partial_runtime.h"
#include <math.h>
#include <stdlib.h>
#include <time.h>

typedef struct { int boolean; double queue, hold; } Result;
static volatile double sink;
static double now(void) {
  struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t);
  return (double)t.tv_sec + (double)t.tv_nsec * 1e-9;
}
static Result invoke(double input) {
  pe_ctx *c = pe_context_new(pe_program_function_count);
  pe_value v = pe_run(c, pe_num(input));
  if(pe_thrown(c)) { pe_print(stderr, pe_exception(c)); fputc('\n',stderr); pe_context_free(c); exit(3); }
  Result r = {0,0,0};
  if(v.tag == PE_BOOL && v.as.boolean) r.boolean = 1;
  else if(v.tag == PE_OBJECT) {
    pe_value slots[] = {v}; pe_frame root;
    pe_frame_enter(c, &root, slots, 1);
    pe_value q=pe_get(c,v,pe_num(0)), h=pe_get(c,v,pe_num(1));
    if(q.tag!=PE_NUMBER || h.tag!=PE_NUMBER) exit(4);
    r.queue=q.as.num; r.hold=h.as.num;
    pe_frame_leave(c,&root);
  } else exit(4);
  pe_context_free(c);
  return r;
}
static double run(double input, int batch, Result expected) {
  double start=now();
  for(int j=0;j<batch;j++) {
    Result r=invoke(input);
    if(r.boolean!=expected.boolean || r.queue!=expected.queue || r.hold!=expected.hold) exit(5);
    sink += r.boolean ? 1 : r.queue*1000003+r.hold;
  }
  return (now()-start)/batch;
}
int main(int argc, char **argv) {
  if(argc!=4) return 2;
  char *end; double input=strtod(argv[1],&end); if(*end) return 2;
  int samples=atoi(argv[2]),warmup=atoi(argv[3]);
  if(samples<0 || warmup<0) return 2;
  Result expected=invoke(input);
  printf("{\"input\":%.17g,\"value\":",input);
  if(expected.boolean) fputs("true",stdout); else printf("[%.17g,%.17g]",expected.queue,expected.hold);
  if(samples==0) { puts("}"); return 0; }
  for(int i=0;i<warmup;i++) run(input,1,expected);
  double pilot=run(input,1,expected);
  int batch=(int)ceil(0.03/fmax(pilot,0.000001)); if(batch>1000) batch=1000; if(batch<1) batch=1;
  printf(",\"warmup_calls\":%d,\"pilot_calls\":1,\"batch\":%d,\"samples_seconds\":[",warmup,batch);
  for(int i=0;i<samples;i++) printf("%s%.12g",i?",":"",run(input,batch,expected));
  printf("],\"consumed_checksum\":%.17g}\n",sink);
  return 0;
}
