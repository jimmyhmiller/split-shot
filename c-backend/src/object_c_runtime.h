/* Generic object-projection data ABI. No AST interpreter or guest source is
 * linked. Guest objects, strings and element storage are cells of a precise,
 * non-moving mark-sweep heap owned by a host context. Roots are the context's
 * own values, the interpreter's shared value buffers, and the root frames that
 * generated functions link while they hold values across a collection point. */
#ifndef OBJECT_C_RUNTIME_H
#define OBJECT_C_RUNTIME_H
#include <limits.h>
#include <math.h>
#include <setjmp.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#if defined(__ARM_FEATURE_JCVT)
#include <arm_acle.h>
#endif

#ifndef OC_ATOMS
#error "OC_ATOMS (the program's static property-atom count) must be defined before the object runtime"
#endif
#if defined(__GNUC__) || defined(__clang__)
#define OC_LIKELY(x) __builtin_expect(!!(x), 1)
#define OC_UNLIKELY(x) __builtin_expect(!!(x), 0)
#define OC_INLINE static inline __attribute__((always_inline))
#define OC_NOINLINE static __attribute__((noinline, cold))
#else
#define OC_LIKELY(x) (x)
#define OC_UNLIKELY(x) (x)
#define OC_INLINE static inline
#define OC_NOINLINE static
#endif
typedef struct oc_obj oc_obj;
typedef struct oc_string oc_string;
typedef struct oc_scope oc_scope;
/* OC_ABSENT never denotes a guest value. It marks a missing named slot or an
 * array hole inside object storage, so presence needs no side table. */
typedef enum {
  OC_UNDEF,
  OC_NULL,
  OC_BOOL,
  OC_NUMBER,
  OC_OBJECT,
  OC_STRING,
  OC_ABSENT,
  /* A lexical environment. Only the interpreter's own plumbing holds one; it
   * is never a guest value. */
  OC_SCOPE
} oc_tag;
typedef struct {
  oc_tag tag;
  union {
    double number;
    int boolean;
    oc_obj *object;
    oc_string *string;
    oc_scope *scope;
  } as;
} oc_value;
typedef struct {
  oc_value *data;
  size_t length;
} oc_values;
/* Every collected allocation starts with a cell header. `fixed` marks a
 * statically allocated cell (a string literal) that is never marked or swept. */
enum { OC_CELL_FREE, OC_CELL_OBJECT, OC_CELL_STRING, OC_CELL_INDEX, OC_CELL_SCOPE };
typedef struct {
  uint8_t kind, mark, fixed;
  /* Object cells only: object kind, whether it can construct, how many
   * property slots are inline, and how many more its side storage holds. */
  uint8_t object_kind, constructible, inline_slots;
  uint16_t more_slots;
} oc_cell;
typedef struct oc_index_prop {
  oc_cell cell;
  uint32_t key;
  oc_value value;
  struct oc_index_prop *next;
} oc_index_prop;
struct oc_string {
  oc_cell cell;
  size_t length;
  uint16_t units[];
};
/* A lexical environment: enclosing scope (NULL outermost), the receiver it
 * was entered with, and its binding slots. */
struct oc_scope {
  oc_cell cell;
  oc_scope *parent;
  oc_value receiver;
  size_t count;
  oc_value slots[];
};
/* A shape is the ordered list of property names an object has acquired.
 * Objects that acquired the same names in the same order share one, so a
 * property's slot number is a fact about the shape. `slot[atom]` is that
 * number or OC_NO_SLOT. Shapes form a tree by "add one property" and live as
 * long as the context. */
#define OC_NO_SLOT UINT16_MAX
#define OC_INLINE_SLOT_LIMIT 128
/* Property attributes. A property created by assignment has all three. */
#define OC_WRITABLE 1
#define OC_ENUMERABLE 2
#define OC_CONFIGURABLE 4
#define OC_ASSIGNED (OC_WRITABLE | OC_ENUMERABLE | OC_CONFIGURABLE)
/* `store[atom]` is the slot an assignment may write: the property's slot when
 * it exists and is writable, else OC_NO_SLOT. Keeping it apart from `slot`
 * means neither loads nor stores test attributes on their fast path. */
typedef struct oc_shape {
  struct oc_shape *parent, *children, *sibling;
  uint32_t key;
  /* The id the specializer knows this shape by, or 0 (see oc_shape_declare). */
  uint32_t id;
  uint16_t count;
  uint8_t key_flags;
  uint16_t slot[OC_ATOMS];
  uint16_t store[OC_ATOMS];
  uint8_t flags[OC_ATOMS];
} oc_shape;
/* Storage an object owns outside its cell: slots past the inline ones, and
 * array elements. It is released when the collector frees the object, so
 * growing it is not a collection point. */
typedef struct oc_owned {
  struct oc_owned *prev, *next;
  size_t bytes;
  size_t unused;
} oc_owned;
/* Every object: its shape, prototype (NULL for null), side slots, and
 * indexed properties defined on it as a prototype. Inline slots follow, at
 * the same offset for every kind: as many as requested for a plain object,
 * none for an array, a fixed few for a function. An array's or function's
 * own state comes after them. */
struct oc_obj {
  oc_cell cell;
  oc_shape *shape;
  oc_obj *proto;
  oc_value *more;
  oc_index_prop *indices;
};
typedef struct {
  oc_obj object;
  oc_value slots[];
} oc_plain;
typedef struct {
  oc_obj object;
  uint32_t length;
  size_t element_capacity;
  oc_value *elements;
} oc_array;
#define OC_FUNCTION_SLOTS 2
typedef struct {
  oc_obj object;
  oc_value slots[OC_FUNCTION_SLOTS]; /* inline: `prototype` and one more */
  double code;
  oc_value env;        /* captured scope, or null */
  uint16_t instance_slots; /* inline slots given to objects it constructs */
} oc_function;
#define OC_ARRAY(o) ((oc_array *)(o))
#define OC_FUNCTION(o) ((oc_function *)(o))
#define OC_SLOTS(o) (((oc_plain *)(o))->slots)
/* The heap. Cells up to OC_SMALL_GRANULES granules come from blocks dedicated
 * to one exact size; each size has a free list and a bump region. Larger cells
 * are separate system allocations. Nothing moves. */
#define OC_GRANULE ((size_t)16)
#define OC_SMALL_GRANULES ((size_t)256)
#define OC_BLOCK_BYTES ((size_t)1 << 17)
#ifndef OC_GC_INITIAL_BYTES
#define OC_GC_INITIAL_BYTES ((size_t)8 << 20)
#endif
typedef struct oc_block {
  struct oc_block *next;
  char *used; /* end of the cells handed out so far */
  char *end;
  size_t unused;
} oc_block;
typedef struct oc_free_cell {
  oc_cell cell;
  struct oc_free_cell *next;
} oc_free_cell;
typedef struct {
  oc_free_cell *free;
  char *bump, *bump_end;
  oc_block *blocks; /* the first block owns the bump region */
} oc_class;
typedef struct oc_large {
  struct oc_large *next;
  size_t bytes;
} oc_large;
/* Host buffers (interpreter stacks and scratch vectors) live as long as the
 * context. Value buffers are roots in their entirety. */
typedef struct oc_host {
  struct oc_host *next;
  size_t values;
} oc_host;
/* Values a native activation holds across a collection point. */
typedef struct oc_frame {
  struct oc_frame *prev;
  const oc_value *values;
  size_t count;
} oc_frame;
#define OC_TEMP_ROOTS 32
typedef struct {
  oc_value *shared_values[8];
  size_t shared_value_sizes[8];
  double *shared_numbers[8];
  size_t shared_number_sizes[8];
  oc_class classes[OC_SMALL_GRANULES + 1];
  oc_large *large;
  oc_host *host;
  oc_owned *owned;
  oc_shape *empty_shape;
  /* The shapes generated code declared, by id; entry 1 is the empty shape. */
  oc_shape **static_shapes;
  size_t static_shape_count;
  /* Shapes are carved from chunks; `shape_room` are the unused bytes of the
   * newest chunk. */
  oc_host *shape_chunks;
  char *shape_next;
  size_t shape_room;
  /* An open-addressed index over the program's property-atom names, built
   * on the first lookup of a name computed at run time. `guarded[atom]` is
   * set once any property of that name has been made non-writable, so that
   * only then does adding a property consult the prototype chain for one. */
  uint16_t *atom_index;
  size_t atom_index_size;
  uint8_t guarded[OC_ATOMS];
  size_t heap_bytes, heap_limit, peak_heap_bytes, collections;
  oc_frame *frames;
  oc_value temps[OC_TEMP_ROOTS];
  size_t temp_count;
  const oc_value *keep;
  size_t keep_count;
  oc_cell **mark_stack;
  size_t mark_count, mark_capacity;
  /* forbid: generated code is inside a call the emitter classified as unable
   * to collect (checked builds only). erroring: a runtime error is being
   * constructed; control never returns to the frames below, so their roots
   * are not consulted and no collection runs. */
  size_t forbid;
  int erroring;
  /* Set when a protected call intercepted a guest throw; read once. */
  int caught;
  /* Root prototypes: object, array, function, string, number, boolean. */
  oc_value roots[6];
  jmp_buf escape;
  int catch_active, thrown;
  oc_value exception;
  const char *failure;
  size_t allocations, object_allocations;
  size_t depth;
} oc_ctx;
static void oc_type_error(oc_ctx *, const char *);
static void oc_range_error(oc_ctx *, const char *);
OC_INLINE oc_value oc_undef(void) { return (oc_value){.tag = OC_UNDEF}; }
OC_INLINE oc_value oc_null(void) { return (oc_value){.tag = OC_NULL}; }
OC_INLINE oc_value oc_num(double x) {
  return (oc_value){.tag = OC_NUMBER, .as.number = x};
}
OC_INLINE oc_value oc_bool(double x) {
  return (oc_value){.tag = OC_BOOL, .as.boolean = (x != 0 && !isnan(x))};
}
OC_INLINE oc_value oc_boolean(int x) {
  return (oc_value){.tag = OC_BOOL, .as.boolean = x != 0};
}
static void oc_context_free(oc_ctx *c) {
  if (!c)
    return;
  for (size_t g = 0; g <= OC_SMALL_GRANULES; g++)
    for (oc_block *b = c->classes[g].blocks, *n; b; b = n) {
      n = b->next;
      free(b);
    }
  for (oc_large *m = c->large, *n; m; m = n) {
    n = m->next;
    free(m);
  }
  for (oc_host *m = c->host, *n; m; m = n) {
    n = m->next;
    free(m);
  }
  for (oc_owned *m = c->owned, *n; m; m = n) {
    n = m->next;
    free(m);
  }
  for (oc_host *m = c->shape_chunks, *n; m; m = n) {
    n = m->next;
    free(m);
  }
  free(c->static_shapes);
  free(c->atom_index);
  free(c->mark_stack);
  free(c);
}
/* The entry is the only catch point: a failure or guest throw abandons every
 * native activation, and with them their root frames and temporaries. */
static void oc_unwind(oc_ctx *c) {
  c->frames = NULL;
  c->temp_count = 0;
  c->forbid = 0;
  c->depth = 0;
}
OC_NOINLINE void oc_fail(oc_ctx *c, const char *text) {
  c->failure = text;
  if (c->catch_active) {
    oc_unwind(c);
    longjmp(c->escape, 1);
  }
  fprintf(stderr, "object intrinsic: %s\n", text);
  abort();
}
/* Guest call nesting is bounded where a native activation is created. A callee
 * expanded inline into its caller shares that activation and is not counted. */
#ifndef OC_CALL_DEPTH_LIMIT
#define OC_CALL_DEPTH_LIMIT 256
#endif
#define OC_DEPTH_ENTER(c)                                                      \
  do {                                                                         \
    if (OC_UNLIKELY(++(c)->depth > OC_CALL_DEPTH_LIMIT))                       \
      oc_fail((c), "interpreter frame capacity exceeded");                     \
  } while (0)
#define OC_DEPTH_LEAVE(c) ((void)(c)->depth--)
OC_NOINLINE void oc_violated(oc_ctx *c, const char *what) { oc_fail(c, what); }
#if defined(__has_feature)
#if __has_feature(address_sanitizer)
#define OC_ASAN 1
#endif
#endif
#if defined(__SANITIZE_ADDRESS__) && !defined(OC_ASAN)
#define OC_ASAN 1
#endif
#ifdef OC_ASAN
void __asan_poison_memory_region(void const volatile *, size_t);
void __asan_unpoison_memory_region(void const volatile *, size_t);
#define OC_POISON(p, n) __asan_poison_memory_region((p), (n))
#define OC_UNPOISON(p, n) __asan_unpoison_memory_region((p), (n))
#else
#define OC_POISON(p, n) ((void)(p), (void)(n))
#define OC_UNPOISON(p, n) ((void)(p), (void)(n))
#endif
/* Checked builds bracket every generated call the emitter classified as
 * unable to collect; an allocation inside one is an emitter error. */
#ifdef OC_VERIFY_PROOFS
#define OC_NOGC(c, e)                                                          \
  __extension__({                                                              \
    (c)->forbid++;                                                             \
    __typeof__(e) oc_nogc_result = (e);                                        \
    (c)->forbid--;                                                             \
    oc_nogc_result;                                                            \
  })
