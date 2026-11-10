//! JavaScript numbers: IEEE-754 doubles with JS conversion rules.
//!
//! `JsNum` is the number type of the JS client's abstract values, residual
//! expressions and reference interpreter. Arithmetic on it is plain `f64`
//! arithmetic, which is exactly JS's. Its `Eq`/`Hash` are *identity* (bit
//! patterns, with every NaN equal to every other NaN, and `+0` distinct from
//! `-0`), because they key specialization states: two states holding `0` and
//! `-0` behave differently (`1 / x`). JS equality (`===`, where `NaN !== NaN`
//! and `0 === -0`) is `JsNum::js_eq`, never `==`.

use std::hash::{Hash, Hasher};

#[derive(Clone, Copy, Debug)]
pub struct JsNum(pub f64);

impl JsNum {
    pub fn new(f: f64) -> Self {
        JsNum(f)
    }
    pub fn int(i: i64) -> Self {
        JsNum(i as f64)
    }
    pub fn f(self) -> f64 {
        self.0
    }
    fn bits(self) -> u64 {
        if self.0.is_nan() {
            f64::NAN.to_bits()
        } else {
            self.0.to_bits()
        }
    }
    /// JS `===` on numbers.
    pub fn js_eq(self, o: JsNum) -> bool {
        self.0 == o.0
    }
    /// The value as an exact integer, if it is one (`-0` counts as `0`).
    pub fn as_i64(self) -> Option<i64> {
        let f = self.0;
        if f.is_finite() && f.fract() == 0.0 && f.abs() <= 9007199254740992.0 {
            Some(f as i64)
        } else {
            None
        }
    }
    /// The value as an array index (an integer in `0..2^32-1`), if it is one.
    pub fn as_index(self) -> Option<usize> {
        match self.as_i64() {
            Some(i) if (0..4294967295).contains(&i) => Some(i as usize),
            _ => None,
        }
    }
    pub fn is_zero(self) -> bool {
        self.0 == 0.0
    }
    /// JS truthiness: false for `0`, `-0` and `NaN`.
    pub fn truthy(self) -> bool {
        !(self.0 == 0.0 || self.0.is_nan())
    }
    /// JS `ToInt32`.
    pub fn to_int32(self) -> i32 {
        self.to_uint32() as i32
    }
    /// JS `ToUint32`.
    pub fn to_uint32(self) -> u32 {
        let f = self.0;
        if !f.is_finite() || f == 0.0 {
            return 0;
        }
        let t = f.trunc();
        let m = t.rem_euclid(4294967296.0);
        m as u32
    }

    /// JS `Number.prototype.toString()` (radix 10), i.e. `Number::toString`.
    pub fn to_js_string(self) -> String {
        let x = self.0;
        if x.is_nan() {
            return "NaN".into();
        }
        if x == 0.0 {
            return "0".into();
        }
        if x.is_infinite() {
            return if x > 0.0 { "Infinity".into() } else { "-Infinity".into() };
        }
        if x < 0.0 {
            return format!("-{}", JsNum(-x).to_js_string());
        }
        // Shortest round-tripping digits and exponent: `{:e}` prints
        // `d.ddddde<exp>` with the fewest digits that read back as `x`, which
        // is the digit string the spec's step 5 chooses (k as small as
        // possible); Rust picks the closest such string, as the spec
        // recommends.
        let sci = format!("{:e}", x);
        let (mant, exp) = sci.split_once('e').unwrap();
        let digits: String = mant.chars().filter(|c| *c != '.').collect();
        let k = digits.len() as i32;
        let e: i32 = exp.parse().unwrap();
        let n = e + 1; // the decimal point sits after n digits
        if k <= n && n <= 21 {
            format!("{}{}", digits, "0".repeat((n - k) as usize))
        } else if 0 < n && n <= 21 {
            format!("{}.{}", &digits[..n as usize], &digits[n as usize..])
        } else if -6 < n && n <= 0 {
            format!("0.{}{}", "0".repeat((-n) as usize), digits)
        } else {
            let sign = if n - 1 >= 0 { "+" } else { "-" };
            let ee = (n - 1).abs();
            if k == 1 {
                format!("{}e{}{}", digits, sign, ee)
            } else {
                format!("{}.{}e{}{}", &digits[..1], &digits[1..], sign, ee)
            }
        }
    }

