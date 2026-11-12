// style: template engine (mustache-like: template parsed at load into a token tree, rendered by a recursive walk with a context stack)
// residue: tok_(text|var|raw|section|inverted)
// A hand-written mustache: {{name}} (HTML-escaped), {{{name}}} and {{& name}}
// (raw), {{#name}}...{{/name}} (list, truthy or object section),
// {{^name}}...{{/name}} (inverted), {{! comment}}, dotted names and {{.}}.
// The template, an order confirmation e-mail, is parsed once at load; each
// call renders it against the input object.
const TEMPLATE = `<h1>Order #{{order.id}} for {{customer.name}}</h1>
{{! the greeting depends on the customer's tier }}
{{#customer.vip}}<p class="vip">Thanks for being a {{{customer.tierLabel}}} member!</p>{{/customer.vip}}
{{^customer.vip}}<p>Join our club to save on every order.</p>{{/customer.vip}}
<table>
{{#order.items}}  <tr><td>{{name}}</td><td>{{qty}} x {{price}}</td>{{#tags}}<span>{{.}}</span>{{/tags}}</tr>
{{/order.items}}{{^order.items}}  <tr><td colspan="2">Your cart is empty</td></tr>
{{/order.items}}</table>
<p>Total: {{order.total}} {{& order.currency}}</p>
{{#order.note}}<blockquote>{{order.note}}</blockquote>{{/order.note}}`;

function parseTemplate(src) {
  const root = [];
  const stack = [{ name: null, children: root }];
  let pos = 0;
  while (pos < src.length) {
    const open = src.indexOf("{{", pos);
    if (open < 0) {
      stack[stack.length - 1].children.push({ type: "tok_text", value: src.slice(pos) });
      break;
    }
    if (open > pos) stack[stack.length - 1].children.push({ type: "tok_text", value: src.slice(pos, open) });
    const triple = src[open + 2] === "{";
    const close = src.indexOf(triple ? "}}}" : "}}", open);
    if (close < 0) throw new SyntaxError("unclosed tag at " + open);
    const tag = src.slice(open + (triple ? 3 : 2), close).trim();
    pos = close + (triple ? 3 : 2);
    const children = stack[stack.length - 1].children;
    if (triple) {
      children.push({ type: "tok_raw", name: tag });
      continue;
    }
    const sigil = tag[0];
    const name = tag.slice(1).trim();
    if (sigil === "!") continue;
    if (sigil === "&") {
      children.push({ type: "tok_raw", name });
    } else if (sigil === "#" || sigil === "^") {
      const node = { type: sigil === "#" ? "tok_section" : "tok_inverted", name, children: [] };
      children.push(node);
      stack.push(node);
    } else if (sigil === "/") {
      const top = stack.pop();
      if (top.name !== name) throw new SyntaxError("unclosed section " + top.name + " closed by " + name);
    } else {
      children.push({ type: "tok_var", name: tag });
    }
  }
  if (stack.length !== 1) throw new SyntaxError("unclosed section " + stack[stack.length - 1].name);
  return root;
}

