import axios from 'axios';
import * as fs from 'fs';
import { execSync } from 'child_process';

async function test() {
  try {
    console.log("Setting execute permission on ./luau...");
    try {
      fs.chmodSync('./luau', 0o755);
    } catch (e: any) {
      console.warn("Could not chmod ./luau:", e.message);
    }

    console.log("Generating MinRay V2 script via API...");
    const response = await axios.post('http://localhost:3000/api/obfuscate', {
      code: 'print("Hello World from dynamic API call!")',
      preset: 'MinRay V2'
    });
    
    const obfCode = response.data.code;
    fs.writeFileSync('temp_test.lua', obfCode, 'utf-8');
    console.log("Generated temp_test.lua successfully. Running with Luau...");
    
    try {
      const output = execSync('./luau temp_test.lua', { encoding: 'utf-8' });
      console.log("Luau Execution Success:");
      console.log(output);
    } catch (execErr: any) {
      console.log("Luau Execution Failed with error:");
      console.log(execErr.stdout || "");
      console.error(execErr.stderr || execErr.message);
    }
  } catch (err: any) {
    console.error("Setup/Execution Error:", err.response ? err.response.data : err.message || err);
  } finally {
    if (fs.existsSync('temp_test.lua')) {
      fs.unlinkSync('temp_test.lua');
    }
  }
}

test();