    /// JS `StringToNumber` (what `Number(s)`, unary `+s` and arithmetic
    /// coercion do to a string): surrounding whitespace is ignored, the empty
    /// string is `0`, `0x`/`0o`/`0b` prefixes are integer literals, `Infinity`
    /// is accepted with a sign, and anything else that is not a decimal
    /// literal is `NaN`.
    pub fn parse(s: &str) -> JsNum {
        let t = s.trim_matches(is_js_whitespace);
        if t.is_empty() {
            return JsNum(0.0);
        }
        let radix = |p: &str, r: u32| -> Option<f64> {
            let body = t.strip_prefix(p).or_else(|| t.strip_prefix(&p.to_uppercase()))?;
            if body.is_empty() {
                return Some(f64::NAN);
            }
            let mut v = 0f64;
            for c in body.chars() {
                v = v * r as f64 + c.to_digit(r)? as f64;
            }
            Some(v)
        };
        for (p, r) in [("0x", 16), ("0o", 8), ("0b", 2)] {
            // (By bytes: `t` may begin with a character of more than one.)
            if t.as_bytes().len() >= 2 && t.as_bytes()[..2].eq_ignore_ascii_case(p.as_bytes()) {
                return JsNum(radix(p, r).unwrap_or(f64::NAN));
            }
        }
        let (sign, body) = match t.as_bytes()[0] {
            b'+' => (1.0, &t[1..]),
            b'-' => (-1.0, &t[1..]),
            _ => (1.0, t),
        };
        if body == "Infinity" {
            return JsNum(sign * f64::INFINITY);
        }
        if is_decimal_literal(body) {
            JsNum(sign * body.parse::<f64>().unwrap_or(f64::NAN))
        } else {
            JsNum(f64::NAN)
        }
    }
}

/// The global `parseInt(string, radix)` on an already-converted string and
/// `ToInt32(radix)`: leading whitespace and a sign are skipped, radix 0
/// means 10 (or 16 after a `0x`/`0X` prefix), then the longest prefix of
/// radix digits is read; no digits is `NaN`. `None` when the value is not
/// exactly computable here (a non-decimal radix with more digits than an
/// `f64` holds exactly, where engines round differently).
pub fn parse_int(s: &str, radix: i32) -> Option<JsNum> {
    let mut t = s.trim_start_matches(is_js_whitespace);
    let mut sign = 1.0;
    if let Some(r) = t.strip_prefix('-') {
        sign = -1.0;
        t = r;
    } else if let Some(r) = t.strip_prefix('+') {
        t = r;
    }
    let mut r = radix;
    let mut strip_prefix = true;
    if r != 0 {
        if !(2..=36).contains(&r) {
            return Some(JsNum(f64::NAN));
        }
        if r != 16 {
            strip_prefix = false;
        }
    } else {
        r = 10;
    }
    if strip_prefix && t.len() >= 2 && (t.starts_with("0x") || t.starts_with("0X")) {
        t = &t[2..];
        r = 16;
    }
    let r = r as u32;
    let end = t.char_indices().find(|(_, c)| c.to_digit(r).is_none()).map_or(t.len(), |(i, _)| i);
    let digits = &t[..end];
    if digits.is_empty() {
        return Some(JsNum(f64::NAN));
    }
    let v = if r == 10 {
        // Correctly rounded, as engines do for decimal.
        digits.parse::<f64>().ok()?
    } else {
        let mut v: u128 = 0;
        for c in digits.chars() {
            v = v.checked_mul(r as u128)?.checked_add(c.to_digit(r)? as u128)?;
        }
        if v > (1u128 << 53) {
            return None;
        }
        v as f64
    };
    Some(JsNum(sign * v))
}

