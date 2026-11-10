var React = require("react");

// React.forwardRef is called as written, its value an object (typeof); an
// element of it renders in place as React renders it, its function called
// with its props and its ref; one given defaultProps afterwards keeps them.
// React's createContext is a function, and what a context's Provider holds
// is read from it.
var Button = React.forwardRef(function(props, ref) {
  return <button ref={ref} className={props.kind}>{props.label}</button>;
});

var Defaulted = React.forwardRef((props, ref) => <i ref={ref}>{props.text}</i>);
Defaulted.defaultProps = { text: "default text" };

var Ctx = React.createContext("c");

function App(props) {
  var r = React.createRef();
  return (
    <div>
      <Button ref={r} kind="primary" label={props.label} />
      <Button kind="plain" label="no ref" />
      <Defaulted />
      <Defaulted text={props.label} />
    </div>
  );
}

App.facts = [typeof Button, typeof React.forwardRef, typeof React.createContext, Ctx.Provider._context === Ctx, typeof Button.render].join(",");

App.getTrials = function(renderer, Root) {
  renderer.update(<Root label="hello" />);
  return [["forward refs", renderer.toJSON()], ["facts", Root.facts]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
