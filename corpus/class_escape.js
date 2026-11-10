// inputs: [0, 1, 3]
// Class instances (with accessors, inheritance and fields) that escape to runtime code.
function main(n) {
  class Animal {
    constructor(name) { this.name = name; }
    get label() { return "animal:" + this.name; }
    speak() { return this.name + " makes a sound"; }
  }
  class Dog extends Animal {
    tricks = [];
    speak() { return super.speak() + " (woof)"; }
    learn(t) { this.tricks.push(t); return this; }
  }
  var pets = [new Dog("rex"), new Animal("cat" + n)];
  var p = pets[n % 2];
  if (p instanceof Dog) p.learn("sit");
  return [p.speak(), p.label, p instanceof Animal, p.constructor.name, JSON.stringify(p)];
}
