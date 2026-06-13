import axios from 'axios';
import * as fs from 'fs';

async function test() {
  try {
    console.log("Sleeping 6 seconds first...");
    await new Promise(r => setTimeout(r, 6000));

    const response = await axios.post('http://localhost:3000/api/obfuscate', {
      code: 'print("Hello World")',
      preset: 'MinRay V2'
    });
    
    const obfCode = response.data.code;
    fs.writeFileSync('sample_obfuscated.lua', obfCode, 'utf-8');
    
    // Read and count newlines
    const lines = obfCode.split(/\r?\n/);
    console.log("Number of lines in sample_obfuscated.lua:", lines.length);
    for (let i = 0; i < lines.length; i++) {
      console.log(`Line ${i+1}: length ${lines[i].length}, preview: ${lines[i].substring(0, 80)}...`);
    }
  } catch (err: any) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

test();
