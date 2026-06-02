const fs = require('fs');
let text = fs.readFileSync('/app/applet/server.ts', 'utf8');
let target = 'const garbs = ["if false then local _={};for i=1,10 do _[i]=i end end;", "local function _fake() return {} end;", "if not script then local _=1 end;", "local _fake_env = getfenv and getfenv() or _ENV;", "(function() local _=false end)();"];';
let replacement = 'const garbs = ["if false then local _={};for i=1,10 do _[i]=i end end;", "local function _fake() return {} end;", "if not script then local _=1 end;", "local _fake_env = getfenv and getfenv() or _ENV;", "(function() local _=false end)();", "local _ = ``;", "local _af = `antiformat`;"];';
if (text.includes(target)) {
  text = text.replace(target, replacement);
  fs.writeFileSync('/app/applet/server.ts', text);
  console.log('Successfully patched array via file');
} else {
  console.log('Target string not found');
}