#else
#define OC_NOGC(c, e) (e)
#endif
OC_INLINE void oc_protect(oc_ctx *c, oc_value v) {
  if (OC_UNLIKELY(c->temp_count == OC_TEMP_ROOTS))
    oc_fail(c, "runtime temporary root stack exhausted");
  c->temps[c->temp_count++] = v;
}
OC_INLINE void oc_unprotect(oc_ctx *c, size_t n) { c->temp_count -= n; }
static void oc_mark_push(oc_ctx *c, oc_cell *cell) {
  if (cell->fixed || cell->mark)
    return;
  cell->mark = 1;
  if (cell->kind == OC_CELL_STRING)
    return;
  if (c->mark_count == c->mark_capacity) {
    size_t n = c->mark_capacity ? c->mark_capacity * 2 : 1024;
    oc_cell **grown = (oc_cell **)realloc(c->mark_stack, n * sizeof(*grown));
    if (!grown) {
      fprintf(stderr, "object intrinsic: out of memory while collecting\n");
      abort();
    }
    c->mark_stack = grown;
    c->mark_capacity = n;
  }
  c->mark_stack[c->mark_count++] = cell;
}
static inline void oc_mark_value(oc_ctx *c, oc_value v) {
  if (v.tag == OC_OBJECT)
    oc_mark_push(c, &v.as.object->cell);
  else if (v.tag == OC_STRING)
    oc_mark_push(c, &v.as.string->cell);
  else if (v.tag == OC_SCOPE)
    oc_mark_push(c, &v.as.scope->cell);
}
static void oc_mark_values(oc_ctx *c, const oc_value *v, size_t n) {
  for (size_t i = 0; i < n; i++)
    oc_mark_value(c, v[i]);
}
static void oc_trace(oc_ctx *c) {
  while (c->mark_count) {
    oc_cell *cell = c->mark_stack[--c->mark_count];
    switch (cell->kind) {
    case OC_CELL_OBJECT: {
      oc_obj *o = (oc_obj *)cell;
      if (o->proto)
        oc_mark_push(c, &o->proto->cell);
      size_t count = o->shape->count, inside = cell->inline_slots;
      if (count <= inside) {
        oc_mark_values(c, OC_SLOTS(o), count);
      } else {
        oc_mark_values(c, OC_SLOTS(o), inside);
        oc_mark_values(c, o->more, count - inside);
      }
      if (cell->object_kind == 1) {
        oc_array *a = OC_ARRAY(o);
        size_t n = a->length < a->element_capacity ? a->length
                                                   : a->element_capacity;
        oc_mark_values(c, a->elements, n);
      } else if (cell->object_kind == 2) {
        oc_mark_value(c, OC_FUNCTION(o)->env);
      }
      if (o->indices)
        oc_mark_push(c, &o->indices->cell);
      break;
    }
    case OC_CELL_SCOPE: {
      oc_scope *e = (oc_scope *)cell;
      if (e->parent)
        oc_mark_push(c, &e->parent->cell);
      oc_mark_value(c, e->receiver);
      oc_mark_values(c, e->slots, e->count);
      break;
    }
    case OC_CELL_INDEX: {
      oc_index_prop *p = (oc_index_prop *)cell;
      oc_mark_value(c, p->value);
      if (p->next)
        oc_mark_push(c, &p->next->cell);
      break;
    }
    default:
      fprintf(stderr, "object intrinsic: collector reached a free cell\n");
      abort();
    }
  }
}
static void oc_owned_free(oc_ctx *c, void *data) {
  if (!data)
    return;
  oc_owned *m = (oc_owned *)data - 1;
  if (m->prev)
    m->prev->next = m->next;
  else
    c->owned = m->next;
  if (m->next)
    m->next->prev = m->prev;
  c->heap_bytes -= m->bytes;
  free(m);
}
/* Resize owned storage, preserving its contents. Never collects. */
static void *oc_owned_resize(oc_ctx *c, void *data, size_t bytes) {
  oc_owned *old = data ? (oc_owned *)data - 1 : NULL;
  if (bytes > SIZE_MAX - sizeof(oc_owned))
    oc_fail(c, "allocation overflow");
  size_t before = old ? old->bytes : 0;
  oc_owned *m = (oc_owned *)realloc(old, sizeof(*m) + bytes);
  if (!m)
    oc_fail(c, "out of memory");
  if (!old) {
    m->prev = NULL;
    m->next = c->owned;
    if (c->owned)
      c->owned->prev = m;
    c->owned = m;
  } else {
    if (m->prev)
      m->prev->next = m;
    else
      c->owned = m;
    if (m->next)
      m->next->prev = m;
  }
  m->bytes = bytes;
  c->heap_bytes += bytes - before;
  if (c->heap_bytes > c->peak_heap_bytes)
    c->peak_heap_bytes = c->heap_bytes;
  return m + 1;
}
static void oc_release(oc_ctx *c, oc_cell *cell, size_t bytes) {
  if (cell->kind == OC_CELL_OBJECT) {
    oc_obj *o = (oc_obj *)cell;
    oc_owned_free(c, o->more);
    if (cell->object_kind == 1)
      oc_owned_free(c, OC_ARRAY(o)->elements);
  }
  cell->kind = OC_CELL_FREE;
#if defined(OC_GC_STRESS) && !defined(OC_ASAN)
  if (bytes > sizeof(oc_free_cell))
    memset((char *)cell + sizeof(oc_free_cell), 0xDB,
           bytes - sizeof(oc_free_cell));
#endif
  if (bytes > sizeof(oc_free_cell))
    OC_POISON((char *)cell + sizeof(oc_free_cell), bytes - sizeof(oc_free_cell));
}
/* Free every unmarked cell and return the bytes that survived. */
static size_t oc_sweep(oc_ctx *c) {
  size_t live = 0;
  for (size_t g = 1; g <= OC_SMALL_GRANULES; g++) {
    oc_class *k = &c->classes[g];
    if (!k->blocks)
      continue;
    size_t bytes = g * OC_GRANULE;
    k->blocks->used = k->bump;
    k->free = NULL;
    for (oc_block **link = &k->blocks, *b; (b = *link);) {
      oc_free_cell *first = NULL, **tail = &first;
      size_t survivors = 0;
      for (char *p = (char *)(b + 1); p < b->used; p += bytes) {
        oc_cell *cell = (oc_cell *)p;
        if (cell->kind != OC_CELL_FREE && cell->mark) {
          cell->mark = 0;
          survivors++;
          continue;
        }
        if (cell->kind != OC_CELL_FREE)
          oc_release(c, cell, bytes);
        *tail = (oc_free_cell *)cell;
        tail = &((oc_free_cell *)cell)->next;
      }
      if (!survivors && b != k->blocks) {
        *link = b->next;
        c->heap_bytes -= OC_BLOCK_BYTES;
        OC_UNPOISON(b, OC_BLOCK_BYTES);
        free(b);
        continue;
      }
      *tail = k->free;
      k->free = first;
      live += survivors * bytes;
      link = &b->next;
    }
  }
  for (oc_large **link = &c->large, *m; (m = *link);) {
    oc_cell *cell = (oc_cell *)(m + 1);
    if (cell->mark) {
      cell->mark = 0;
      live += m->bytes;
      link = &m->next;
    } else {
      *link = m->next;
      c->heap_bytes -= m->bytes;
      free(m);
    }
  }
  return live;
}
OC_NOINLINE void oc_collect(oc_ctx *c) {
  oc_mark_values(c, c->roots, 6);
  oc_mark_value(c, c->exception);
  oc_mark_values(c, c->temps, c->temp_count);
  oc_mark_values(c, c->keep, c->keep_count);
  for (oc_host *h = c->host; h; h = h->next)
    oc_mark_values(c, (const oc_value *)(h + 1), h->values);
  for (oc_frame *f = c->frames; f; f = f->prev)
    oc_mark_values(c, f->values, f->count);
  oc_trace(c);
  size_t live = oc_sweep(c);
  c->collections++;
  c->heap_limit = live > OC_GC_INITIAL_BYTES / 2 ? live * 2 : OC_GC_INITIAL_BYTES;
}
/* Take a cell of one small size from its free list or bump region. */
OC_INLINE void *oc_cell_take(oc_class *k, size_t bytes) {
  oc_free_cell *f = k->free;
  if (OC_LIKELY(f != NULL)) {
    k->free = f->next;
    OC_UNPOISON(f, bytes);
    return f;
  }
  if (OC_LIKELY((size_t)(k->bump_end - k->bump) >= bytes)) {
    void *p = k->bump;
    k->bump += bytes;
    return p;
  }
  return NULL;
}
/* `keep` names values the caller still needs that no root reaches yet. */
OC_NOINLINE void *oc_cell_slow(oc_ctx *c, size_t granules, unsigned kind,
                               const oc_value *keep, size_t keep_count) {
  if (granules > (SIZE_MAX - sizeof(oc_large)) / OC_GRANULE)
    oc_fail(c, "allocation overflow");
  size_t bytes = granules * OC_GRANULE;
  if (!c->erroring) {
    if (c->forbid)
      oc_violated(c, "analysis violation: allocation inside a call classified as unable to collect");
    size_t growth = granules <= OC_SMALL_GRANULES ? OC_BLOCK_BYTES : bytes;
#ifdef OC_GC_STRESS
    int collect = 1;
    (void)growth;
#else
    int collect = c->heap_bytes + growth > c->heap_limit;
#endif
    if (collect) {
      c->keep = keep;
      c->keep_count = keep_count;
      oc_collect(c);
      c->keep = NULL;
      c->keep_count = 0;
    }
  }
  oc_cell *cell;
  if (granules <= OC_SMALL_GRANULES) {
    oc_class *k = &c->classes[granules];
    cell = (oc_cell *)oc_cell_take(k, bytes);
    if (!cell) {
      oc_block *b = (oc_block *)malloc(OC_BLOCK_BYTES);
      if (!b)
        oc_fail(c, "out of memory");
      if (k->blocks)
        k->blocks->used = k->bump;
      b->next = k->blocks;
      k->blocks = b;
      c->heap_bytes += OC_BLOCK_BYTES;
      size_t cells = (OC_BLOCK_BYTES - sizeof(*b)) / bytes;
      k->bump = (char *)(b + 1);
      k->bump_end = k->bump + cells * bytes;
      b->used = k->bump;
      b->end = k->bump_end;
      cell = (oc_cell *)oc_cell_take(k, bytes);
    }
  } else {
    oc_large *m = (oc_large *)malloc(sizeof(*m) + bytes);
    if (!m)
      oc_fail(c, "out of memory");
    m->next = c->large;
    m->bytes = bytes;
    c->large = m;
    c->heap_bytes += bytes;
    cell = (oc_cell *)(m + 1);
  }
  if (c->heap_bytes > c->peak_heap_bytes)
    c->peak_heap_bytes = c->heap_bytes;
  *cell = (oc_cell){.kind = (uint8_t)kind};
  return cell;
}
/* Allocate a cell. The caller initializes every traced field before the next
 * allocation. */
OC_INLINE void *oc_cell_new(oc_ctx *c, size_t bytes, unsigned kind,
                            const oc_value *keep, size_t keep_count) {
  size_t granules = (bytes + OC_GRANULE - 1) / OC_GRANULE;
  c->allocations++;
#ifndef OC_GC_STRESS
  if (OC_LIKELY(granules <= OC_SMALL_GRANULES)) {
    oc_cell *cell =
        (oc_cell *)oc_cell_take(&c->classes[granules], granules * OC_GRANULE);
    if (OC_LIKELY(cell != NULL)) {
      *cell = (oc_cell){.kind = (uint8_t)kind};
      return cell;
    }
  }
#endif
  return oc_cell_slow(c, granules, kind, keep, keep_count);
}
/* Context-lifetime host memory, zero-filled. `values` cells at its start are
 * scanned as roots. */