/// The global `parseFloat(string)` on an already-converted string: leading
/// whitespace is skipped and the longest prefix that is a
/// `StrDecimalLiteral` (with sign and `Infinity`) is read; none is `NaN`.
pub fn parse_float(s: &str) -> JsNum {
    let t = s.trim_start_matches(is_js_whitespace);
    let (sign, body) = match t.as_bytes().first() {
        Some(b'+') => (1.0, &t[1..]),
        Some(b'-') => (-1.0, &t[1..]),
        _ => (1.0, t),
    };
    if body.starts_with("Infinity") {
        return JsNum(sign * f64::INFINITY);
    }
    let b = body.as_bytes();
    let mut i = 0;
    while i < b.len() && b[i].is_ascii_digit() {
        i += 1;
    }
    let mut mant = i;
    if i < b.len() && b[i] == b'.' {
        let f = i + 1;
        let mut j = f;
        while j < b.len() && b[j].is_ascii_digit() {
            j += 1;
        }
        mant += j - f;
        if mant > 0 {
            i = j;
        }
    }
    if mant == 0 {
        return JsNum(f64::NAN);
    }
    if i < b.len() && (b[i] == b'e' || b[i] == b'E') {
        let mut j = i + 1;
        if j < b.len() && (b[j] == b'+' || b[j] == b'-') {
            j += 1;
        }
        let e = j;
        while j < b.len() && b[j].is_ascii_digit() {
            j += 1;
        }
        if j > e {
            i = j;
        }
    }
    JsNum(sign * body[..i].parse::<f64>().unwrap_or(f64::NAN))
}

/// `StrUnsignedDecimalLiteral` without `Infinity`: digits with an optional
/// fraction and exponent, at least one digit in the mantissa.
fn is_decimal_literal(s: &str) -> bool {
    let b = s.as_bytes();
    let mut i = 0;
    let int_start = i;
    while i < b.len() && b[i].is_ascii_digit() {
        i += 1;
    }
    let mut mant_digits = i - int_start;
    if i < b.len() && b[i] == b'.' {
        i += 1;
        let f = i;
        while i < b.len() && b[i].is_ascii_digit() {
            i += 1;
        }
        mant_digits += i - f;
    }
    if mant_digits == 0 {
        return false;
    }
    if i < b.len() && (b[i] == b'e' || b[i] == b'E') {
        i += 1;
        if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
            i += 1;
        }
        let e = i;
        while i < b.len() && b[i].is_ascii_digit() {
            i += 1;
        }
        if i == e {
            return false;
        }
    }
    i == b.len()
}

/// JS `WhiteSpace` and `LineTerminator` code points (what `String.prototype.trim`
/// and `StringToNumber` strip).
pub fn is_js_whitespace(c: char) -> bool {
    matches!(
        c,
        '\u{9}' | '\u{A}' | '\u{B}' | '\u{C}' | '\u{D}' | ' ' | '\u{A0}' | '\u{1680}'
            | '\u{2000}'..='\u{200A}'
            | '\u{2028}' | '\u{2029}' | '\u{202F}' | '\u{205F}' | '\u{3000}' | '\u{FEFF}'
    )
}

