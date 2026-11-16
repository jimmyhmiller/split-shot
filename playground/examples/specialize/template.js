// A tiny template engine: "{name}" is replaced by data.name. The template is
// static, so it is scanned once, now; the residual just concatenates.
function render(template, data) {
  let out = "";
  let i = 0;
  while (i < template.length) {
    if (template[i] === "{") {
      const end = template.indexOf("}", i);
      out = out + data[template.slice(i + 1, end)];
      i = end + 1;
    } else {
      out = out + template[i];
      i = i + 1;
    }
  }
  return out;
}
