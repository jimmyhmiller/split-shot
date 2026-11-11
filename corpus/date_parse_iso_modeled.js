// inputs: [{"x":1}]
// forbid-main: Date\.parse\("2020-01-02T03:04:05Z"|"2020-01-02T03:04:05\.123\+02:00"
// `Date.parse` and `new Date(text)` of the date time string format the language fixes: a date alone (UTC), or a date and time with `Z` or an offset, an extended year; an invalid date in that format stays a runtime call too: V8 reads `2020-02-30` as March 1st where the standard says NaN. A date and time without an offset is local time, and any other text is the implementation's: both stay runtime calls.
function main(input) {
  var texts = ["2020-01-02T03:04:05Z", "2020-01-02T03:04:05.123+02:00", "2020-01-02", "2020-01", "2020", "+275760-09-13T00:00:00.000Z", "+275760-09-13T00:00:00.001Z", "-000001-01-01T00:00:00Z", "-000000-01-01T00:00:00Z",
    "2020-02-30", "2021-02-29", "2020-02-29", "2020-13-01", "2020-01-02T24:00:00Z", "2020-01-02T24:00:01Z", "2020-01-02T23:60:00Z", "2020-01-02T03:04Z", "2020-01-02T03:04:05.1Z", "2020-01-02T03:04:05.123456Z", "2020-01-02T03:04:05+23:59", "2020-01-02T03:04:05+24:00",
    "2020-01-02T03:04:05", "Jan 2 2020", "2020-1-2", ""];
  var out = [];
  for (var i = 0; i < texts.length; i++) {
    var t = Date.parse(texts[i]);
    out.push(texts[i] + "=" + (isNaN(t) ? "NaN" : t) + "/" + new Date(texts[i]).getTime());
  }
  return [out, input.x];
}
