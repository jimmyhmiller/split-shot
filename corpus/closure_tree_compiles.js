// inputs: [{"id":"1","c":"x"}, {"id":7}, {}]
// forbid-main: map|encoders|__rf|for \(|while
// A compiler that maps each node of a static tree to a closure (path-to-regexp's `compile`: `tokens.map(token => tokenToFunction(token))`, a group compiling its own tokens the same way) folds to straight code for the tree. The `map` runs inside the recursion with a known callback, and the group's closure calls the same arrow function over other encoders it closes over: its captures are another static structure than the outer activation's, so the recursion is the tree's, though every argument is a runtime value.
function main(input) {
  function tokensToFunction(tokens) {
    const encoders = tokens.map((token) => tokenToFunction(token));
    return (data) => {
      let result = "";
      for (const encoder of encoders) result += encoder(data);
      return result;
    };
  }
  function tokenToFunction(token) {
    if (token.type === "text") return () => token.value;
    if (token.type === "group") {
      const fn = tokensToFunction(token.tokens);
      return (data) => fn(data) + "!";
    }
    return (data) => String(data[token.name]);
  }
  const toPath = tokensToFunction([{ type: "text", value: "/u/" }, { type: "param", name: "id" }, { type: "group", tokens: [{ type: "text", value: "/c/" }, { type: "param", name: "c" }] }]);
  return toPath(input);
}
