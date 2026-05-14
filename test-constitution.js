const fs = require('fs');

// Read the PDF file (you'll need to extract text first)
// For now, let's see if you have the constitution as text

console.log("Checking if constitution file exists...");
console.log("Files in current directory:", fs.readdirSync('.'));

// If you have constitution.js, test it
try {
  const constitution = require('./constitution');
  console.log("✅ constitution.js loaded successfully");
  console.log("Length:", constitution.length);
  console.log("First 300 chars:\n", constitution.slice(0, 300));
} catch (err) {
  console.log("❌ No constitution.js file found");
  console.log("Error:", err.message);
}