static void *oc_host_alloc(oc_ctx *c, size_t n, size_t size, int values) {
  if (size && n > (SIZE_MAX - sizeof(oc_host)) / size)
    oc_fail(c, "allocation overflow");
  oc_host *h = (oc_host *)calloc(1, sizeof(*h) + n * size);
  if (!h)
    oc_fail(c, "out of memory");
  h->values = values ? n : 0;
  h->next = c->host;
  c->host = h;
  return h + 1;
}
static inline size_t oc_size(oc_ctx *c, double n) {
  if (OC_UNLIKELY(!(n >= 0 && n < 9007199254740992.0)))
    oc_fail(c, "invalid allocation/index");
  size_t k = (size_t)n;
  if (OC_UNLIKELY((double)k != n))
    oc_fail(c, "invalid allocation/index");
  return k;
}
OC_INLINE int numeric_truth(double x) { return x != 0 && !isnan(x); }
static double *oc_alloc_f64(oc_ctx *c, double n) {
  return (double *)oc_host_alloc(c, oc_size(c, n), sizeof(double), 0);
}
static oc_value *oc_alloc_values(oc_ctx *c, double n) {
  return (oc_value *)oc_host_alloc(c, oc_size(c, n), sizeof(oc_value), 1);
}
OC_INLINE oc_obj *oc_object(oc_ctx *c, oc_value v) {
  if (OC_UNLIKELY(v.tag != OC_OBJECT))
    oc_type_error(c, "object reference required");
  return v.as.object;
}
OC_INLINE oc_value oc_wrap_object(oc_obj *o) {
  return (oc_value){.tag = OC_OBJECT, .as.object = o};
}
static oc_shape *oc_shape_new(oc_ctx *c, oc_shape *parent, size_t key,
                              unsigned flags) {
  size_t bytes = (sizeof(oc_shape) + 15) & ~(size_t)15;
  if (c->shape_room < bytes) {
    size_t room = bytes * 64;
    oc_host *chunk = (oc_host *)malloc(sizeof(*chunk) + room);
    if (!chunk)
      oc_fail(c, "out of memory");
    chunk->next = c->shape_chunks;
    chunk->values = 0;
    c->shape_chunks = chunk;
    c->shape_next = (char *)(chunk + 1);
    c->shape_room = room;
  }
  oc_shape *shape = (oc_shape *)c->shape_next;
  c->shape_next += bytes;
  c->shape_room -= bytes;
  if (parent) {
    if (parent->count == OC_NO_SLOT - 1)
      oc_fail(c, "object has too many properties");
    memcpy(shape->slot, parent->slot, sizeof(shape->slot));
    memcpy(shape->store, parent->store, sizeof(shape->store));
    memcpy(shape->flags, parent->flags, sizeof(shape->flags));
    shape->slot[key] = parent->count;
    shape->store[key] = flags & OC_WRITABLE ? parent->count : OC_NO_SLOT;
    shape->flags[key] = (uint8_t)flags;
    shape->count = (uint16_t)(parent->count + 1);
    shape->sibling = parent->children;
    parent->children = shape;
  } else {
    memset(shape->slot, 0xFF, sizeof(shape->slot));
    memset(shape->store, 0xFF, sizeof(shape->store));
    memset(shape->flags, 0, sizeof(shape->flags));
    shape->count = 0;
    shape->sibling = NULL;
  }
  shape->parent = parent;
  shape->children = NULL;
  shape->id = 0;
  shape->key = (uint32_t)key;
  shape->key_flags = (uint8_t)flags;
  return shape;
}
/* The shape reached from `shape` by adding property `key` with `flags`. */
static oc_shape *oc_shape_with(oc_ctx *c, oc_shape *shape, size_t key,
                               unsigned flags) {
  for (oc_shape *child = shape->children; child; child = child->sibling)
    if (child->key == key && child->key_flags == flags)
      return child;
  return oc_shape_new(c, shape, key, flags);
}
/* The shape with the same properties in the same slots as `shape`, except
 * that `key` has `flags`. */
static oc_shape *oc_shape_reflag(oc_ctx *c, oc_shape *shape, size_t key,
                                 unsigned flags) {
  if (!shape->parent)
    return shape;
  oc_shape *below = oc_shape_reflag(c, shape->parent, key, flags);
  return oc_shape_with(c, below, shape->key,
                       shape->key == key ? flags : shape->key_flags);
}
/* Allocate an object cell of the given kind with `inside` inline slots. */
static oc_obj *oc_object_cell(oc_ctx *c, oc_value prototype, size_t bytes,
                              unsigned kind, size_t inside) {
  if (prototype.tag != OC_NULL && prototype.tag != OC_OBJECT)
    oc_fail(c, "invalid prototype");
  oc_obj *o = (oc_obj *)oc_cell_new(c, bytes, OC_CELL_OBJECT, &prototype, 1);
  o->cell.object_kind = (uint8_t)kind;
  o->cell.inline_slots = (uint8_t)inside;
  o->shape = c->empty_shape;
  o->proto = prototype.tag == OC_OBJECT ? prototype.as.object : NULL;
  o->more = NULL;
  o->indices = NULL;
  c->object_allocations++;
  return o;
}
/* A plain object. `slots` is how many properties it is expected to acquire;
 * that many (up to a limit) are stored inline, the rest in side storage. */
static oc_value oc_new_object(oc_ctx *c, oc_value prototype, double slots) {
  size_t inside = oc_size(c, slots);
  if (inside > OC_INLINE_SLOT_LIMIT)
    inside = OC_INLINE_SLOT_LIMIT;
  return oc_wrap_object(oc_object_cell(
      c, prototype, sizeof(oc_plain) + inside * sizeof(oc_value), 0, inside));
}
/* The object, array and function root prototypes exist from context creation,
 * so naming one never allocates. */
static oc_ctx *oc_context_new(void) {
  oc_ctx *c = (oc_ctx *)calloc(1, sizeof(oc_ctx));
  if (!c)
    return NULL;
  c->heap_limit = OC_GC_INITIAL_BYTES;
  c->empty_shape = oc_shape_new(c, NULL, 0, 0);
  c->empty_shape->id = 1;
  c->roots[0] = oc_new_object(c, oc_null(), 0);
  c->roots[1] = oc_new_object(c, c->roots[0], 0);
  c->roots[2] = oc_new_object(c, c->roots[0], 0);
  c->roots[3] = oc_new_object(c, c->roots[0], 0);
  c->roots[4] = oc_new_object(c, c->roots[0], 0);
  c->roots[5] = oc_new_object(c, c->roots[0], 0);
  return c;
}
OC_INLINE oc_value oc_root_proto(oc_ctx *c, double kind) {
  if (OC_UNLIKELY(!(kind >= 0 && kind <= 5 && kind == (double)(int)kind)))
    oc_fail(c, "invalid root prototype");
  return c->roots[(size_t)kind];
}
static uint32_t oc_length(oc_ctx *c, double n) {
  if (!isfinite(n) || n < 0 || n > 4294967295.0 || floor(n) != n)
    oc_range_error(c, "invalid array length");
  return (uint32_t)n;
}
OC_NOINLINE uint32_t oc_index_fail(oc_ctx *c) {
  oc_fail(c, "array index outside intrinsic contract");
  return 0;
}
OC_INLINE uint32_t oc_index(oc_ctx *c, double n) {
  if (OC_LIKELY(n >= 0 && n < 4294967295.0)) {
    uint32_t i = (uint32_t)n;
    if (OC_LIKELY((double)i == n))
      return i;
  }
  return oc_index_fail(c);
}
static void oc_grow_elements(oc_ctx *c, oc_array *a, size_t n) {
  if (n <= a->element_capacity)
    return;
  size_t k = a->element_capacity ? a->element_capacity : 8;
  while (k < n) {
    if (k > SIZE_MAX / 2)
      oc_fail(c, "array capacity overflow");
    k *= 2;
  }
  if (k > (SIZE_MAX - sizeof(oc_owned)) / sizeof(oc_value))
    oc_fail(c, "array capacity overflow");
  oc_value *v =
      (oc_value *)oc_owned_resize(c, a->elements, k * sizeof(oc_value));
  for (size_t i = a->element_capacity; i < k; i++)
    v[i].tag = OC_ABSENT;
  a->elements = v;
  a->element_capacity = k;
}
static oc_value oc_new_array(oc_ctx *c, double n) {
  uint32_t len = oc_length(c, n);
  oc_array *a =
      (oc_array *)oc_object_cell(c, c->roots[1], sizeof(oc_array), 1, 0);
  a->length = len;
  a->element_capacity = 0;
  a->elements = NULL;
  if (len)
    oc_grow_elements(c, a, len);
  return oc_wrap_object(&a->object);
}
OC_NOINLINE double oc_number_fail(oc_ctx *c) {
  oc_fail(c, "numeric value required");
  return 0;
}
OC_INLINE double oc_number(oc_ctx *c, oc_value v) {
  if (OC_UNLIKELY(v.tag != OC_NUMBER))
    return oc_number_fail(c);
  return v.as.number;
}
/* The storage of slot number `s`, which the object's shape has assigned. */
OC_INLINE oc_value *oc_slot(oc_obj *o, size_t s) {
  size_t inside = o->cell.inline_slots;
  return OC_LIKELY(s < inside) ? &OC_SLOTS(o)[s] : &o->more[s - inside];
}
OC_NOINLINE oc_value oc_get_chain(oc_ctx *c, oc_obj *o, size_t key) {
  for (size_t depth = 0; o; depth++) {
    if (depth >= 10000)
      oc_fail(c, "prototype chain limit");
    if (o->cell.object_kind == 1 && key == 0)
      return oc_num(OC_ARRAY(o)->length);
    if (key < OC_ATOMS && o->shape->slot[key] != OC_NO_SLOT)
      return *oc_slot(o, o->shape->slot[key]);
    o = o->proto;
  }
  return oc_undef();
}
OC_NOINLINE oc_value oc_get_fail(oc_ctx *c) {
  oc_type_error(c, "object reference required");
  return oc_undef();
}
/* A named load from a value that is not an object. A string, number or
 * boolean reads through its root prototype (a string also has `length`);
 * null and undefined have no properties. */
OC_NOINLINE oc_value oc_get_primitive(oc_ctx *c, oc_value v, size_t key) {
  size_t root;
  switch (v.tag) {
  case OC_STRING:
    if (key == 0)
      return oc_num((double)v.as.string->length);
    root = 3;
    break;
  case OC_NUMBER:
    root = 4;
    break;
  case OC_BOOL:
    root = 5;
    break;
  default:
    return oc_get_fail(c);
  }
  return oc_get_chain(c, c->roots[root].as.object, key);
}
/* Named load. With a literal atom the own and first-prototype probes are a
 * shape lookup each; deeper chains and dynamic atoms take the general walk. */
OC_INLINE oc_value oc_get(oc_ctx *c, oc_value v, double atom) {
  size_t key = oc_size(c, atom);
  if (OC_UNLIKELY(v.tag != OC_OBJECT))
    return oc_get_fail(c);
  oc_obj *o = v.as.object;
  if (key >= OC_ATOMS || key == 0)
    return oc_get_chain(c, o, key);
  size_t s = o->shape->slot[key];
  if (OC_LIKELY(s != OC_NO_SLOT))
    return *oc_slot(o, s);
  o = o->proto;
  if (OC_LIKELY(o != NULL)) {
    s = o->shape->slot[key];
    if (OC_LIKELY(s != OC_NO_SLOT))
      return *oc_slot(o, s);
  }
  return oc_get_chain(c, o, key);
}
/* Named load whose base, when it is an object, is proved to own the property.
 * Compiling with OC_VERIFY_PROOFS checks the proof instead of trusting it. */
OC_INLINE oc_value oc_get_own(oc_ctx *c, oc_value v, double atom) {
  size_t key = oc_size(c, atom);
  if (OC_UNLIKELY(v.tag != OC_OBJECT))
    return oc_get_fail(c);
  oc_obj *o = v.as.object;
  if (key >= OC_ATOMS || key == 0)
    return oc_get_chain(c, o, key);
#ifdef OC_VERIFY_PROOFS
  if (o->shape->slot[key] == OC_NO_SLOT)
    oc_violated(c, "analysis violation: property proved own is absent");
#endif
  return *oc_slot(o, o->shape->slot[key]);
}
/* As oc_get_own, where the property is also proved to be inline slot `slot`
 * of every object the base can be: one fixed-offset load. */
OC_INLINE oc_value oc_get_slot(oc_ctx *c, oc_value v, double atom,
                               double slot) {
  if (OC_UNLIKELY(v.tag != OC_OBJECT))
    return oc_get_fail(c);
  oc_obj *o = v.as.object;
  size_t s = (size_t)slot;
#ifdef OC_VERIFY_PROOFS
  size_t key = oc_size(c, atom);
  if (key == 0 || key >= OC_ATOMS || o->shape->slot[key] != s ||
      s >= o->cell.inline_slots)
    oc_violated(c, "analysis violation: property is not at its proved slot");
#else
  (void)atom;
#endif
  return OC_SLOTS(o)[s];
}
/* The id of the value's shape if it is one the specializer declared, or 0. */
OC_INLINE double oc_shape_id(oc_value v) {
  return v.tag == OC_OBJECT ? (double)v.as.object->shape->id : 0.0;
}
/* Declare a static shape: the one reached from static shape `parent` by
 * adding property `atom` with the attributes assignment gives. Id 1 is the
 * empty shape. Generated code declares every shape it was specialized for
 * before any guest code runs, parents first. */
static oc_value oc_shape_declare(oc_ctx *c, double id, double parent,
                                 double atom) {
  size_t n = oc_size(c, id), p = oc_size(c, parent), key = oc_size(c, atom);
  oc_shape *from = p == 1 ? c->empty_shape
                   : p < c->static_shape_count ? c->static_shapes[p]
                   : NULL;
  if (n < 2 || !from || key == 0 || key >= OC_ATOMS)
    oc_fail(c, "invalid static shape declaration");
  if (n >= c->static_shape_count) {
    size_t count = n + 1;
    oc_shape **table =
        (oc_shape **)realloc(c->static_shapes, count * sizeof(*table));
    if (!table)
      oc_fail(c, "out of memory");
    for (size_t i = c->static_shape_count; i < count; i++)
      table[i] = NULL;
    c->static_shapes = table;
    c->static_shape_count = count;
  }
  oc_shape *shape = oc_shape_with(c, from, key, OC_ASSIGNED);
  if (shape->id != 0 && shape->id != n)
    oc_fail(c, "static shape declared twice with different ids");
  shape->id = (uint32_t)n;
  c->static_shapes[n] = shape;
  return oc_undef();
}
/* Load of a property the specializer followed the object's shape to: the
 * object has at least the keys of a static shape that puts `atom` at `slot`.
 * Keys are only added and never move, so that is where it is. */
