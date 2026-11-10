/* Include after generated C. All context lifetime work is timed. */
#define _POSIX_C_SOURCE 200809L

#include <math.h>
#include <stdlib.h>
#include <time.h>

typedef struct { int boolean; double queue, hold; } Result;
static volatile double sink;
static double now(void) {
  struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t);
  return (double)t.tv_sec + (double)t.tv_nsec * 1e-9;
}
static size_t observed_allocations, observed_objects;
static Result invoke(double input) {
  oc_ctx *c = oc_context_new();
  if(!c) exit(6);
  c->catch_active=1;
  if(setjmp(c->escape)) {
    if(c->thrown) {
      fputs("guest exception: ",stderr); oc_print(stderr,oc_get(c,c->exception,4),0);
    } else fprintf(stderr,"runtime failure: %s",c->failure?c->failure:"unknown");
    fputc('\n',stderr); int code=c->thrown?3:7; oc_context_free(c); exit(code);
  }
  oc_value v = object_run(c,input);
  Result r = {0,0,0};
  if(v.tag == OC_BOOL && v.as.boolean) r.boolean = 1;
  else if(v.tag == OC_OBJECT && v.as.object->cell.object_kind==1 && OC_ARRAY(v.as.object)->length==2) {
    r.queue=oc_number(c,oc_get_index(c,v,0));
    r.hold=oc_number(c,oc_get_index(c,v,1));
  } else { oc_context_free(c); exit(4); }
  observed_allocations=c->allocations;
  observed_objects=c->object_allocations;
  oc_context_free(c);
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
  printf(",\"allocation_blocks_per_invocation\":%zu,\"object_allocations_per_invocation\":%zu",observed_allocations,observed_objects);
  if(samples==0) { puts("}"); return 0; }
  for(int i=0;i<warmup;i++) run(input,1,expected);
  double pilot=run(input,1,expected);
  int batch=(int)ceil(0.03/fmax(pilot,0.000001)); if(batch>1000) batch=1000; if(batch<1) batch=1;
  printf(",\"warmup_calls\":%d,\"pilot_calls\":1,\"batch\":%d,\"samples_seconds\":[",warmup,batch);
  for(int i=0;i<samples;i++) printf("%s%.12g",i?",":"",run(input,batch,expected));
  printf("],\"consumed_checksum\":%.17g}\n",sink);
  return 0;
}
