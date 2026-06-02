const fs = require('fs');
const p = 'node_modules/luamin/luamin.js';
if (fs.existsSync(p)) {
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/var joinStatements = function\(a, b, separator\) \{/, 'var joinStatements = function(a, b, separator) {\n\t\tif(separator === ";" && b.charAt(0) === "(") return a + ";" + b;');
  s = s.replace(/type == 'StringLiteral'/g, "type == 'StringLiteral' || type == 'VarargLiteral'");
  fs.writeFileSync(p, s);
}