OC_INLINE oc_value oc_get_at(oc_ctx *c, oc_value v, double atom, double slot) {
  oc_obj *o = v.as.object;
  size_t s = (size_t)slot;
#ifdef OC_VERIFY_PROOFS
  size_t key = oc_size(c, atom);
  if (v.tag != OC_OBJECT || key == 0 || key >= OC_ATOMS ||
      o->shape->slot[key] != s)
    oc_violated(c, "shape violation: property is not at its followed slot");
#else
  (void)c;
  (void)atom;
#endif
  return *oc_slot(o, s);
}
/* The failure of a named lookup on a non-object, without the lookup. */
OC_INLINE oc_value oc_require_object(oc_ctx *c, oc_value v) {
  if (OC_UNLIKELY(v.tag != OC_OBJECT))
    return oc_get_fail(c);
  return v;
}
/* Give the object a new property and return its slot. Grows side storage
 * the object owns; does not collect. */
static size_t oc_add_slot(oc_ctx *c, oc_obj *o, size_t key, unsigned flags) {
  oc_shape *next = oc_shape_with(c, o->shape, key, flags);
  size_t s = o->shape->count;
  size_t inside = o->cell.inline_slots;
  if (s >= inside && s - inside >= o->cell.more_slots) {
    size_t k = o->cell.more_slots ? (size_t)o->cell.more_slots * 2 : 4;
    if (k > UINT16_MAX)
      k = UINT16_MAX;
    o->more = (oc_value *)oc_owned_resize(c, o->more, k * sizeof(oc_value));
    o->cell.more_slots = (uint16_t)k;
  }
  o->shape = next;
  return s;
}
/* Named store that may add the property or set an array's length. Adding
 * grows side storage the object owns; it does not collect. */
OC_NOINLINE oc_value oc_set_slow(oc_ctx *c, oc_value v, size_t key,
                                 oc_value x) {
  oc_obj *o = oc_object(c, v);
  if (o->cell.object_kind == 1 && key == 0) {
    oc_array *a = OC_ARRAY(o);
    uint32_t n = oc_length(c, oc_number(c, x));
    size_t end =
        a->length < a->element_capacity ? a->length : a->element_capacity;
    for (size_t i = n; i < end; i++)
      a->elements[i].tag = OC_ABSENT;
    a->length = n;
    return x;
  }
  if (key >= OC_ATOMS)
    oc_fail(c, "property atom outside the static property-atom table");
  size_t s = o->shape->slot[key];
  if (s != OC_NO_SLOT) {
    /* The fast path found no writable slot although the property exists. */
    oc_type_error(c, "Cannot assign to read only property");
  }
  if (c->guarded[key]) {
    /* Assignment cannot shadow an inherited non-writable property. */
    size_t depth = 0;
    for (oc_obj *p = o->proto; p; p = p->proto) {
      if (++depth > 10000)
        oc_fail(c, "prototype chain limit");
      if (p->shape->slot[key] != OC_NO_SLOT) {
        if (!(p->shape->flags[key] & OC_WRITABLE))
          oc_type_error(c, "Cannot assign to read only property");
        break;
      }
    }
  }
  s = oc_add_slot(c, o, key, OC_ASSIGNED);
  *oc_slot(o, s) = x;
  return x;
}
OC_INLINE oc_value oc_set(oc_ctx *c, oc_value v, double atom, oc_value x) {
  size_t key = oc_size(c, atom);
  if (OC_LIKELY(v.tag == OC_OBJECT && key < OC_ATOMS && key != 0)) {
    oc_obj *o = v.as.object;
    size_t s = o->shape->store[key];
    if (OC_LIKELY(s != OC_NO_SLOT)) {
      *oc_slot(o, s) = x;
      return x;
    }
  }
  return oc_set_slow(c, v, key, x);
}
/* Named store to a property the base is proved to own already. */
OC_INLINE oc_value oc_set_own(oc_ctx *c, oc_value v, double atom, oc_value x) {
  size_t key = oc_size(c, atom);
  if (OC_UNLIKELY(v.tag != OC_OBJECT || key >= OC_ATOMS || key == 0))
    return oc_set_slow(c, v, key, x);
  oc_obj *o = v.as.object;
#ifdef OC_VERIFY_PROOFS
  if (o->shape->store[key] == OC_NO_SLOT)
    oc_violated(c, "analysis violation: stored property proved own is absent or not writable");
#endif
  *oc_slot(o, o->shape->slot[key]) = x;
  return x;
}
/* As oc_set_own, at a proved inline slot: one fixed-offset store. */
OC_INLINE oc_value oc_set_slot(oc_ctx *c, oc_value v, double atom, double slot,
                               oc_value x) {
  if (OC_UNLIKELY(v.tag != OC_OBJECT))
    return oc_set_slow(c, v, oc_size(c, atom), x);
  oc_obj *o = v.as.object;
  size_t s = (size_t)slot;
#ifdef OC_VERIFY_PROOFS
  size_t key = oc_size(c, atom);
  if (key == 0 || key >= OC_ATOMS || o->shape->store[key] != s ||
      s >= o->cell.inline_slots)
    oc_violated(c, "analysis violation: stored property is not at its proved writable slot");
#endif
  OC_SLOTS(o)[s] = x;
  return x;
}
/* Store to a property of an object that has exactly a static shape putting
 * `atom` at `slot`; every property of a static shape is writable. */
OC_INLINE oc_value oc_set_at(oc_ctx *c, oc_value v, double atom, double slot,
                             oc_value x) {
  oc_obj *o = v.as.object;
  size_t s = (size_t)slot;
#ifdef OC_VERIFY_PROOFS
  size_t key = oc_size(c, atom);
  if (v.tag != OC_OBJECT || key == 0 || key >= OC_ATOMS ||
      o->shape->store[key] != s)
    oc_violated(c, "shape violation: stored property is not at its followed writable slot");
#else
  (void)c;
  (void)atom;
#endif
  *oc_slot(o, s) = x;
  return x;
}
/* Add property `atom` to an object that has exactly a static shape lacking
 * it; `slot` is where the next static shape puts it. An inherited property
 * that forbids the assignment is found by the ordinary store, which throws. */
OC_INLINE oc_value oc_add_known(oc_ctx *c, oc_value v, double atom,
                                double slot, oc_value x) {
  size_t key = oc_size(c, atom);
  if (OC_UNLIKELY(v.tag != OC_OBJECT || key == 0 || key >= OC_ATOMS ||
                  c->guarded[key]))
    return oc_set_slow(c, v, key, x);
  oc_obj *o = v.as.object;
#ifdef OC_VERIFY_PROOFS
  if (o->shape->slot[key] != OC_NO_SLOT || o->shape->count != (size_t)slot)
    oc_violated(c, "shape violation: added property is present or not at its followed slot");
#else
  (void)slot;
#endif
  size_t s = oc_add_slot(c, o, key, OC_ASSIGNED);
  *oc_slot(o, s) = x;
  return x;
}
static double oc_has_own(oc_ctx *c, oc_value v, double atom) {
  oc_obj *o = oc_object(c, v);
  size_t k = oc_size(c, atom);
  return (o->cell.object_kind == 1 && k == 0) ||
         (k < OC_ATOMS && o->shape->slot[k] != OC_NO_SLOT);
}
static oc_value oc_proto(oc_ctx *c, oc_value v) {
  oc_obj *p = oc_object(c, v)->proto;
  return p ? oc_wrap_object(p) : oc_null();
}
OC_NOINLINE oc_array *oc_array_fail(oc_ctx *c, oc_value v) {
  oc_object(c, v);
  oc_fail(c, "array required");
  return NULL;
}
OC_INLINE oc_array *oc_array_of(oc_ctx *c, oc_value v) {
  if (OC_UNLIKELY(v.tag != OC_OBJECT || v.as.object->cell.object_kind != 1))
    return oc_array_fail(c, v);
  return OC_ARRAY(v.as.object);
}
OC_NOINLINE oc_value oc_get_index_slow(oc_ctx *c, oc_value v, uint32_t i) {
  oc_array *a = oc_array_of(c, v);
  if (i < a->length && i < a->element_capacity &&
      a->elements[i].tag != OC_ABSENT)
    return a->elements[i];
  oc_obj *o = a->object.proto;
  for (size_t depth = 0; o; depth++) {
    if (depth >= 10000)
      oc_fail(c, "prototype chain limit");
    for (oc_index_prop *p = o->indices; p; p = p->next)
      if (p->key == i)
        return p->value;
    o = o->proto;
  }
  return oc_undef();
}
OC_INLINE oc_value oc_get_index(oc_ctx *c, oc_value v, double index) {
  uint32_t i = oc_index(c, index);
  if (OC_LIKELY(v.tag == OC_OBJECT && v.as.object->cell.object_kind == 1)) {
    oc_array *a = OC_ARRAY(v.as.object);
    if (OC_LIKELY(i < a->length && i < a->element_capacity &&
                  a->elements[i].tag != OC_ABSENT))
      return a->elements[i];
  }
  return oc_get_index_slow(c, v, i);
}
OC_NOINLINE oc_value oc_set_index_slow(oc_ctx *c, oc_value v, uint32_t i,
                                       oc_value x) {
  oc_array *a = oc_array_of(c, v);
  oc_grow_elements(c, a, (size_t)i + 1);
  a->elements[i] = x;
  if (i >= a->length)
    a->length = i + 1;
  return x;
}
OC_INLINE oc_value oc_set_index(oc_ctx *c, oc_value v, double index,
                                oc_value x) {
  /* The array test precedes index validation, as in the reference. */
  oc_array *a = oc_array_of(c, v);
  uint32_t i = oc_index(c, index);
  if (OC_LIKELY(i < a->length && i < a->element_capacity)) {
    a->elements[i] = x;
    return x;
  }
  return oc_set_index_slow(c, v, i, x);
}
static double oc_has_index(oc_ctx *c, oc_value v, double index) {
  oc_object(c, v);
  uint32_t i = oc_index(c, index);
  oc_array *a = oc_array_of(c, v);
  return i < a->length && i < a->element_capacity &&
         a->elements[i].tag != OC_ABSENT;
}
static oc_value oc_set_proto_index(oc_ctx *c, oc_value v, double index,
                                   oc_value x) {
  oc_obj *o = oc_object(c, v);
  uint32_t i = oc_index(c, index);
  for (oc_index_prop *p = o->indices; p; p = p->next)
    if (p->key == i) {
      p->value = x;
      return x;
    }
  oc_value keep[2] = {v, x};
  oc_index_prop *p =
      (oc_index_prop *)oc_cell_new(c, sizeof(*p), OC_CELL_INDEX, keep, 2);
  p->key = i;
  p->value = x;
  p->next = o->indices;
  o->indices = p;
  return x;
}
OC_NOINLINE oc_scope *oc_scope_fail(oc_ctx *c) {
  oc_fail(c, "environment required");
  return NULL;
}
OC_INLINE oc_scope *oc_scope_of(oc_ctx *c, oc_value v) {
  if (OC_UNLIKELY(v.tag != OC_SCOPE))
    return oc_scope_fail(c);
  return v.as.scope;
}
OC_INLINE oc_value oc_wrap_scope(oc_scope *e) {
  return e ? (oc_value){.tag = OC_SCOPE, .as.scope = e} : oc_null();
}
/* The enclosing scope of a new environment or function: a scope or null. */
OC_INLINE oc_scope *oc_scope_or_null(oc_ctx *c, oc_value v) {
  return v.tag == OC_NULL ? NULL : oc_scope_of(c, v);
}
static oc_value oc_scope_new(oc_ctx *c, oc_value parent, double slots,
                             oc_value receiver) {
  size_t n = oc_size(c, slots);
  oc_scope *up = oc_scope_or_null(c, parent);
  if (n > (SIZE_MAX - sizeof(oc_scope)) / sizeof(oc_value))
    oc_fail(c, "allocation overflow");
  oc_value keep[2] = {parent, receiver};
  oc_scope *e = (oc_scope *)oc_cell_new(
      c, sizeof(*e) + n * sizeof(oc_value), OC_CELL_SCOPE, keep, 2);
  e->parent = up;
  e->receiver = receiver;
  e->count = n;
  memset(e->slots, 0, n * sizeof(oc_value));
  return oc_wrap_scope(e);
}
static oc_value oc_scope_copy(oc_ctx *c, oc_value scope) {
  oc_scope *from = oc_scope_of(c, scope);
  oc_scope *e = (oc_scope *)oc_cell_new(
      c, sizeof(*e) + from->count * sizeof(oc_value), OC_CELL_SCOPE, &scope, 1);
  e->parent = from->parent;
  e->receiver = from->receiver;
  e->count = from->count;
  memcpy(e->slots, from->slots, from->count * sizeof(oc_value));
  return oc_wrap_scope(e);
}
OC_INLINE oc_value oc_scope_parent(oc_ctx *c, oc_value scope) {
  return oc_wrap_scope(oc_scope_of(c, scope)->parent);
}
OC_INLINE oc_value oc_scope_receiver(oc_ctx *c, oc_value scope) {
  return oc_scope_of(c, scope)->receiver;
}
OC_NOINLINE oc_value oc_scope_slot_fail(oc_ctx *c) {
  oc_fail(c, "environment slot out of bounds");
  return oc_undef();
}
OC_INLINE oc_value oc_scope_get(oc_ctx *c, oc_value scope, double slot) {
  oc_scope *e = oc_scope_of(c, scope);
  size_t i = oc_size(c, slot);
  if (OC_UNLIKELY(i >= e->count))
    return oc_scope_slot_fail(c);
  return e->slots[i];
}
OC_INLINE oc_value oc_scope_set(oc_ctx *c, oc_value scope, double slot,
                                oc_value x) {
  oc_scope *e = oc_scope_of(c, scope);
  size_t i = oc_size(c, slot);
  if (OC_UNLIKELY(i >= e->count))
    return oc_scope_slot_fail(c);
  e->slots[i] = x;
  return x;
}
static oc_function *oc_function_cell(oc_ctx *c, double code, oc_value env,
                                     int constructible, double slots) {
  oc_scope_or_null(c, env);
  size_t inside = oc_size(c, slots);
  oc_protect(c, env);
  oc_function *f = (oc_function *)oc_object_cell(
      c, c->roots[2], sizeof(oc_function), 2, OC_FUNCTION_SLOTS);
  oc_unprotect(c, 1);
  f->object.cell.constructible = (uint8_t)constructible;
  f->code = code;
  f->env = env;
  f->instance_slots =
      (uint16_t)(inside > OC_INLINE_SLOT_LIMIT ? OC_INLINE_SLOT_LIMIT : inside);
  return f;
}
/* An ordinary function, with its `prototype` object. `slots` is how many
 * properties its body assigns on `this`, used to size what it constructs;
 * `prototype_slots` sizes the prototype object. */
