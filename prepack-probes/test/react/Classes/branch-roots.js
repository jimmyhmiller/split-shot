var React = require("react");

// Stateful classes a root's tree renders as elements: each is a root of its
// own (its `render` a model body), rendering function components in place,
// across state changes made by its lifecycle, keyed lists of it, and one
// such class inside another.

function Row(props) {
  return props.on ? <i>{props.label}</i> : <s>{props.label}</s>;
}

class Inner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { ticks: 0 };
  }
  componentDidMount() {
    this.setState({ ticks: this.state.ticks + 1 });
  }
  label() {
    return this.props.name + ":" + this.state.ticks;
  }
  render() {
    return <Row on={this.state.ticks > 0} label={this.label()} />;
  }
}

class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { mounted: false };
  }
  componentDidMount() {
    this.setState({ mounted: true });
  }
  render() {
    return (
      <div>
        <Row on={this.state.mounted} label={this.props.title} />
        {this.props.nested ? <Inner name={this.props.title} /> : null}
      </div>
    );
  }
}

function App(props) {
  return (
    <section>
      <Counter title={props.title} nested={props.nested} />
      {props.items.map(function(k) {
        return <Counter key={k} title={k} nested={false} />;
      })}
    </section>
  );
}

App.getTrials = function(renderer, Root) {
  let results = [];
  renderer.update(<Root title="a" nested={false} items={["x"]} />);
  results.push(["first", renderer.toJSON()]);
  renderer.update(<Root title="b" nested={true} items={["x", "y"]} />);
  results.push(["nested", renderer.toJSON()]);
  renderer.update(<Root title="b" nested={true} items={["y"]} />);
  results.push(["same", renderer.toJSON()]);
  renderer.update(<Root title="c" nested={false} items={[]} />);
  results.push(["unnested", renderer.toJSON()]);
  return results;
};

if (this.__optimizeReactComponentTree) {
  __optimizeReactComponentTree(App);
}

module.exports = App;
