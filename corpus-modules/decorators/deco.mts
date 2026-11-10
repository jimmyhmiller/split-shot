export const log: string[] = [];
export function tag(label: string) {
  log.push('evaluate ' + label);
  return function (value: any, context: ClassDecoratorContext) {
    log.push(`apply ${label} to ${context.name} (${context.kind})`);
    context.addInitializer(function (this: any) { log.push(`init ${label}: static field = ${this.field}`); });
  };
}
// engine262's pattern: make a class callable without `new`.
export function callable(onCalled = (target: any, _this: unknown, args: unknown[]) => Reflect.construct(target, args)) {
  const handler = Object.freeze({ __proto__: null, apply: onCalled });
  return function (cls: any, _ctx: ClassDecoratorContext) { return new Proxy(cls, handler); };
}
