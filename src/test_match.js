let inner = "[ for k, v in reqs.items()], k, v";
let m = inner.match(/^(.*?)\s+for\s+(.*?)\s+in\s+(.*?)(?:\s+if\s+(.*))?$/);
console.log(m);