static oc_value oc_new_function(oc_ctx *c, double code, oc_value env,
                                double slots, double prototype_slots) {
  oc_value f =
      oc_wrap_object(&oc_function_cell(c, code, env, 1, slots)->object);
  oc_protect(c, f);
  oc_value p = oc_new_object(c, oc_root_proto(c, 0), prototype_slots);
  oc_unprotect(c, 1);
  oc_set(c, f, 1, p);
  oc_set(c, p, 2, f);
  return f;
}
static oc_value oc_new_arrow(oc_ctx *c, double code, oc_value env) {
  return oc_wrap_object(&oc_function_cell(c, code, env, 0, 0)->object);
}
static oc_value oc_construct_receiver(oc_ctx *c, oc_value f) {
  oc_obj *o = oc_object(c, f);
  if (o->cell.object_kind != 2 || !o->cell.constructible)
    oc_type_error(c, "function is not a constructor");
  oc_value proto = oc_get(c, f, 1);
  if (proto.tag != OC_OBJECT)
    proto = oc_root_proto(c, 0);
  return oc_new_object(c, proto, OC_FUNCTION(o)->instance_slots);
}
OC_NOINLINE double oc_callable_fail(oc_ctx *c, oc_value f) {
  oc_object(c, f);
  oc_type_error(c, "callable required");
  return 0;
}
OC_NOINLINE oc_value oc_callable_env_fail(oc_ctx *c, oc_value f) {
  oc_callable_fail(c, f);
  return oc_undef();
}
OC_INLINE double oc_function_code(oc_ctx *c, oc_value f) {
  if (OC_UNLIKELY(f.tag != OC_OBJECT || f.as.object->cell.object_kind != 2))
    return oc_callable_fail(c, f);
  return OC_FUNCTION(f.as.object)->code;
}
OC_INLINE oc_value oc_function_env(oc_ctx *c, oc_value f) {
  if (OC_UNLIKELY(f.tag != OC_OBJECT || f.as.object->cell.object_kind != 2))
    return oc_callable_env_fail(c, f);
  return OC_FUNCTION(f.as.object)->env;
}
/* A new string of `n` code units, to be filled by the caller. */
static oc_string *oc_string_new(oc_ctx *c, size_t n) {
  if (n > (SIZE_MAX - sizeof(oc_string)) / sizeof(uint16_t))
    oc_fail(c, "string length overflow");
  oc_string *s = (oc_string *)oc_cell_new(
      c, sizeof(*s) + n * sizeof(uint16_t), OC_CELL_STRING, NULL, 0);
  s->length = n;
  return s;
}
OC_INLINE oc_value oc_wrap_string(oc_string *s) {
  return (oc_value){.tag = OC_STRING, .as.string = s};
}
OC_INLINE double oc_truth(oc_value v) {
  switch (v.tag) {
  case OC_UNDEF:
  case OC_NULL:
    return 0;
  case OC_BOOL:
    return v.as.boolean ? 1.0 : 0.0;
  case OC_NUMBER:
    return numeric_truth(v.as.number);
  case OC_OBJECT:
    return 1;
  case OC_STRING:
    return v.as.string->length != 0;
  case OC_ABSENT:
  case OC_SCOPE:
    break;
  }
  return 0;
}
OC_INLINE double oc_nullish(oc_value v) {
  return v.tag == OC_UNDEF || v.tag == OC_NULL;
}
static int oc_string_compare(oc_string *a, oc_string *b) {
  size_t n = a->length < b->length ? a->length : b->length;
  for (size_t i = 0; i < n; i++)
    if (a->units[i] != b->units[i])
      return a->units[i] < b->units[i] ? -1 : 1;
  return a->length < b->length ? -1 : a->length > b->length ? 1 : 0;
}
static inline double oc_strict_eq(oc_value a, oc_value b) {
  if (a.tag != b.tag)
    return 0;
  switch (a.tag) {
  case OC_UNDEF:
  case OC_NULL:
    return 1;
  case OC_BOOL:
    return a.as.boolean == b.as.boolean;
  case OC_NUMBER:
    return a.as.number == b.as.number;
  case OC_OBJECT:
    return a.as.object == b.as.object;
  case OC_STRING:
    return oc_string_compare(a.as.string, b.as.string) == 0;
  case OC_ABSENT:
  case OC_SCOPE:
    break;
  }
  return 0;
}
/* Safe ECMAScript wrapping; no out-of-range floating-to-integer conversion,
 * signed overflow, negative signed shift, or shift count >=32. */
OC_INLINE uint32_t oc_u32(double n) {
#if defined(__ARM_FEATURE_JCVT)
  /* The architecture's ECMAScript ToInt32 conversion, exact for every double.
   * A compile-time constant takes the portable path so it folds. */
  if (!__builtin_constant_p(n))
    return (uint32_t)__jcvt(n);
#endif
  /* In int32 range, C truncation is exactly ToInt32 and wraps to ToUint32. */
  if (OC_LIKELY(n >= -2147483648.0 && n <= 2147483647.0))
    return (uint32_t)(int32_t)n;
  if (!isfinite(n) || n == 0)
    return 0;
  double t = fmod(trunc(n), 4294967296.0);
  if (t < 0)
    t += 4294967296.0;
  return (uint32_t)t;
}
OC_INLINE double oc_i32(uint32_t u) { return (double)(int32_t)u; }
static int oc_space(uint16_t x) {
  return x == 9 || x == 10 || x == 11 || x == 12 || x == 13 || x == 32 ||
         x == 0xA0 || x == 0x1680 || (x >= 0x2000 && x <= 0x200A) ||
         x == 0x2028 || x == 0x2029 || x == 0x202F || x == 0x205F ||
         x == 0x3000 || x == 0xFEFF;
}
static double oc_parse_number(const uint16_t *, size_t, char *);
static double oc_to_number(oc_ctx *c, oc_value v) {
  switch (v.tag) {
  case OC_UNDEF:
    return NAN;
  case OC_NULL:
    return 0;
  case OC_BOOL:
    return v.as.boolean;
  case OC_NUMBER:
    return v.as.number;
  case OC_OBJECT:
    oc_fail(c, "object coercion requires guest lowering");
    return NAN;
  case OC_STRING:
    break;
  case OC_ABSENT:
  case OC_SCOPE:
    oc_fail(c, "absent marker escaped object storage");
    return NAN;
  }
  oc_string *s = v.as.string;
  size_t a = 0, b = s->length;
  while (a < b && oc_space(s->units[a]))
    a++;
  while (b > a && oc_space(s->units[b - 1]))
    b--;
  if (a == b)
    return 0;
  char fixed[128];
  char *text = b - a < sizeof(fixed) ? fixed : (char *)malloc(b - a + 1);
  if (!text)
    oc_fail(c, "out of memory");
  double result = oc_parse_number(s->units + a, b - a, text);
  if (text != fixed)
    free(text);
  return result;
}
/* StringToNumber on trimmed code units; `text` has room for them and a NUL. */
static double oc_parse_number(const uint16_t *units, size_t count, char *text) {
  for (size_t i = 0; i < count; i++) {
    // UTF-16 NUL is not numeric whitespace. Do not let a C terminator
    // truncate the string before grammar validation or strtod.
    if (units[i] == 0 || units[i] > 127)
      return NAN;
    text[i] = (char)units[i];
  }
  text[count] = 0;
  if (!strcmp(text, "Infinity") || !strcmp(text, "+Infinity"))
    return INFINITY;
  if (!strcmp(text, "-Infinity"))
    return -INFINITY;
  if (strstr(text, "inf") || strstr(text, "Inf") || strstr(text, "nan") ||
      strstr(text, "NaN"))
    return NAN;
  if (text[0] == '0' &&
      (text[1] == 'b' || text[1] == 'B' || text[1] == 'o' || text[1] == 'O')) {
    int base = (text[1] == 'b' || text[1] == 'B') ? 2 : 8;
    double x = 0;
    if (!text[2])
      return NAN;
    for (size_t i = 2; text[i]; i++) {
      if (text[i] < '0' || text[i] >= '0' + base)
        return NAN;
      x = x * base + (text[i] - '0');
    }
    return x;
  }
  if ((text[0] == '+' || text[0] == '-') && text[1] == '0' &&
      (text[2] == 'x' || text[2] == 'X'))
    return NAN;
  if (text[0] == '0' && (text[1] == 'x' || text[1] == 'X')) {
    if (!text[2])
      return NAN;
    for (size_t i = 2; text[i]; i++)
      if (!((text[i] >= '0' && text[i] <= '9') ||
            (text[i] >= 'a' && text[i] <= 'f') ||
            (text[i] >= 'A' && text[i] <= 'F')))
        return NAN;
  } else {
    for (size_t i = 0; text[i]; i++)
      if (!((text[i] >= '0' && text[i] <= '9') || text[i] == '+' ||
            text[i] == '-' || text[i] == '.' || text[i] == 'e' ||
            text[i] == 'E'))
        return NAN;
  }
  char *end;
  double n = strtod(text, &end);
  return end != text && !*end ? n : NAN;
}
static inline double oc_loose_eq(oc_ctx *c, oc_value a, oc_value b) {
  if (a.tag == b.tag)
    return oc_strict_eq(a, b);
  if (oc_nullish(a) || oc_nullish(b))
    return oc_nullish(a) && oc_nullish(b);
  if (a.tag == OC_OBJECT || b.tag == OC_OBJECT)
    oc_fail(c, "object coercion requires guest lowering");
  return oc_to_number(c, a) == oc_to_number(c, b);
}
/* ---- Runtime property names ----
 * A property name computed at run time is usable only if it is one of the
 * program's static atoms. Their spellings are a table the generated program
 * defines; an entry is NULL when the program registered no name for it. */
static oc_string *oc_atom_names[OC_ATOMS];
static size_t oc_string_hash(const oc_string *s) {
  size_t h = 1469598103934665603u;
  for (size_t i = 0; i < s->length; i++)
    h = (h ^ s->units[i]) * 1099511628211u;
  return h;
}
/* The atom spelled `name`, or SIZE_MAX. */
static size_t oc_name_atom(oc_ctx *c, oc_string *name) {
  if (!c->atom_index) {
    size_t size = 16;
    while (size < (size_t)OC_ATOMS * 2)
      size *= 2;
    c->atom_index = (uint16_t *)malloc(size * sizeof(uint16_t));
    if (!c->atom_index)
      oc_fail(c, "out of memory");
    memset(c->atom_index, 0xFF, size * sizeof(uint16_t));
    c->atom_index_size = size;
    /* Atom 0 is an array's `length`, which has its own access path. */
    for (size_t atom = 1; atom < OC_ATOMS; atom++) {
      if (!oc_atom_names[atom])
        continue;
      size_t at = oc_string_hash(oc_atom_names[atom]) & (size - 1);
      while (c->atom_index[at] != UINT16_MAX)
        at = (at + 1) & (size - 1);
      c->atom_index[at] = (uint16_t)atom;
    }
  }
  size_t mask = c->atom_index_size - 1;
  for (size_t at = oc_string_hash(name) & mask; c->atom_index[at] != UINT16_MAX;
       at = (at + 1) & mask) {
    size_t atom = c->atom_index[at];
    if (oc_string_compare(oc_atom_names[atom], name) == 0)
      return atom;
  }
  return SIZE_MAX;
}
static int oc_is_length_name(const oc_string *s) {
  static const uint16_t length[] = {'l', 'e', 'n', 'g', 't', 'h'};
  return s->length == 6 && !memcmp(s->units, length, sizeof(length));
}
OC_NOINLINE oc_value oc_key_fail(oc_ctx *c) {
  oc_fail(c, "property key must be a number or a string");
  return oc_undef();
}
/* base[key] where the key is not proved to be an array index. A number key
 * is the same inline indexed access as a proved one. */
