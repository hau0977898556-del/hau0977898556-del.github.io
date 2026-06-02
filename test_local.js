const { execSync } = require('child_process');
const fs = require('fs');

const run = `
local Compiler = require("psu/Prometheus-0.2.9/src/prometheus/compiler")
local ast = Compiler:Compile([[
local j = 1
local h = 2
local i = 1
j[h] = i
]], {
    Steps = {
        require("psu/Prometheus-0.2.9/src/prometheus/steps/ProxifyLocals")
    }
})
print("SUCCESS!")
`
fs.writeFileSync('run_local.lua', run);
