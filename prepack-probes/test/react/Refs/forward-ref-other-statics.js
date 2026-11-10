var React = require("react");

// What React.forwardRef is given renders a component known as it was made,
// while another component of the program is given its defaultProps as
// usual: a write on another function than those known so, which leaves
// them known.

function Child(props) {
  return <span ref={props.forwardedRef}>{props.label}</span>;
}

const Wrapped = React.forwardRef((props, ref) => {
  return <Child {...props} forwardedRef={ref} />;
});

function Other(props) {
  return <em>{props.text}</em>;
}
Other.defaultProps = { text: "other default" };

function App(props) {
  return (
    <div>
      <Wrapped ref={props.r} label={props.label} />
      <Other />
    </div>
  );
}

App.getTrials = function(renderer, Root) {
  let seen = [];
  renderer.update(<Root label="given" r={n => seen.push(n ? n.type : n)} />);
  let a = renderer.toJSON();
  renderer.update(<Root label="again" r={null} />);
  return [["first", a], ["second", renderer.toJSON()], ["refs", seen.join(",")]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
