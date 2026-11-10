var React = require("react");

// A component with a large tree, rendered at many places with props only
// known at runtime: rendering it in place would copy the tree at each, so
// the root's body is refused (react_root_sizes) and stays as written.
function Card(props) {
  return (
    <div className="card" data-id={props.id}>
      <header>
        <h2>{props.title}</h2>
        <span className="badge">{props.badge}</span>
      </header>
      <section>
        <p>{props.body}</p>
        <ul>
          <li>{props.a}</li>
          <li>{props.b}</li>
          <li>{props.c}</li>
        </ul>
      </section>
      <footer>
        <a href={props.link}>{props.linkText}</a>
      </footer>
    </div>
  );
}

function App(props) {
  return (
    <main>
      <Card id={1} title={props.t1} badge={props.b} body={props.x} a={props.a} b={props.b} c={props.c} link={props.l} linkText="one" />
      <Card id={2} title={props.t2} badge={props.b} body={props.y} a={props.c} b={props.a} c={props.b} link={props.l} linkText="two" />
      <Card id={3} title={props.t3} badge={props.a} body={props.x} a={props.b} b={props.c} c={props.a} link={props.l} linkText="three" />
      <Card id={4} title={props.t1} badge={props.c} body={props.y} a={props.a} b={props.a} c={props.c} link={props.l} linkText="four" />
      <Card id={5} title={props.t2} badge={props.b} body={props.x} a={props.c} b={props.b} c={props.a} link={props.l} linkText="five" />
      <Card id={6} title={props.t3} badge={props.a} body={props.y} a={props.b} b={props.a} c={props.b} link={props.l} linkText="six" />
    </main>
  );
}

App.getTrials = function(renderer, Root) {
  renderer.update(<Root t1="A" t2="B" t3="C" a="1" b="2" c="3" x="body x" y="body y" l="#here" />);
  let first = renderer.toJSON();
  renderer.update(<Root t1="D" t2="E" t3="F" a="4" b="5" c="6" x="other x" y="other y" l="#there" />);
  return [["first", first], ["second", renderer.toJSON()]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
