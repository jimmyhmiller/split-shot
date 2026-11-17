typedef unsigned int u32;
typedef unsigned long long u64;
static volatile int cells[32];
__attribute__((noinline)) int plus(int x) { return x + 7; }
__attribute__((noinline)) int times(int x) { return x * 3; }
static int (*volatile operations[2])(int) = { plus, times };
int indirect(int x, int which) { return operations[which & 1](x); }
int memory_sum(int x) { for (int i=0; i<32; i++) cells[i] = x+i; int s=0; for(int i=0;i<32;i++) s += cells[i]; return s; }
u64 wide(u64 x, u64 y) { return x*y + 7; }
double floating(double x) { return x*1.5 + 0.25; }
