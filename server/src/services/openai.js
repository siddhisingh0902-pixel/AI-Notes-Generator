const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

async function generateNotes(text) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
Generate clean, structured study notes from the following text.

Requirements:
- Proper headings
- Bullet points
- Easy to understand
- Important concepts highlighted
- Summary section

Text:
${text.slice(0, 5000)}
`;

    const result = await model.generateContent(prompt);

    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

module.exports = { generateNotes };