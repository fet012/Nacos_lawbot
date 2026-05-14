// utils/truncate.js
function truncateByBytes(str, maxBytes) {
    let encoder = new TextEncoder();
    let encoded = encoder.encode(str);
    if (encoded.length <= maxBytes) return str;
    
    // Truncate to maxBytes
    let truncated = encoded.slice(0, maxBytes);
    // Find last newline to avoid cutting in middle of a line
    let lastNewline = truncated.lastIndexOf(10); // 10 is newline char code
    if (lastNewline > 0) {
        truncated = truncated.slice(0, lastNewline);
    }
    return new TextDecoder().decode(truncated) + "\n\n[Constitution truncated due to length...]";
}

// Approximate tokens: 1 token ~ 4 characters for English text
// 12000 tokens ≈ 48000 characters, leaving room for prompt and user message
const MAX_CONSTITUTION_CHARS = 38000; // Conservative estimate

function getTruncatedConstitution(fullText) {
    if (fullText.length <= MAX_CONSTITUTION_CHARS) return fullText;
    return truncateByBytes(fullText, MAX_CONSTITUTION_CHARS);
}

module.exports = { getTruncatedConstitution };