import axios from 'axios';
import * as fs from 'fs';

async function test() {
  try {
    console.log("Generating script for inspection...");
    const response = await axios.post('http://localhost:3000/api/obfuscate', {
      code: 'print("Hello World")',
      preset: 'MinRay V2'
    });
    
    const obfCode = response.data.code;
    const lines = obfCode.split('\n');
    console.log(`TOTAL LINES GENERATED: ${lines.length}`);
    
    // Print around line 161, 232, 316
    const printRange = (label: string, targetLine: number) => {
      console.log(`\n--- ${label} (around line ${targetLine}) ---`);
      const start = Math.max(1, targetLine - 5);
      const end = Math.min(lines.length, targetLine + 5);
      for (let i = start; i <= end; i++) {
        console.log(`${i}: ${lines[i - 1]}`);
      }
    };
    
    printRange("Line 161", 161);
    printRange("Line 232", 232);
    printRange("Line 316", 316);
    
  } catch (err: any) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

test();
