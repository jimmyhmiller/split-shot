// @case {"description": "Constructors retain their receiver for primitive returns and honor object returns."}
function A(x) { this.x = x; return 9; }
function B(x) { this.x = x; return { x: 2 }; }
function C(x) { this.x = x; return null; }
function main(x) { return [new A(x).x, new B(x).x, new C(x).x]; }
