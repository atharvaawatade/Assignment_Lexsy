const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: "AIzaSyDJYqdQAmp2MGUV3nPK5JHbouCeEBEN868",
});

async function main() {
    try {
        console.log("Testing Gemini API...");
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: "Say 'Hello from Gemini!' in a friendly way",
        });
        console.log("✅ Gemini API Response:", response.text);
    } catch (error) {
        console.error("❌ Gemini API Error:", error.message);
    }
}

main();