OC_NOINLINE oc_value oc_keyed_get_name(oc_ctx *c, oc_value base, oc_value key) {
  if (key.tag != OC_STRING)
    return oc_key_fail(c);
  if (oc_is_length_name(key.as.string))
    return oc_get(c, base, 0);
  size_t atom = oc_name_atom(c, key.as.string);
  /* No object can have a property outside the atom table. */
  if (atom == SIZE_MAX)
    return oc_object(c, base), oc_undef();
  return oc_get(c, base, (double)atom);
}
OC_INLINE oc_value oc_keyed_get(oc_ctx *c, oc_value base, oc_value key) {
  if (OC_LIKELY(key.tag == OC_NUMBER))
    return oc_get_index(c, base, key.as.number);
  return oc_keyed_get_name(c, base, key);
}
OC_NOINLINE oc_value oc_keyed_set_name(oc_ctx *c, oc_value base, oc_value key,
                                       oc_value x) {
  if (key.tag != OC_STRING)
    return oc_key_fail(c);
  if (oc_is_length_name(key.as.string))
    return oc_set(c, base, 0, x);
  size_t atom = oc_name_atom(c, key.as.string);
  if (atom == SIZE_MAX)
    oc_fail(c, "property name computed at run time is not one of the program's static names");
  return oc_set(c, base, (double)atom, x);
}
OC_INLINE oc_value oc_keyed_set(oc_ctx *c, oc_value base, oc_value key,
                                oc_value x) {
  if (OC_LIKELY(key.tag == OC_NUMBER))
    return oc_set_index(c, base, key.as.number, x);
  return oc_keyed_set_name(c, base, key, x);
}
/* ---- Strings and numbers as the builtin prelude needs them ---- */
OC_NOINLINE oc_string *oc_string_fail(oc_ctx *c) {
  oc_fail(c, "string required");
  return NULL;
}
OC_INLINE oc_string *oc_string_of(oc_ctx *c, oc_value v) {
  if (OC_UNLIKELY(v.tag != OC_STRING))
    return oc_string_fail(c);
  return v.as.string;
}
/* The code unit at an integral index, or NaN outside the string. */
static double oc_str_code(oc_ctx *c, oc_value s, double index) {
  oc_string *text = oc_string_of(c, s);
  if (!(index >= 0 && index < (double)text->length))
    return NAN;
  return text->units[(size_t)index];
}
static oc_value oc_str_from_code(oc_ctx *c, double code) {
  oc_string *s = oc_string_new(c, 1);
  s->units[0] = (uint16_t)oc_u32(code);
  return oc_wrap_string(s);
}
/* The code units from `from` up to `to`, both clamped to the string. */
static oc_value oc_str_slice(oc_ctx *c, oc_value s, double from, double to) {
  oc_string *text = oc_string_of(c, s);
  double length = (double)text->length;
  if (!(from > 0))
    from = 0;
  if (from > length)
    from = length;
  if (!(to > 0))
    to = 0;
  if (to > length)
    to = length;
  size_t a = (size_t)from, b = (size_t)to;
  if (b < a)
    b = a;
  if (a == 0 && b == text->length)
    return s;
  oc_protect(c, s);
  oc_string *out = oc_string_new(c, b - a);
  oc_unprotect(c, 1);
  memcpy(out->units, text->units + a, (b - a) * sizeof(uint16_t));
  return oc_wrap_string(out);
}
/* The first index at or after `from` where `needle` occurs, or -1. */
static double oc_str_index_of(oc_ctx *c, oc_value s, oc_value needle,
                              double from) {
  oc_string *text = oc_string_of(c, s), *sought = oc_string_of(c, needle);
  if (!(from > 0))
    from = 0;
  if (from > (double)text->length)
    from = (double)text->length;
  size_t n = sought->length;
  for (size_t at = (size_t)from; at + n <= text->length; at++)
    if (!memcmp(text->units + at, sought->units, n * sizeof(uint16_t)))
      return (double)at;
  return -1;
}
OC_INLINE double oc_math_round(double x) {
  if (!isfinite(x) || x == floor(x))
    return x;
  double below = floor(x);
  double r = x - below >= 0.5 ? below + 1 : below;
  return r == 0 ? copysign(0.0, x) : r;
}
OC_INLINE double oc_math_min(double a, double b) {
  if (isnan(a) || isnan(b))
    return NAN;
  if (a == 0 && b == 0)
    return signbit(a) ? a : b;
  return a < b ? a : b;
}
OC_INLINE double oc_math_max(double a, double b) {
  if (isnan(a) || isnan(b))
    return NAN;
  if (a == 0 && b == 0)
    return signbit(a) ? b : a;
  return a > b ? a : b;
}
/* A fresh object with the given prototype, and replacing an object's
 * prototype. */
static oc_value oc_create(oc_ctx *c, oc_value proto) {
  if (proto.tag != OC_NULL && proto.tag != OC_OBJECT)
    oc_type_error(c, "Object prototype may only be an Object or null");
  return oc_new_object(c, proto, 0);
}
static oc_value oc_set_proto(oc_ctx *c, oc_value v, oc_value proto) {
  oc_obj *o = oc_object(c, v);
  if (proto.tag != OC_NULL && proto.tag != OC_OBJECT)
    oc_type_error(c, "Object prototype may only be an Object or null");
  o->proto = proto.tag == OC_OBJECT ? proto.as.object : NULL;
  return oc_undef();
}
/* Append one element at the array's length. Grows owned storage. */
static oc_value oc_array_push(oc_ctx *c, oc_value array, oc_value x) {
  oc_array *a = oc_array_of(c, array);
  if (a->length == UINT32_MAX)
    oc_range_error(c, "invalid array length");
  return oc_set_index(c, array, a->length, x);
}
/* Append every element of an array (a hole as undefined) or every code unit
 * of a string. */
static oc_value oc_array_append_all(oc_ctx *c, oc_value array, oc_value source) {
  oc_array_of(c, array);
  if (source.tag == OC_STRING) {
    oc_protect(c, array);
    oc_protect(c, source);
    for (size_t i = 0; i < source.as.string->length; i++)
      oc_array_push(c, array, oc_str_slice(c, source, (double)i, (double)i + 1));
    oc_unprotect(c, 2);
    return array;
  }
  if (source.tag != OC_OBJECT || source.as.object->cell.object_kind != 1)
    oc_type_error(c, "value is not iterable (only arrays and strings are)");
  uint32_t count = OC_ARRAY(source.as.object)->length;
  for (uint32_t i = 0; i < count; i++) {
    /* Re-read: appending an array to itself moves its elements. */
    oc_array *from = OC_ARRAY(source.as.object);
    oc_value item = i < from->element_capacity && from->elements[i].tag != OC_ABSENT
                        ? from->elements[i]
                        : oc_undef();
    oc_array_push(c, array, item);
  }
  return array;
}
static oc_value oc_dispatch(oc_ctx *, double, oc_value, oc_value,
                            const oc_value *, size_t);
/* Call with the elements of an array as the arguments. The interpreter
 * builds that array without holes; the callee copies its arguments out
 * before it can collect or run guest code. */
static oc_value oc_guest_spread(oc_ctx *c, double code, oc_value env,
                                oc_value recv, oc_value list) {
  oc_array *a = oc_array_of(c, list);
  if (a->length > a->element_capacity)
    oc_fail(c, "spread argument list has holes");
  for (uint32_t i = 0; i < a->length; i++)
    if (a->elements[i].tag == OC_ABSENT)
      oc_fail(c, "spread argument list has holes");
  return oc_dispatch(c, code, env, recv, a->elements, a->length);
}
OC_INLINE double oc_is_array(oc_value v) {
  return v.tag == OC_OBJECT && v.as.object->cell.object_kind == 1;
}
static double oc_pow(double, double);
/* One Math function, chosen by a literal operation number. */
OC_INLINE double oc_math(double op, double a, double b) {
  switch ((int)op) {
  case 1: return floor(a);
  case 2: return ceil(a);
  case 3: return oc_math_round(a);
  case 4: return trunc(a);
  case 5: return fabs(a);
  case 6: return sqrt(a);
  case 7: return sin(a);
  case 8: return cos(a);
  case 9: return tan(a);
  case 10: return asin(a);
  case 11: return acos(a);
  case 12: return atan(a);
  case 13: return atan2(a, b);
  case 14: return exp(a);
  case 15: return log(a);
  case 16: return oc_pow(a, b);
  case 17: return oc_math_min(a, b);
  case 18: return oc_math_max(a, b);
  case 19: return isnan(a) || a == 0 ? a : a > 0 ? 1 : -1;
  case 20: return log2(a);
  case 21: return log10(a);
  case 22: return cbrt(a);
  case 23: return (double)(float)a;
  case 24: return oc_i32(oc_u32(a) * oc_u32(b));
  case 25: { uint32_t u = oc_u32(a); return u ? (double)__builtin_clz(u) : 32; }
  case 26: return hypot(a, b);
  default: return NAN;
  }
}
/* A named load whose base is not proved to be an object. Kept apart from
 * oc_get so that there a non-object base is a dead end for the C compiler. */
static oc_value oc_get_any(oc_ctx *c, oc_value v, double atom) {
  if (v.tag == OC_OBJECT)
    return oc_get(c, v, atom);
  return oc_get_primitive(c, v, oc_size(c, atom));
}
/* base[key] when the base is not proved to be an object. A string yields
 * its code units by index; strings, numbers and booleans read names through
 * their root prototype. */
static oc_value oc_any_get(oc_ctx *c, oc_value base, oc_value key) {
  if (base.tag == OC_OBJECT)
    return oc_keyed_get(c, base, key);
  if (base.tag != OC_STRING && base.tag != OC_NUMBER && base.tag != OC_BOOL)
    return oc_get_fail(c);
  if (key.tag == OC_NUMBER) {
    double i = key.as.number;
    if (base.tag != OC_STRING || !(i >= 0 && i < (double)base.as.string->length) ||
        i != floor(i))
      return oc_undef();
    return oc_str_slice(c, base, i, i + 1);
  }
  if (key.tag != OC_STRING)
    return oc_key_fail(c);
  if (oc_is_length_name(key.as.string))
    return oc_get_primitive(c, base, 0);
  size_t atom = oc_name_atom(c, key.as.string);
  if (atom == SIZE_MAX)
    return oc_undef();
  return oc_get_primitive(c, base, atom);
}
#define OC_STATIC_STRING(name, count, ...)                                     \
  static struct {                                                              \
    oc_cell cell;                                                              \
    size_t length;                                                             \
    uint16_t units[count];                                                     \
  } name = {{.kind = OC_CELL_STRING, .fixed = 1}, count, {__VA_ARGS__}}
OC_STATIC_STRING(oc_type_undefined, 9, 'u', 'n', 'd', 'e', 'f', 'i', 'n', 'e', 'd');
OC_STATIC_STRING(oc_type_object, 6, 'o', 'b', 'j', 'e', 'c', 't');
OC_STATIC_STRING(oc_type_boolean, 7, 'b', 'o', 'o', 'l', 'e', 'a', 'n');
OC_STATIC_STRING(oc_type_number, 6, 'n', 'u', 'm', 'b', 'e', 'r');
OC_STATIC_STRING(oc_type_string, 6, 's', 't', 'r', 'i', 'n', 'g');
OC_STATIC_STRING(oc_type_function, 8, 'f', 'u', 'n', 'c', 't', 'i', 'o', 'n');
static oc_value oc_typeof(oc_ctx *c, oc_value v) {
  void *name = NULL;
  switch (v.tag) {
  case OC_UNDEF:
    name = &oc_type_undefined;
    break;
  case OC_NULL:
    name = &oc_type_object;
    break;
  case OC_BOOL:
    name = &oc_type_boolean;
    break;
  case OC_NUMBER:
    name = &oc_type_number;
    break;
  case OC_STRING:
    name = &oc_type_string;
    break;
  case OC_OBJECT:
    name = v.as.object->cell.object_kind == 2 ? (void *)&oc_type_function
                                              : (void *)&oc_type_object;
    break;
  case OC_ABSENT:
  case OC_SCOPE:
    oc_fail(c, "typeof of a non-guest value");
  }
  return oc_wrap_string((oc_string *)name);
}
/* OrdinaryHasInstance. */
static double oc_instance_of(oc_ctx *c, oc_value v, oc_value f) {
  if (f.tag != OC_OBJECT || f.as.object->cell.object_kind != 2)
    oc_type_error(c, "Right-hand side of 'instanceof' is not callable");
  if (v.tag != OC_OBJECT)
    return 0;
  oc_value proto = oc_get(c, f, 1);
  if (proto.tag != OC_OBJECT)
    oc_type_error(c, "Function has non-object prototype in instanceof check");
  size_t depth = 0;
  for (oc_obj *p = v.as.object->proto; p; p = p->proto) {
    if (++depth > 10000)
      oc_fail(c, "prototype chain limit");
    if (p == proto.as.object)
      return 1;
  }
  return 0;
}
/* HasProperty: own or inherited, for an index or a name. */
static double oc_keyed_has(oc_ctx *c, oc_value base, oc_value key) {
  oc_obj *o = oc_object(c, base);
  if (key.tag == OC_NUMBER) {
    uint32_t i = oc_index(c, key.as.number);
    if (o->cell.object_kind == 1) {
      oc_array *a = OC_ARRAY(o);
      if (i < a->length && i < a->element_capacity &&
          a->elements[i].tag != OC_ABSENT)
        return 1;
    }
    size_t depth = 0;
    for (; o; o = o->proto) {
      if (++depth > 10000)
        oc_fail(c, "prototype chain limit");
      for (oc_index_prop *p = o->indices; p; p = p->next)
        if (p->key == i)
          return 1;
    }
    return 0;
  }
  if (key.tag != OC_STRING)
    return oc_key_fail(c), 0;
  if (oc_is_length_name(key.as.string) && o->cell.object_kind == 1)
    return 1;
  size_t atom = oc_name_atom(c, key.as.string);
  if (atom == SIZE_MAX)
    return 0;
  size_t depth = 0;
  for (; o; o = o->proto) {
    if (++depth > 10000)
      oc_fail(c, "prototype chain limit");
    if (o->shape->slot[atom] != OC_NO_SLOT)
      return 1;
  }
  return 0;
}
static int oc_same_value(oc_value a, oc_value b) {
  if (a.tag == OC_NUMBER && b.tag == OC_NUMBER) {
    if (isnan(a.as.number) && isnan(b.as.number))
      return 1;
    return a.as.number == b.as.number &&
           signbit(a.as.number) == signbit(b.as.number);
  }
  return oc_strict_eq(a, b) != 0;
}
/* Define or redefine a data property (ValidateAndApplyPropertyDescriptor for
 * data descriptors on an extensible ordinary object). `fields` says which
 * descriptor fields are present and the value of the boolean ones:
 * 1 value present; 2 writable present, 4 its value; 8 enumerable present,
 * 16 its value; 32 configurable present, 64 its value. */
