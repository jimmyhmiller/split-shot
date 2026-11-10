//! ECMAScript regular expressions over UTF-16 code units, for folding
//! `RegExp` operations on static strings.
//!
//! Matching uses `regress`, an ECMAScript-compliant backtracking engine: a
//! pattern without the `u`/`v` flag matches code units (UCS-2), one with it
//! matches code points, as in JS. Indices are UTF-16 code unit indices. The
//! algorithms here follow the spec's `RegExpBuiltinExec`, `GetSubstitution`
//! and `RegExp.prototype[@@split]`.

/// One successful match: the matched range and each capture's range (in
/// UTF-16 units), with the capture group names (empty for unnamed groups).
#[derive(Debug, Clone)]
pub struct Match {
    pub start: usize,
    pub end: usize,
    pub captures: Vec<Option<(usize, usize)>>,
    pub names: Vec<String>,
}

/// A compiled pattern with its JS flags.
pub struct Re {
    re: regress::Regex,
    unicode: bool,
    pub global: bool,
    pub sticky: bool,
    /// The name of each capture group, in order (empty when unnamed).
    names: Vec<String>,
}

impl Re {
    /// Compile `source` with JS `flags`. `None` for a flag this model does
    /// not fold (`d`, which adds `indices`), a repeated or unknown flag (a
    /// SyntaxError at runtime), or a pattern `regress` rejects.
    pub fn new(source: &str, flags: &str) -> Option<Re> {
        let mut seen = std::collections::HashSet::new();
        for c in flags.chars() {
            if !"gimsuyv".contains(c) || !seen.insert(c) {
                return None;
            }
        }
        let engine_flags: String = flags.chars().filter(|c| "imsuv".contains(*c)).collect();
        let re = regress::Regex::with_flags(source, engine_flags.as_str()).ok()?;
        Some(Re {
            re,
            unicode: flags.contains('u') || flags.contains('v'),
            global: flags.contains('g'),
            sticky: flags.contains('y'),
            names: group_names(source),
        })
    }

    /// How many capture groups the pattern has.
    pub fn group_count(&self) -> usize {
        self.names.len()
    }

    /// Whether the pattern matches code points (`u` or `v` flag).
    pub fn unicode_mode(&self) -> bool {
        self.unicode
    }

    /// Whether the pattern has named groups (then a match's `groups` is an
    /// object, otherwise `undefined`).
    pub fn has_named_groups(&self) -> bool {
        self.names.iter().any(|n| !n.is_empty())
    }

    /// The first match starting at or after `start` (exactly at `start` when
    /// `sticky_at`), over UTF-16 code units.
    pub fn find(&self, text: &[u16], start: usize, sticky_at: bool) -> Option<Match> {
        if start > text.len() {
            return None;
        }
        let m = if self.unicode {
            self.re.find_from_utf16(text, start).next()
        } else {
            self.re.find_from_ucs2(text, start).next()
        }?;
        if sticky_at && m.range.start != start {
            return None;
        }
        let mut names = self.names.clone();
        names.resize(m.captures.len(), String::new());
        Some(Match {
            start: m.range.start,
            end: m.range.end,
            captures: m.captures.iter().map(|c| c.as_ref().map(|r| (r.start, r.end))).collect(),
            names,
        })
    }

}

/// The capture groups of a pattern in order, with their names (empty for an
/// unnamed group): every `(` that is not escaped, not inside a character
/// class, and not a `(?` group other than `(?<name>`.
fn group_names(source: &str) -> Vec<String> {
    let cs: Vec<char> = source.chars().collect();
    let mut out = Vec::new();
    let mut i = 0;
    let mut in_class = false;
    while i < cs.len() {
        match cs[i] {
            '\\' => i += 2,
            '[' if !in_class => {
                in_class = true;
                i += 1;
            }
            ']' if in_class => {
                in_class = false;
                i += 1;
            }
            '(' if !in_class => {
                if cs.get(i + 1) == Some(&'?') {
                    // `(?<name>`, but not the lookbehinds `(?<=` / `(?<!`.
                    if cs.get(i + 2) == Some(&'<') && !matches!(cs.get(i + 3), Some('=') | Some('!')) {
                        let close = cs[i + 3..].iter().position(|c| *c == '>').map(|p| i + 3 + p);
                        if let Some(close) = close {
                            out.push(cs[i + 3..close].iter().collect());
                        }
                    }
                } else {
                    out.push(String::new());
                }
                i += 1;
            }
            _ => i += 1,
        }
    }
    out
}

