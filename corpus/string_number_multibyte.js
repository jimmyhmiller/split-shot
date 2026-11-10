// inputs: [0, "‌", "é"]
// A string constant beginning with a character of more than one byte in
// UTF-8 (U+200C is three) compared with a value, or converted to a number:
// its number is NaN (the conversion read it by bytes and panicked).
function main(input) {
  return [input === "‌", input == "‌", Number("‌"), Number("0x1F"), Number("é"), "\u{1F600}" < input];
}
