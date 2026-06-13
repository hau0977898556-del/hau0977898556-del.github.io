import axios from 'axios';

async function test() {
  try {
    console.log("Generating the newest MinRay V2 script...");
    const response = await axios.post('http://localhost:3000/api/obfuscate', {
      code: 'print("Hello")',
      preset: 'MinRay V2'
    });
    
    const code = response.data.code;
    console.log("GENERATED CODE (first 400 chars):");
    console.log(code.substring(0, 400));
  } catch (err: any) {
    console.error("Setup Error:", err.message);
  }
}

test();