/// `GetSubstitution`: expand `$$`, `$&`, `` $` ``, `$'`, `$n`/`$nn` and
/// `$<name>` in `replacement` for a match `m` of `text`.
pub fn substitute(text: &[u16], m: &Match, replacement: &[u16], named: bool) -> Vec<u16> {
    let mut out = Vec::new();
    let r = replacement;
    let mut i = 0;
    let ncap = m.captures.len();
    let cap = |k: usize| -> &[u16] {
        match m.captures.get(k - 1).copied().flatten() {
            Some((a, b)) => &text[a..b],
            None => &[],
        }
    };
    while i < r.len() {
        let c = r[i];
        if c != b'$' as u16 || i + 1 >= r.len() {
            out.push(c);
            i += 1;
            continue;
        }
        let n = r[i + 1];
        match n {
            0x24 => {
                out.push(0x24);
                i += 2;
            }
            0x26 => {
                out.extend_from_slice(&text[m.start..m.end]);
                i += 2;
            }
            0x60 => {
                out.extend_from_slice(&text[..m.start]);
                i += 2;
            }
            0x27 => {
                out.extend_from_slice(&text[m.end..]);
                i += 2;
            }
            d if (0x30..=0x39).contains(&d) => {
                let d1 = (d - 0x30) as usize;
                // Two digits when that names a capture, else one.
                let two = r.get(i + 2).copied().filter(|x| (0x30..=0x39).contains(x)).map(|x| d1 * 10 + (x - 0x30) as usize);
                match two {
                    Some(k) if k >= 1 && k <= ncap => {
                        out.extend_from_slice(cap(k));
                        i += 3;
                    }
                    _ if d1 >= 1 && d1 <= ncap => {
                        out.extend_from_slice(cap(d1));
                        i += 2;
                    }
                    _ => {
                        out.push(c);
                        i += 1;
                    }
                }
            }
            0x3c if named => {
                // `$<name>`
                match r[i + 2..].iter().position(|x| *x == 0x3e) {
                    Some(close) => {
                        let name = String::from_utf16_lossy(&r[i + 2..i + 2 + close]);
                        if let Some(k) = m.names.iter().position(|n| *n == name) {
                            if let Some((a, b)) = m.captures[k] {
                                out.extend_from_slice(&text[a..b]);
                            }
                        }
                        i += 2 + close + 1;
                    }
                    None => {
                        out.push(c);
                        i += 1;
                    }
                }
            }
            _ => {
                out.push(c);
                i += 1;
            }
        }
    }
    out
}

/// `RegExp.prototype[@@split](text, limit)`: the pieces (as UTF-16 slices)
/// and captures (`None` for a capture that did not participate).
pub fn split(re: &Re, text: &[u16], limit: u32) -> Vec<Option<Vec<u16>>> {
    let mut out: Vec<Option<Vec<u16>>> = Vec::new();
    if limit == 0 {
        return out;
    }
    let size = text.len();
    if size == 0 {
        if re.find(text, 0, true).is_none() {
            out.push(Some(Vec::new()));
        }
        return out;
    }
    let mut p = 0;
    let mut q = 0;
    while q < size {
        match re.find(text, q, true) {
            None => q += 1,
            Some(m) => {
                let e = m.end.min(size);
                if e == p {
                    q += 1;
                    continue;
                }
                out.push(Some(text[p..q].to_vec()));
                if out.len() as u32 == limit {
                    return out;
                }
                for c in &m.captures {
                    out.push(c.map(|(a, b)| text[a..b].to_vec()));
                    if out.len() as u32 == limit {
                        return out;
                    }
                }
                p = e;
                q = p;
            }
        }
    }
    out.push(Some(text[p..size].to_vec()));
    out
}