impl PartialEq for JsNum {
    fn eq(&self, o: &Self) -> bool {
        self.bits() == o.bits()
    }
}
impl Eq for JsNum {}
impl Hash for JsNum {
    fn hash<H: Hasher>(&self, h: &mut H) {
        self.bits().hash(h);
    }
}
impl PartialOrd for JsNum {
    fn partial_cmp(&self, o: &Self) -> Option<std::cmp::Ordering> {
        self.0.partial_cmp(&o.0)
    }
}
impl From<i64> for JsNum {
    fn from(i: i64) -> Self {
        JsNum::int(i)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn number_to_string_matches_js() {
        let cases: &[(f64, &str)] = &[
            (0.0, "0"),
            (-0.0, "0"),
            (1.0, "1"),
            (-7.0, "-7"),
            (7.9, "7.9"),
            (0.1 + 0.2, "0.30000000000000004"),
            (1e21, "1e+21"),
            (1e20, "100000000000000000000"),
            (123456789012345680000.0, "123456789012345680000"),
            (0.000001, "0.000001"),
            (1e-7, "1e-7"),
            (1.5e-7, "1.5e-7"),
            (2.5e25, "2.5e+25"),
            (f64::NAN, "NaN"),
            (f64::INFINITY, "Infinity"),
            (f64::NEG_INFINITY, "-Infinity"),
            (5e-324, "5e-324"),
            (1.7976931348623157e308, "1.7976931348623157e+308"),
            (123.456, "123.456"),
            (100.0, "100"),
        ];
        for (x, s) in cases {
            assert_eq!(JsNum(*x).to_js_string(), *s, "{x:e}");
        }
    }

    #[test]
    fn string_to_number_matches_js() {
        let nan = |s: &str| assert!(JsNum::parse(s).f().is_nan(), "{s:?}");
        let is = |s: &str, v: f64| assert_eq!(JsNum::parse(s), JsNum(v), "{s:?}");
        is("", 0.0);
        is("  \n", 0.0);
        is(" 42 ", 42.0);
        is("-3.5", -3.5);
        is("+.5", 0.5);
        is("5.", 5.0);
        is("1e3", 1000.0);
        is("0x1F", 31.0);
        is("0b101", 5.0);
        is("0o17", 15.0);
        is("-Infinity", f64::NEG_INFINITY);
        is("-0", -0.0);
        nan("abc");
        nan("\u{200c}");
        nan("😀");
        nan("1e");
        nan(".");
        nan("0x");
        nan("-0x10");
        nan("infinity");
        nan("1_000");
    }

    #[test]
    fn int32_conversions() {
        assert_eq!(JsNum(4294967296.0 + 5.0).to_int32(), 5);
        assert_eq!(JsNum(2147483648.0).to_int32(), -2147483648);
        assert_eq!(JsNum(-1.0).to_uint32(), 4294967295);
        assert_eq!(JsNum(-1.5).to_int32(), -1);
        assert_eq!(JsNum(f64::NAN).to_int32(), 0);
    }

    #[test]
    fn identity_vs_js_equality() {
        assert_ne!(JsNum(0.0), JsNum(-0.0));
        assert!(JsNum(0.0).js_eq(JsNum(-0.0)));
        assert_eq!(JsNum(f64::NAN), JsNum(-f64::NAN));
        assert!(!JsNum(f64::NAN).js_eq(JsNum(f64::NAN)));
    }
}

#[cfg(test)]
mod parse_global_tests {
    use super::*;
    fn pi(s: &str, r: i32) -> String {
        parse_int(s, r).map(|n| n.to_js_string()).unwrap_or("none".into())
    }
    #[test]
    fn parse_int_cases() {
        assert_eq!(pi("  42px", 0), "42");
        assert_eq!(pi("-0", 0), "0");
        assert!(parse_int("-0", 0).unwrap().f().is_sign_negative());
        assert_eq!(pi("0x1F", 0), "31");
        assert_eq!(pi("0x1F", 16), "31");
        assert_eq!(pi("0x1F", 10), "0");
        assert_eq!(pi("z", 36), "35");
        assert_eq!(pi("12", 1), "NaN");
        assert_eq!(pi("", 0), "NaN");
        assert_eq!(pi("-", 0), "NaN");
        assert_eq!(pi("1e3", 0), "1");
        assert_eq!(pi("123456789012345678901234567890", 10), "1.2345678901234568e+29");
        assert_eq!(pi("ffffffffffffffffffff", 16), "none");
    }
    #[test]
    fn parse_float_cases() {
        let pf = |s: &str| parse_float(s).to_js_string();
        assert_eq!(pf(" 3.14abc"), "3.14");
        assert_eq!(pf("1e"), "1");
        assert_eq!(pf("1e+"), "1");
        assert_eq!(pf("1.5e3x"), "1500");
        assert_eq!(pf(".5"), "0.5");
        assert_eq!(pf("5."), "5");
        assert_eq!(pf("."), "NaN");
        assert_eq!(pf("-Infinityx"), "-Infinity");
        assert_eq!(pf("0x10"), "0");
        assert!(parse_float("-0").f().is_sign_negative());
    }
}