function lookup(stack, name) {
  if (name === ".") return stack[stack.length - 1];
  const parts = name.split(".");
  for (let i = stack.length - 1; i >= 0; i--) {
    const ctx = stack[i];
    if (ctx !== null && typeof ctx === "object" && parts[0] in ctx) {
      let value = ctx[parts[0]];
      for (let j = 1; j < parts.length; j++) {
        if (value === null || value === undefined) return undefined;
        value = value[parts[j]];
      }
      return value;
    }
  }
  return undefined;
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function isFalsy(value) {
  return value === undefined || value === null || value === false || value === "" ||
    (Array.isArray(value) && value.length === 0);
}

function render(tokens, stack) {
  let out = "";
  for (const tok of tokens) {
    switch (tok.type) {
      case "tok_text":
        out += tok.value;
        break;
      case "tok_var": {
        const v = lookup(stack, tok.name);
        if (v !== undefined && v !== null) out += escapeHtml(v);
        break;
      }
      case "tok_raw": {
        const v = lookup(stack, tok.name);
        if (v !== undefined && v !== null) out += String(v);
        break;
      }
      case "tok_section": {
        const v = lookup(stack, tok.name);
        if (isFalsy(v)) break;
        if (Array.isArray(v)) {
          for (const item of v) {
            stack.push(item);
            out += render(tok.children, stack);
            stack.pop();
          }
        } else if (typeof v === "object") {
          stack.push(v);
          out += render(tok.children, stack);
          stack.pop();
        } else {
          out += render(tok.children, stack);
        }
        break;
      }
      case "tok_inverted":
        if (isFalsy(lookup(stack, tok.name))) out += render(tok.children, stack);
        break;
      default:
        throw new Error("unknown token " + tok.type);
    }
  }
  return out;
}

const TOKENS = parseTemplate(TEMPLATE);

export function main(input) {
  return render(TOKENS, [input]);
}

export const inputs = [{},{"order":{"id":1,"items":[],"total":"0.00","currency":"USD"},"customer":{"name":"Empty","vip":false}},{"order":{"id":2,"items":[{"name":"Only","qty":1,"price":"1.00"}],"total":"1.00","note":"hi"},"customer":{"name":"One","vip":true,"tierLabel":"Silver"}},{"order":{"id":3,"items":null,"total":0},"customer":null},{"order":{"id":2160,"items":[{"name":"Desk & Co","qty":5,"price":"45.85","tags":["eco","new"]},{"name":"Chair","qty":2,"price":"20.04","tags":["new","sale","sale"]},{"name":"Lamp <LED>","qty":3,"price":"97.16","tags":["o'clock","o'clock","o'clock"]},{"name":"Mug \"XL\"","qty":5,"price":"84.52","tags":[]},{"name":"Mug \"XL\"","qty":1,"price":"19.54","tags":["eco"]}],"total":"477.95","currency":"<b>$</b>","note":"Leave at <door>"},"customer":{"name":"Ann","vip":true,"tierLabel":"<em>Gold</em>"}},{"order":{"id":4931,"items":[{"name":"Chair","qty":4,"price":"72.05","tags":["new","o'clock"]},{"name":"Pen","qty":5,"price":"69.25","tags":["new","o'clock"]},{"name":"Pen","qty":1,"price":"97.48","tags":["o'clock","o'clock"]},{"name":"Lamp <LED>","qty":1,"price":"37.16","tags":["eco","sale","new"]},{"name":"Pen","qty":5,"price":"49.33","tags":["sale","eco"]},{"name":"Desk & Co","qty":1,"price":"14.01","tags":["new","sale"]},{"name":"Lamp <LED>","qty":2,"price":"21.22","tags":["new","sale"]},{"name":"Pen","qty":3,"price":"29.59","tags":["eco"]},{"name":"Lamp <LED>","qty":5,"price":"58.43","tags":["eco","eco","o'clock"]},{"name":"Pen","qty":3,"price":"72.09","tags":["eco","eco","new"]},{"name":"Desk & Co","qty":4,"price":"45.67","tags":["new"]},{"name":"Desk & Co","qty":1,"price":"55.50","tags":["sale","sale"]},{"name":"Chair","qty":5,"price":"8.93","tags":["sale","eco"]},{"name":"Desk & Co","qty":5,"price":"87.28","tags":["o'clock","new","sale"]},{"name":"Chair","qty":1,"price":"58.89","tags":[]},{"name":"Pen","qty":2,"price":"99.09","tags":["o'clock","o'clock","o'clock"]},{"name":"Lamp <LED>","qty":1,"price":"6.82","tags":["new","new"]},{"name":"Mug \"XL\"","qty":2,"price":"68.32","tags":["new"]},{"name":"Chair","qty":5,"price":"59.79","tags":["o'clock","o'clock","eco"]},{"name":"Pen","qty":2,"price":"51.82","tags":["sale","new"]},{"name":"Lamp <LED>","qty":5,"price":"34.50","tags":["sale","new"]},{"name":"Desk & Co","qty":3,"price":"96.03","tags":[]},{"name":"Pen","qty":1,"price":"26.03","tags":["eco","sale","o'clock"]},{"name":"Desk & Co","qty":5,"price":"7.10","tags":["o'clock","sale","sale"]},{"name":"Mug \"XL\"","qty":1,"price":"6.69","tags":[]},{"name":"Desk & Co","qty":3,"price":"79.57","tags":["eco","sale"]},{"name":"Lamp <LED>","qty":5,"price":"12.95","tags":["sale","new","o'clock"]},{"name":"Pen","qty":4,"price":"3.73","tags":["eco","eco","o'clock"]},{"name":"Desk & Co","qty":4,"price":"32.48","tags":["sale","new"]},{"name":"Mug \"XL\"","qty":3,"price":"25.70","tags":["eco","new","eco"]},{"name":"Lamp <LED>","qty":1,"price":"32.06","tags":["eco","new"]},{"name":"Chair","qty":5,"price":"81.57","tags":["new","new","o'clock"]},{"name":"Desk & Co","qty":1,"price":"52.15","tags":["eco"]},{"name":"Desk & Co","qty":3,"price":"20.73","tags":["eco","o'clock","new"]},{"name":"Chair","qty":2,"price":"97.51","tags":["o'clock"]},{"name":"Chair","qty":3,"price":"86.99","tags":["sale","sale"]},{"name":"Mug \"XL\"","qty":5,"price":"59.07","tags":["o'clock"]},{"name":"Mug \"XL\"","qty":3,"price":"73.05","tags":["eco","o'clock"]},{"name":"Desk & Co","qty":4,"price":"17.04","tags":[]},{"name":"Lamp <LED>","qty":4,"price":"3.52","tags":["o'clock"]}],"total":"434.02","currency":"USD","note":""},"customer":{"name":"Bob <script>","vip":false}}];
