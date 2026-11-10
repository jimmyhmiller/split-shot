// @case {"description": "typeof names each kind of value and tolerates an unbound name; instanceof walks the prototype chain against the constructor's current prototype; in finds own and inherited names and array indices."}
function Animal(name) { this.name = name; }
Animal.prototype.kind = "animal";
function Dog(name) { Animal.call(this, name); this.tricks = 0; }
Dog.prototype = new Animal("proto");
function Other() {}
function main(x) {
  var dog = new Dog("rex"), animal = new Animal("cat"), plain = {}, list = [x, , 3];
  var kinds = [typeof x, typeof "s", typeof true, typeof undefined, typeof null, typeof plain,
    typeof list, typeof main, typeof (() => 1), typeof neverDeclaredAnywhere, typeof typeof x];
  var instances = [dog instanceof Dog, dog instanceof Animal, animal instanceof Dog,
    animal instanceof Animal, plain instanceof Animal, x instanceof Animal, "s" instanceof Other,
    dog instanceof Other, list instanceof Animal];
  Other.prototype = Dog.prototype;
  var names = ["name" in dog, "tricks" in dog, "kind" in dog, "missing" in dog, "name" in plain,
    "length" in list, 0 in list, 1 in list, 2 in list, 3 in list, ("ki" + "nd") in animal];
  return [kinds, instances, dog instanceof Other, names];
}
