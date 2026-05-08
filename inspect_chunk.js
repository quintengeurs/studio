const fs = require('fs');
const c = fs.readFileSync('.next/server/chunks/ssr/_c578f8fb._.js', 'utf8');

// Find all module-level let/const y declarations
console.log("=== ALL 'let y=' and 'const y=' positions ===");
const patterns = ['let y=', 'const y=', 'let y,', 'const y,'];
patterns.forEach(pattern => {
  let idx = c.indexOf(pattern);
  while (idx !== -1) {
    console.log(`\n"${pattern}" at pos ${idx}:`);
    console.log(c.substring(Math.max(0, idx - 50), idx + 200));
    idx = c.indexOf(pattern, idx + 1);
  }
});

// Look at wider context around 69620 to understand the module boundary
console.log("\n\n=== CONTEXT pos 68500-70000 ===");
// Find module boundaries (look for module wrappers)
const segment = c.substring(68500, 70500);
console.log(segment.substring(0, 2000));
