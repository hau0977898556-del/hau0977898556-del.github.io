import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lzmaPkg = require('lzma');
const lzma = lzmaPkg.LZMA(); // Or LZMA_worker, let's check

async function test() {
  const input = Buffer.from('print("Hello World")', 'utf8');
  lzma.compress(input, 1, (result: any) => {
    const compressed = Buffer.from(result);
    console.log("Compressed length:", compressed.length);
    console.log("First 20 bytes (HEX):", compressed.subarray(0, 20).toString('hex'));
    
    // Bytes 5-12
    const sizeBuf = compressed.subarray(5, 13);
    console.log("Bytes 5-12 (HEX):", sizeBuf.toString('hex'));
    console.log("Expected uncompressed size:", input.length);
  });
}

test();
