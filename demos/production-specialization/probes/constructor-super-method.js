class Base {
  constructor(value) { this.value = value; }
  update() { this.value += 1; }
}
class Derived extends Base {
  constructor(value) {
    super(value);
    super.update();
  }
}
function main(input) { return new Derived(input).value; }
