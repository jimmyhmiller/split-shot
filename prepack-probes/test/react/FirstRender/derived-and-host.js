var React = require("react");

// getDerivedStateFromProps (static, or assigned) runs instead of
// componentWillMount, a null result changing nothing; defaultProps apply;
// a first render attaches no refs and renders no event handlers or
// functions of host elements, but a custom element's attributes as given.
class Derived extends React.Component {
  constructor(props) {
    super(props);
    this.state = { base: "b" };
  }
  static getDerivedStateFromProps(props, state) {
    return props.skip ? null : { base: state.base + props.suffix };
  }
  componentWillMount() {
    this.setState({ base: "never" });
  }
  render() {
    return <p data-fn={() => 1}>{this.state.base}</p>;
  }
}
Derived.defaultProps = { suffix: "!" };

class Assigned extends React.Component {
  render() {
    return <custom-el onfoo="kept" class="c">{this.state.t}</custom-el>;
  }
}
Assigned.getDerivedStateFromProps = function(props) {
  return { t: "t" + props.n };
};

function App(props) {
  return (
    <div>
      <Derived ref={() => {}} />
      <Derived skip={true} suffix="?" />
      <Derived suffix={props.s} />
      <Assigned n={props.n} />
      <input onChange={props.onChange} value="v" readOnly={true} />
    </div>
  );
}

App.getTrials = function(renderer, Root) {
  renderer.update(<Root s="#" n={7} onChange={function() {}} />);
  return [["mounted", renderer.toJSON()]];
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App, { firstRenderOnly: true });
}

module.exports = App;