/// For each capture group of pattern `source` (in order), whether every
/// match gives it a value: a group in no alternation, under no count that
/// allows zero repetitions, and in no lookaround (all of that conservatively,
/// at any depth). `None` for a source this does not read.
pub fn captures_always_set(source: &str) -> Option<Vec<bool>> {
    struct Frame {
        /// The captures inside it, with itself if it captures.
        captures: Vec<usize>,
        /// A lookaround, or an alternation directly inside it.
        optional: bool,
    }
    let cs: Vec<char> = source.chars().collect();
    let mut optional: Vec<bool> = Vec::new();
    let mut frames: Vec<Frame> = vec![Frame { captures: Vec::new(), optional: false }];
    let mut i = 0;
    // What a count after position `j` allows: zero repetitions?
    let zero_count = |j: usize| -> Option<bool> {
        match cs.get(j) {
            Some('?') | Some('*') => Some(true),
            Some('{') => {
                let close = (j..cs.len()).find(|&k| cs[k] == '}')?;
                let body: String = cs[j + 1..close].iter().collect();
                let lo = body.split(',').next()?;
                if lo.is_empty() || !lo.chars().all(|c| c.is_ascii_digit()) {
                    return Some(false); // a literal brace (Annex B)
                }
                Some(lo.parse::<u64>().ok()? == 0)
            }
            _ => Some(false),
        }
    };
    while i < cs.len() {
        match cs[i] {
            '\\' => i += 2,
            '[' => {
                i += 1;
                if cs.get(i) == Some(&'^') {
                    i += 1;
                }
                // (A `]` first in a class is a character.)
                if cs.get(i) == Some(&']') {
                    i += 1;
                }
                while i < cs.len() && cs[i] != ']' {
                    i += if cs[i] == '\\' { 2 } else { 1 };
                }
                i += 1;
            }
            '(' => {
                let mut f = Frame { captures: Vec::new(), optional: false };
                if cs.get(i + 1) == Some(&'?') {
                    match (cs.get(i + 2), cs.get(i + 3)) {
                        (Some(':'), _) => {}
                        (Some('<'), Some('=' | '!')) | (Some('=' | '!'), _) => f.optional = true,
                        (Some('<'), _) => {
                            optional.push(false);
                            f.captures.push(optional.len() - 1);
                        }
                        _ => return None,
                    }
                } else {
                    optional.push(false);
                    f.captures.push(optional.len() - 1);
                }
                frames.push(f);
                i += 1;
            }
            ')' => {
                let f = frames.pop()?;
                if frames.is_empty() {
                    return None;
                }
                let zero = zero_count(i + 1)?;
                if f.optional || zero {
                    for &c in &f.captures {
                        optional[c] = true;
                    }
                }
                frames.last_mut().unwrap().captures.extend(f.captures);
                i += 1;
            }
            '|' => {
                frames.last_mut().unwrap().optional = true;
                i += 1;
            }
            _ => i += 1,
        }
    }
    if frames.len() != 1 {
        return None;
    }
    if frames[0].optional {
        for c in &frames[0].captures {
            optional[*c] = true;
        }
    }
    Some(optional.into_iter().map(|o| !o).collect())
}

#[cfg(test)]
mod capture_tests {
    use super::captures_always_set;

    #[test]
    fn which_captures_always_take_part() {
        assert_eq!(captures_always_set(r"^\/teams\/([^/]+?)\/projects\/([^/]+?)\/files\/(.+?)(?:\/)?$"), Some(vec![true, true, true]));
        assert_eq!(captures_always_set(r"(a)?(b)*(c){0,2}(d){1}(e)+"), Some(vec![false, false, false, true, true]));
        assert_eq!(captures_always_set(r"(a)|(b)"), Some(vec![false, false]));
        assert_eq!(captures_always_set(r"x(?:(a)|b)(c)"), Some(vec![false, true]));
        assert_eq!(captures_always_set(r"(?=(a))(?<n>b)[(]\("), Some(vec![false, true]));
        assert_eq!(captures_always_set(r"((a)?)"), Some(vec![true, false]));
    }
}
