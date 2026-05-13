const c =
  "1:1,18;2:1-2,13-18;3:1-2,13-18;4:1-18;5:1-18;6:1-2;8:3-17;6:4-18;7:1-2;9:3-17;7:4-18";

function expand(s) {
  const r = [];
  for (const t of s.split(";")) {
    const [a, b] = t.split(":");
    for (const u of b.split(",")) {
      const [v, w] = u.includes("-") ? u.split("-").map((x) => +x) : [+u, +u];
      for (let x = v; x <= w; x++) r.push([+a, x]);
    }
  }
  return r;
}

export default expand(c);