static oc_value oc_define(oc_ctx *c, oc_value target, oc_value key,
                          oc_value value, double fields) {
  oc_obj *o = oc_object(c, target);
  size_t f = oc_size(c, fields);
  if (key.tag != OC_STRING)
    oc_fail(c, "defined property key must be a string");
  if (o->cell.object_kind == 1 && oc_is_length_name(key.as.string))
    oc_fail(c, "redefining an array's length is not supported");
  size_t atom = oc_name_atom(c, key.as.string);
  if (atom == SIZE_MAX || atom == 0)
    oc_fail(c, "property name computed at run time is not one of the program's static names");
  unsigned wanted = (f & 4 ? OC_WRITABLE : 0) | (f & 16 ? OC_ENUMERABLE : 0) |
                    (f & 64 ? OC_CONFIGURABLE : 0);
  size_t s = o->shape->slot[atom];
  if (s == OC_NO_SLOT) {
    s = oc_add_slot(c, o, atom, wanted);
    *oc_slot(o, s) = f & 1 ? value : oc_undef();
  } else {
    unsigned current = o->shape->flags[atom];
    if (!(current & OC_CONFIGURABLE)) {
      if ((f & 32) && (f & 64))
        oc_type_error(c, "Cannot redefine property");
      if ((f & 8) && !(f & 16) != !(current & OC_ENUMERABLE))
        oc_type_error(c, "Cannot redefine property");
      if (!(current & OC_WRITABLE)) {
        if ((f & 2) && (f & 4))
          oc_type_error(c, "Cannot redefine property");
        if ((f & 1) && !oc_same_value(value, *oc_slot(o, s)))
          oc_type_error(c, "Cannot redefine property");
      }
    }
    unsigned updated = current;
    if (f & 2)
      updated = (updated & ~(unsigned)OC_WRITABLE) | (wanted & OC_WRITABLE);
    if (f & 8)
      updated = (updated & ~(unsigned)OC_ENUMERABLE) | (wanted & OC_ENUMERABLE);
    if (f & 32)
      updated =
          (updated & ~(unsigned)OC_CONFIGURABLE) | (wanted & OC_CONFIGURABLE);
    if (updated != current)
      o->shape = oc_shape_reflag(c, o->shape, atom, updated);
    if (f & 1)
      *oc_slot(o, s) = value;
  }
  if (!(o->shape->flags[atom] & OC_WRITABLE))
    c->guarded[atom] = 1;
  return target;
}
static oc_value oc_ascii(oc_ctx *c, const char *text) {
  size_t n = strlen(text);
  oc_string *s = oc_string_new(c, n);
  for (size_t i = 0; i < n; i++)
    s->units[i] = (unsigned char)text[i];
  return oc_wrap_string(s);
}
/* Pinned Ryu shortest digits, then ECMAScript Number::toString decimal
 * placement. */
static oc_value oc_to_string(oc_ctx *c, oc_value v) {
  if (v.tag == OC_STRING)
    return v;
  if (v.tag == OC_UNDEF)
    return oc_ascii(c, "undefined");
  if (v.tag == OC_NULL)
    return oc_ascii(c, "null");
  if (v.tag == OC_BOOL)
    return oc_ascii(c, v.as.boolean ? "true" : "false");
  if (v.tag == OC_OBJECT) {
    oc_fail(c, "object coercion requires guest lowering");
    return oc_undef();
  }
  double x = v.as.number;
  if (isnan(x))
    return oc_ascii(c, "NaN");
  if (isinf(x))
    return oc_ascii(c, x < 0 ? "-Infinity" : "Infinity");
  if (x == 0)
    return oc_ascii(c, "0");
  char scientific[32], out[400], digits[32];
  int size = d2s_buffered_n(fabs(x), scientific);
  scientific[size] = 0;
  char *e = strchr(scientific, 'E');
  int exponent = e ? atoi(e + 1) : 0, count = 0;
  for (char *p = scientific; p != (e ? e : scientific + size); p++)
    if (*p != '.')
      digits[count++] = *p;
  int n = exponent + 1;
  size_t at = 0;
  if (x < 0)
    out[at++] = '-';
  if (count <= n && n <= 21) {
    memcpy(out + at, digits, (size_t)count);
    at += (size_t)count;
    for (int i = count; i < n; i++)
      out[at++] = '0';
  } else if (0 < n && n <= 21) {
    memcpy(out + at, digits, (size_t)n);
    at += (size_t)n;
    out[at++] = '.';
    memcpy(out + at, digits + n, (size_t)(count - n));
    at += (size_t)(count - n);
  } else if (-6 < n && n <= 0) {
    out[at++] = '0';
    out[at++] = '.';
    for (int i = 0; i < -n; i++)
      out[at++] = '0';
    memcpy(out + at, digits, (size_t)count);
    at += (size_t)count;
  } else {
    out[at++] = digits[0];
    if (count > 1) {
      out[at++] = '.';
      memcpy(out + at, digits + 1, (size_t)(count - 1));
      at += (size_t)(count - 1);
    }
    out[at++] = 'e';
    out[at++] = exponent < 0 ? '-' : '+';
    char b[16];
    int z = exponent < 0 ? -exponent : exponent, k = 0;
    do {
      b[k++] = (char)('0' + z % 10);
      z /= 10;
    } while (z);
    while (k)
      out[at++] = b[--k];
  }
  out[at] = 0;
  return oc_ascii(c, out);
}
static oc_value oc_concat(oc_ctx *c, oc_value a, oc_value b) {
  oc_protect(c, b);
  a = oc_to_string(c, a);
  oc_protect(c, a);
  b = oc_to_string(c, b);
  oc_protect(c, b);
  oc_string *x = a.as.string, *y = b.as.string;
  if (x->length > SIZE_MAX - y->length)
    oc_fail(c, "string length overflow");
  oc_string *s = oc_string_new(c, x->length + y->length);
  oc_unprotect(c, 3);
  if (x->length)
    memcpy(s->units, x->units, x->length * sizeof(uint16_t));
  if (y->length)
    memcpy(s->units + x->length, y->units, y->length * sizeof(uint16_t));
  return oc_wrap_string(s);
}
OC_NOINLINE oc_value oc_unary_slow(oc_ctx *c, double op, oc_value a) {
  if (op == 3)
    return oc_bool(!oc_truth(a));
  if (op == 5)
    return oc_undef();
  double n = oc_to_number(c, a);
  if (op == 1)
    return oc_num(-n);
  if (op == 2)
    return oc_num(n);
  if (op == 4)
    return oc_num(oc_i32(~oc_u32(n)));
  oc_fail(c, "invalid unary opcode");
  return oc_undef();
}
static double oc_pow(double base, double exponent) {
  if (isnan(exponent))
    return NAN;
  if (fabs(base) == 1 && isinf(exponent))
    return NAN;
  return pow(base, exponent);
}
OC_NOINLINE oc_value oc_binary_slow(oc_ctx *c, double op, oc_value a,
                                    oc_value b) {
  if (!isfinite(op) || op < 1 || op > 23 || floor(op) != op)
    oc_fail(c, "invalid binary opcode");
  if (op == 7)
    return oc_bool(oc_strict_eq(a, b));
  if (op == 8)
    return oc_bool(!oc_strict_eq(a, b));
  if (op == 9)
    return oc_bool(oc_loose_eq(c, a, b));
  if (op == 10)
    return oc_bool(!oc_loose_eq(c, a, b));
  if (op == 21)
    return oc_truth(a) ? b : a;
  if (op == 22)
    return oc_truth(a) ? a : b;
  if (op == 23)
    return oc_nullish(a) ? b : a;
  if (op == 1 && (a.tag == OC_STRING || b.tag == OC_STRING))
    return oc_concat(c, a, b);
  if (op >= 11 && op <= 14 && a.tag == OC_STRING && b.tag == OC_STRING) {
    int k = oc_string_compare(a.as.string, b.as.string);
    return oc_bool(op == 11   ? k < 0
                   : op == 12 ? k <= 0
                   : op == 13 ? k > 0
                              : k >= 0);
  }
  double x = oc_to_number(c, a), y = oc_to_number(c, b);
  uint32_t u, v, s, r;
  switch ((int)op) {
  case 1:
    return oc_num(x + y);
  case 2:
    return oc_num(x - y);
  case 3:
    return oc_num(x * y);
  case 4:
    return oc_num(x / y);
  case 5:
    return oc_num(fmod(x, y));
  case 6:
    return oc_num(oc_pow(x, y));
  case 11:
    return oc_bool(x < y);
  case 12:
    return oc_bool(x <= y);
  case 13:
    return oc_bool(x > y);
  case 14:
    return oc_bool(x >= y);
  case 15:
    return oc_num(oc_i32(oc_u32(x) | oc_u32(y)));
  case 16:
    return oc_num(oc_i32(oc_u32(x) & oc_u32(y)));
  case 17:
    return oc_num(oc_i32(oc_u32(x) ^ oc_u32(y)));
  case 18:
    return oc_num(oc_i32(oc_u32(x) << (oc_u32(y) & 31)));
  case 19:
    u = oc_u32(x);
    s = oc_u32(y) & 31;
    r = u >> s;
    if (s && (u & UINT32_C(0x80000000)))
      r |= UINT32_MAX << (32 - s);
    return oc_num(oc_i32(r));
  case 20:
    return oc_num((double)(oc_u32(x) >> (oc_u32(y) & 31)));
  default:
    break;
  }
  oc_fail(c, "invalid binary opcode");
  return oc_undef();
}
/* Operator entry points. After specialization the opcode is a literal, so
 * exactly one number-typed arm survives inlining; every other operand type
 * and every coercion goes to the complete out-of-line implementation. */
