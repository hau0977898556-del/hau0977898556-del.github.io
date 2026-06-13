import * as fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const lzmaPkg = require('lzma');
const lzma = lzmaPkg.LZMA();

function decodeBase85Special(str: string): Buffer {
  const alphabet = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu';
  // Replace 'z' with '!!!!!'
  let workStr = str.replace(/z/g, '!!!!!');
  
  const alphabetMap = new Map<string, number>();
  for (let i = 0; i < alphabet.length; i++) {
    alphabetMap.set(alphabet[i], i);
  }
  
  const outBytes: number[] = [];
  for (let i = 0; i < workStr.length; i += 5) {
    const chunk = workStr.substring(i, i + 5);
    if (chunk.length < 5) break; 
    
    let V = 0;
    for (let k = 0; k < 5; k++) {
      const char = chunk[k];
      const val = alphabetMap.get(char);
      if (val === undefined) {
        throw new Error(`Invalid base85 char: ${char}`);
      }
      V = V * 85 + val;
    }
    
    const b0 = V % 256;
    const b1 = Math.floor(V / 256) % 256;
    const b2 = Math.floor(V / 65536) % 256;
    const b3 = Math.floor(V / 16777216) % 256;
    
    outBytes.push(b0, b1, b2, b3);
  }
  
  return Buffer.from(outBytes);
}

function lzmaDecompress(buf: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // Need to pass array of bytes to lzmaPkg
    lzma.decompress(buf, (result: any, err: any) => {
      if (err) {
        reject(err);
      } else {
        if (typeof result === 'string') {
          resolve(result);
        } else if (Buffer.isBuffer(result)) {
          resolve(result.toString('utf8'));
        } else {
          resolve(Buffer.from(result).toString('utf8'));
        }
      }
    });
  });
}

async function run() {
  try {
    const code = fs.readFileSync('sample_obfuscated.lua', 'utf-8');
    
    // Extract base85 for K
    const kStartMarker = 'local K=G(';
    const kIndex = code.indexOf(kStartMarker);
    if (kIndex === -1) {
      throw new Error("Could not find K start in code");
    }
    
    // Find the opening bracket bracket details e.g. [[MRAY or [===[MRAY
    const searchAreaK = code.substring(kIndex + kStartMarker.length, kIndex + 200);
    const mrayIdxK = searchAreaK.indexOf('MRAY');
    if (mrayIdxK === -1) {
      throw new Error("Could not find MRAY in searchAreaK");
    }
    const bracketOpenK = searchAreaK.substring(0, mrayIdxK);
    const bracketCloseK = bracketOpenK.replace(/\[/g, ']');
    
    const realStartK = kIndex + kStartMarker.length + mrayIdxK + 4;
    const endK = code.indexOf(bracketCloseK, realStartK);
    if (endK === -1) {
      throw new Error(`Could not find matching close bracket for K: ${bracketCloseK}`);
    }
    const b85_K = code.substring(realStartK, endK);
    
    // Find K sub length
    const kSubMarker = '_sub(K,1,';
    const kSubIdx = code.indexOf(kSubMarker);
    if (kSubIdx === -1) {
       throw new Error("Could not find K sub length");
    }
    const kLenStr = code.substring(kSubIdx + kSubMarker.length, code.indexOf(')', kSubIdx));
    const expectedLenK = parseInt(kLenStr, 10);
    
    console.log(`Detected b85_K (length: ${b85_K.length}), expected decrypted size: ${expectedLenK}`);
    
    // Now decode K
    let decodedK = decodeBase85Special(b85_K);
    decodedK = decodedK.subarray(0, expectedLenK);
    console.log(`Decoded K (actual size: ${decodedK.length})`);
    
    // Extract base85 for cN
    const cNStartMarker = 'local cN=G(';
    const cNIndex = code.indexOf(cNStartMarker);
    if (cNIndex === -1) {
      throw new Error("Could not find cN start in code");
    }
    const searchAreaCN = code.substring(cNIndex + cNStartMarker.length, cNIndex + 200);
    const mrayIdxCN = searchAreaCN.indexOf('MRAY');
    if (mrayIdxCN === -1) {
       throw new Error("Could not find MRAY in searchAreaCN");
    }
    const bracketOpenCN = searchAreaCN.substring(0, mrayIdxCN);
    const bracketCloseCN = bracketOpenCN.replace(/\[/g, ']');
    
    const realStartCN = cNIndex + cNStartMarker.length + mrayIdxCN + 4;
    const endCN = code.indexOf(bracketCloseCN, realStartCN);
    if (endCN === -1) {
       throw new Error(`Could not find matching close bracket for cN: ${bracketCloseCN}`);
    }
    const b85_CN = code.substring(realStartCN, endCN);
    
    // Find cN sub length
    const cNSubMarker = '_sub(cN,1,';
    const cNSubIdx = code.indexOf(cNSubMarker);
    if (cNSubIdx === -1) {
       throw new Error("Could not find cN sub length");
    }
    const cNLenStr = code.substring(cNSubIdx + cNSubMarker.length, code.indexOf(')', cNSubIdx));
    const expectedLenCN = parseInt(cNLenStr, 10);
    
    console.log(`Detected b85_CN (length: ${b85_CN.length}), expected decrypted size: ${expectedLenCN}`);
    
    // Decode cN
    let decodedCN = decodeBase85Special(b85_CN);
    decodedCN = decodedCN.subarray(0, expectedLenCN);
    console.log(`Decoded cN (actual size: ${decodedCN.length})`);
    
    // Decompress K (Security)
    console.log("Decompressing security (K)...");
    const securityCode = await lzmaDecompress(decodedK);
    console.log("Decompressed Security Code successfully!");
    
    // Decompress cN (Payload)
    console.log("Decompressing payload (cN)...");
    const payloadCode = await lzmaDecompress(decodedCN);
    console.log("Decompressed Payload Code successfully!");
    
    console.log("\n--- SECURITY WRAPPER (length:", securityCode.length, ") ---");
    console.log(securityCode.substring(0, 500) + "\n...");
    
    console.log("\n--- DECOMPRESSED PAYLOAD (length:", payloadCode.length, ") ---");
    console.log(payloadCode.substring(0, 1000) + "\n... (truncated) ...");
    
    fs.writeFileSync('deobfuscated_output.lua', payloadCode, 'utf-8');
    fs.writeFileSync('security_wrapper.lua', securityCode, 'utf-8');
    console.log("\nSaved decompression outputs to 'deobfuscated_output.lua' and 'security_wrapper.lua'!");
    
    // Now post to xhider.xyz
    console.log("\nPosting decompressed payload to xhider.xyz...");
    const axios = require('axios');
    const qs = require('qs');
    
    const postData = {
      action: 'save',
      api_token: 'e7ec2a4cd8eaa07a3b66ca2add917ba4',
      key: 'MinRay/Core-Src.lua',
      expire: '1d',
      content: payloadCode
    };
    
    try {
      const response = await axios.post('https://xhider.xyz/', qs.stringify(postData), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      console.log("\n--- POST RESPONSE FROM XHIDER ---");
      console.log("Status:", response.status);
      console.log("Headers:", response.headers);
      console.log("Body:", JSON.stringify(response.data, null, 2));
      console.log("\nSuccessfully posted!");
    } catch (postErr: any) {
      console.error("\nFailed posting to xhider.xyz:", postErr.message || postErr);
      if (postErr.response) {
        console.error("Response data:", postErr.response.data);
      }
    }
  } catch (err: any) {
    console.error("Error in decode:", err.message || err);
  }
}

run();
