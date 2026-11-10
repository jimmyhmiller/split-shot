var React = require("react");

// Consumers under Providers rendered in place get those Providers' values
// (the innermost of a context's); a Consumer with no Provider of its context
// in the root reads it at runtime (a Provider may be above the root); a
// Provider something below still reads at runtime stays.
var Theme = React.createContext("light");
var User = React.createContext("nobody");

function Label(props) {
  return (
    <Theme.Consumer>
      {theme => <span className={theme}>{props.text}</span>}
    </Theme.Consumer>
  );
}

function Who() {
  return <User.Consumer>{user => <b>{user}</b>}</User.Consumer>;
}

function Opaque(props) {
  return <i>{props.children}</i>;
}

function App(props) {
  return (
    <Theme.Provider value="dark">
      <div>
        <Label text="outer" />
        <Theme.Provider value={props.mode}>
          <Label text="inner" />
        </Theme.Provider>
        <Who />
        <User.Provider value={props.user}>
          <Who />
          <Opaque>
            <Theme.Consumer>{t => t + "!"}</Theme.Consumer>
          </Opaque>
        </User.Provider>
      </div>
    </Theme.Provider>
  );
}

App.getTrials = function(renderer, Root) {
  renderer.update(<Root mode="blue" user="ann" />);
  let a = renderer.toJSON();
  renderer.update(<Root mode="green" user="bob" />);
  return [["first", a], ["second", renderer.toJSON()]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