OC_INLINE oc_value oc_unary(oc_ctx *c, double op, oc_value a) {
  if (OC_LIKELY(a.tag == OC_NUMBER)) {
    if (op == 1)
      return oc_num(-a.as.number);
    if (op == 2)
      return a;
    if (op == 4)
      return oc_num(oc_i32(~oc_u32(a.as.number)));
  }
  if (op == 3)
    return oc_boolean(oc_truth(a) == 0);
  return oc_unary_slow(c, op, a);
}
/* Sign-propagating shift without relying on signed-shift behaviour. */
OC_INLINE uint32_t oc_sar(uint32_t u, uint32_t s) {
  uint32_t r = u >> s;
  if (s && (u & UINT32_C(0x80000000)))
    r |= UINT32_MAX << (32 - s);
  return r;
}
OC_INLINE oc_value oc_binary(oc_ctx *c, double op, oc_value a, oc_value b) {
  if (OC_LIKELY(a.tag == OC_NUMBER && b.tag == OC_NUMBER)) {
    double x = a.as.number, y = b.as.number;
    if (op == 1)
      return oc_num(x + y);
    if (op == 2)
      return oc_num(x - y);
    if (op == 3)
      return oc_num(x * y);
    if (op == 4)
      return oc_num(x / y);
    if (op == 7 || op == 9)
      return oc_boolean(x == y);
    if (op == 8 || op == 10)
      return oc_boolean(x != y);
    if (op == 11)
      return oc_boolean(x < y);
    if (op == 12)
      return oc_boolean(x <= y);
    if (op == 13)
      return oc_boolean(x > y);
    if (op == 14)
      return oc_boolean(x >= y);
    if (op == 15)
      return oc_num(oc_i32(oc_u32(x) | oc_u32(y)));
    if (op == 16)
      return oc_num(oc_i32(oc_u32(x) & oc_u32(y)));
    if (op == 17)
      return oc_num(oc_i32(oc_u32(x) ^ oc_u32(y)));
    if (op == 18)
      return oc_num(oc_i32(oc_u32(x) << (oc_u32(y) & 31)));
    if (op == 19)
      return oc_num(oc_i32(oc_sar(oc_u32(x), oc_u32(y) & 31)));
    if (op == 20)
      return oc_num((double)(oc_u32(x) >> (oc_u32(y) & 31)));
  } else if (op == 7 || op == 8 || op == 9 || op == 10) {
    /* Equality needs no coercion when either side is nullish or when both
     * are object references. */
    int negate = op == 8 || op == 10, loose = op >= 9;
    if (oc_nullish(a) || oc_nullish(b))
      return oc_boolean(negate ^ (loose ? (oc_nullish(a) && oc_nullish(b))
                                     : (a.tag == b.tag)));
    if (a.tag == OC_OBJECT && b.tag == OC_OBJECT)
      return oc_boolean(negate ^ (a.as.object == b.as.object));
  }
  return oc_binary_slow(c, op, a, b);
}
/* Operators whose operands are proved to be numbers. */
OC_INLINE oc_value oc_binary_number(oc_ctx *c, double op, oc_value a,
                                    oc_value b) {
#ifdef OC_VERIFY_PROOFS
  if (a.tag != OC_NUMBER || b.tag != OC_NUMBER)
    oc_violated(c, "analysis violation: binary operand proved numeric");
#endif
  double x = a.as.number, y = b.as.number;
  if (op == 1)
    return oc_num(x + y);
  if (op == 2)
    return oc_num(x - y);
  if (op == 3)
    return oc_num(x * y);
  if (op == 4)
    return oc_num(x / y);
  if (op == 7 || op == 9)
    return oc_boolean(x == y);
  if (op == 8 || op == 10)
    return oc_boolean(x != y);
  if (op == 11)
    return oc_boolean(x < y);
  if (op == 12)
    return oc_boolean(x <= y);
  if (op == 13)
    return oc_boolean(x > y);
  if (op == 14)
    return oc_boolean(x >= y);
  if (op == 15)
    return oc_num(oc_i32(oc_u32(x) | oc_u32(y)));
  if (op == 16)
    return oc_num(oc_i32(oc_u32(x) & oc_u32(y)));
  if (op == 17)
    return oc_num(oc_i32(oc_u32(x) ^ oc_u32(y)));
  if (op == 18)
    return oc_num(oc_i32(oc_u32(x) << (oc_u32(y) & 31)));
  if (op == 19)
    return oc_num(oc_i32(oc_sar(oc_u32(x), oc_u32(y) & 31)));
  if (op == 20)
    return oc_num((double)(oc_u32(x) >> (oc_u32(y) & 31)));
  return oc_binary_slow(c, op, oc_num(x), oc_num(y));
}
OC_INLINE oc_value oc_unary_number(oc_ctx *c, double op, oc_value a) {
#ifdef OC_VERIFY_PROOFS
  if (a.tag != OC_NUMBER)
    oc_violated(c, "analysis violation: unary operand proved numeric");
#endif
  double x = a.as.number;
  if (op == 1)
    return oc_num(-x);
  if (op == 2)
    return oc_num(x);
  if (op == 4)
    return oc_num(oc_i32(~oc_u32(x)));
  return oc_unary_slow(c, op, oc_num(x));
}
static oc_value oc_error(oc_ctx *c, oc_value message) {
  oc_protect(c, message);
  oc_value e = oc_new_object(c, oc_root_proto(c, 0), 2);
  oc_protect(c, e);
  e.as.object->cell.object_kind = 3;
  oc_set(c, e, 3, oc_ascii(c, "Error"));
  oc_set(c, e, 4,
         message.tag == OC_UNDEF ? oc_ascii(c, "") : oc_to_string(c, message));
  oc_unprotect(c, 2);
  return e;
}
static double oc_throw(oc_ctx *c, oc_value value) {
  c->thrown = 1;
  c->exception = value;
  if (c->catch_active) {
    oc_unwind(c);
    longjmp(c->escape, 1);
  }
  oc_fail(c, "uncaught guest exception");
  return 0;
}
/* A runtime-raised error. Nothing below the entry runs again, so its
 * construction neither needs nor consults the abandoned frames' roots. */
static void oc_error_kind(oc_ctx *c, const char *kind, const char *message) {
  c->erroring = 1;
  oc_value e = oc_error(c, oc_ascii(c, message));
  oc_set(c, e, 3, oc_ascii(c, kind));
  oc_throw(c, e);
}
static void oc_type_error(oc_ctx *c, const char *message) {
  oc_error_kind(c, "TypeError", message);
}
static void oc_range_error(oc_ctx *c, const char *message) {
  oc_error_kind(c, "RangeError", message);
}
static oc_value oc_fail_call(oc_ctx *c) {
  oc_type_error(c, "callable required");
  return oc_undef();
}
static void oc_print_string(FILE *f, oc_string *s) {
  fputc('"', f);
  for (size_t i = 0; i < s->length; i++) {
    unsigned x = s->units[i];
    if (x == '"' || x == '\\') {
      fputc('\\', f);
      fputc(x, f);
    } else if (x < 32 || x > 126)
      fprintf(f, "\\u%04x", x);
    else
      fputc(x, f);
  }
  fputc('"', f);
}
static void oc_print(FILE *f, oc_value v, unsigned depth) {
  if (depth > 128) {
    fputs("[\"cycle\"]", f);
    return;
  }
  switch (v.tag) {
  case OC_SCOPE:
    fputs("[\"environment\"]", f);
    break;
  case OC_ABSENT:
    fputs("[\"hole\"]", f);
    break;
  case OC_UNDEF:
    fputs("[\"undefined\"]", f);
    break;
  case OC_NULL:
    fputs("[\"null\"]", f);
    break;
  case OC_BOOL:
    fprintf(f, "[\"boolean\",%s]", v.as.boolean ? "true" : "false");
    break;
  case OC_NUMBER:
    fputs("[\"number\",", f);
    if (isnan(v.as.number))
      fputs("\"NaN\"", f);
    else if (isinf(v.as.number))
      fputs(v.as.number < 0 ? "\"-Infinity\"" : "\"Infinity\"", f);
    else if (v.as.number == 0 && signbit(v.as.number))
      fputs("\"-0\"", f);
    else
      fprintf(f, "%.17g", v.as.number);
    fputc(']', f);
    break;
  case OC_STRING:
    fputs("[\"string\",", f);
    oc_print_string(f, v.as.string);
    fputc(']', f);
    break;
  case OC_OBJECT: {
    oc_obj *o = v.as.object;
    if (o->cell.object_kind == 1) {
      oc_array *a = OC_ARRAY(o);
      fputs("[\"array\",[", f);
      for (uint32_t i = 0; i < a->length; i++) {
        if (i)
          fputc(',', f);
        if (i < a->element_capacity && a->elements[i].tag != OC_ABSENT)
          oc_print(f, a->elements[i], depth + 1);
        else
          fputs("[\"hole\"]", f);
      }
      fputs("]]", f);
    } else {
      fputs(o->cell.object_kind == 2 ? "[\"function\",{}]" : "[\"object\",{}]", f);
    }
    break;
  }
  }
}

/* Guest calls pass environment, receiver and arguments as native parameters.
 * Only generated guest functions have a frame; anything else asking for one
 * is a residual-program error. */
static oc_value oc_dispatch(oc_ctx *, double, oc_value, oc_value,
                            const oc_value *, size_t);
OC_NOINLINE void oc_no_frame(oc_ctx *c) {
  oc_fail(c, "missing guest call frame");
}
OC_INLINE oc_value oc_frame_arg(oc_ctx *c, const oc_value *args, size_t count,
                                double index) {
  size_t i = oc_size(c, index);
  return i < count ? args[i] : oc_undef();
}
OC_NOINLINE oc_values oc_values_shared_slow(oc_ctx *c, double id,
                                            double size) {
  size_t i = oc_size(c, id), n = oc_size(c, size);
  if (i >= 8)
    oc_fail(c, "shared values id outside contract");
  if (!c->shared_values[i]) {
    c->shared_values[i] = oc_alloc_values(c, size);
    c->shared_value_sizes[i] = n;
  } else if (c->shared_value_sizes[i] != n)
    oc_fail(c, "shared value buffer size mismatch");
  return (oc_values){c->shared_values[i], n};
}
OC_INLINE oc_values oc_values_shared(oc_ctx *c, double id, double size) {
  if (OC_LIKELY(id >= 0 && id < 8)) {
    size_t i = (size_t)id;
    if (OC_LIKELY((double)i == id && c->shared_values[i] &&
                  (double)c->shared_value_sizes[i] == size))
      return (oc_values){c->shared_values[i], c->shared_value_sizes[i]};
  }
  return oc_values_shared_slow(c, id, size);
}
OC_NOINLINE double *oc_shared_f64_slow(oc_ctx *c, double id, double size) {
  size_t i = oc_size(c, id), n = oc_size(c, size);
  if (i >= 8)
    oc_fail(c, "shared number id outside contract");
  if (!c->shared_numbers[i]) {
    c->shared_numbers[i] = oc_alloc_f64(c, size);
    c->shared_number_sizes[i] = n;
  } else if (c->shared_number_sizes[i] != n)
    oc_fail(c, "shared number buffer size mismatch");
  return c->shared_numbers[i];
}
OC_INLINE double *oc_shared_f64(oc_ctx *c, double id, double size) {
  if (OC_LIKELY(id >= 0 && id < 8)) {
    size_t i = (size_t)id;
    if (OC_LIKELY((double)i == id && c->shared_numbers[i] &&
                  (double)c->shared_number_sizes[i] == size))
      return c->shared_numbers[i];
  }
  return oc_shared_f64_slow(c, id, size);
}

static oc_values oc_values_make(oc_ctx *c, double n) {
  size_t k = oc_size(c, n);
  return (oc_values){oc_alloc_values(c, n), k};
}
OC_NOINLINE oc_value oc_values_fail(oc_ctx *c) {
  oc_fail(c, "value buffer index out of bounds");
  return oc_undef();
}
OC_INLINE oc_value oc_values_get(oc_ctx *c, oc_values a, double i) {
  if (OC_LIKELY(i >= 0 && i < (double)a.length)) {
    size_t k = (size_t)i;
    if (OC_LIKELY((double)k == i))
      return a.data[k];
  }
  return oc_values_fail(c);
}
OC_INLINE oc_value oc_values_set(oc_ctx *c, oc_values a, double i,
                                 oc_value x) {
  if (OC_LIKELY(i >= 0 && i < (double)a.length)) {
    size_t k = (size_t)i;
    if (OC_LIKELY((double)k == i)) {
      a.data[k] = x;
      return x;
    }
  }
  return oc_values_fail(c);
}
OC_INLINE oc_value oc_guest_rest(oc_ctx *c, double code, oc_value env,
                                 oc_value recv, const oc_value *args,
                                 size_t count, double skip) {
  size_t k = oc_size(c, skip);
  if (k > count)
    k = count;
  return oc_dispatch(c, code, env, recv, args + k, count - k);
}
/* A call under which a guest throw is intercepted: the result is then the
 * thrown value and oc_took_throw reports it once. A runtime failure is not a
 * guest throw and continues to the next handler out. The interception point
 * is this function's own activation, so the caller's locals are exactly as
 * they were when it made the call. */
OC_NOINLINE oc_value oc_guest_protected(oc_ctx *c, double code, oc_value env,
                                        oc_value recv, oc_values args) {
  jmp_buf outer;
  memcpy(&outer, &c->escape, sizeof(outer));
  oc_frame *frames = c->frames;
  size_t temp_count = c->temp_count, forbid = c->forbid, depth = c->depth;
  int catch_active = c->catch_active;
  c->catch_active = 1;
  if (setjmp(c->escape) == 0) {
    oc_value result = oc_dispatch(c, code, env, recv, args.data, args.length);
    memcpy(&c->escape, &outer, sizeof(outer));
    c->catch_active = catch_active;
    c->caught = 0;
    return result;
  }
  memcpy(&c->escape, &outer, sizeof(outer));
  c->catch_active = catch_active;
  c->frames = frames;
  c->temp_count = temp_count;
  c->forbid = forbid;
  c->depth = depth;
  if (!c->thrown)
    oc_fail(c, c->failure ? c->failure : "runtime failure");
  c->thrown = 0;
  c->erroring = 0;
  c->caught = 1;
  oc_value value = c->exception;
  c->exception = oc_undef();
  return value;
}
OC_INLINE double oc_took_throw(oc_ctx *c) {
  int taken = c->caught;
  c->caught = 0;
  return taken;
}
OC_INLINE oc_value oc_guest_values(oc_ctx *c, double code, oc_value env,
                                   oc_value recv, oc_values args) {
  return oc_dispatch(c, code, env, recv, args.data, args.length);
}
#endif
