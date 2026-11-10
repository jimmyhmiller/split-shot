// @case {"description": "Nullable links, aliased records and cycles preserve reference identity."}
function Node(x, next) { this.value = x; this.next = next; }
function main(x) {
  var tail = new Node(x, null), head = new Node(x + 1, tail);
  var alias = head.next;
  alias.value += 2;
  tail.next = head;
  return [head.next === tail, alias === tail, head.next.value,
    tail.next === head, tail.next.next === tail, head.missing === undefined];
}
