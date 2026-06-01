import { GoogleGenerativeAI } from '@google/generative-ai';

console.log(
  'Gemini key loaded:',
  process.env.GEMINI_API_KEY?.slice(0, 10)
);

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY as string
);

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
async function executeWithRetry(apiCall: () => Promise<any>, retries = 3, delay = 5000): Promise<any> {
  try {
    return await apiCall();
  } catch (error: any) {
    if ((error?.status === 429 || error?.message?.includes('429')) && retries > 0) {
      console.warn(`[Gemini API Rate Limited]: Retrying invocation in ${delay / 1000}s... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return executeWithRetry(apiCall, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const extractTopics = async (rawText: string): Promise<any[]> => {
  const prompt = `Extract syllabus units and topics from the following text:\n\n${rawText.slice(0, 10000)}`;

  const responseSchema = {
    type: "ARRAY" as const,
    description: "List of syllabus units and their internal core concepts.",
    items: {
      type: "OBJECT" as const,
      properties: {
        unit_number: { type: "NUMBER" as const },
        unit_title: { type: "STRING" as const },
        topics: { type: "ARRAY" as const, items: { type: "STRING" as const } }
      },
      required: ["unit_number", "unit_title", "topics"],
    }
  };

  return executeWithRetry(async () => {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
      }
    });
    return JSON.parse(result.response.text());
  });
};

export const generateAllTopicContent = async (topic: string, subject?: string): Promise<any> => {
  const prompt = `
Generate highly comprehensive study materials for:
Topic: "${topic}"
Subject: "${subject || 'General'}"

You must return a single JSON object containing notes, descriptive questions and MCQs.
`;

  const responseSchema = {
    type: "OBJECT" as const,
    properties: {
      notes: {
        type: "OBJECT" as const,
        properties: {
          content: { type: "STRING" as const, description: "Highly extensive study notes written with rich Markdown formatting." },
          summary: { type: "STRING" as const, description: "A high-level condensed overview of the topic." },
          key_points: { type: "ARRAY" as const, items: { type: "STRING" as const } }
        },
        required: ["content", "summary", "key_points"]
      },
      questions: {
        type: "ARRAY" as const,
        items: {
          type: "OBJECT" as const,
          properties: {
            question_text: { type: "STRING" as const },
            answer: { type: "STRING" as const },
            type: { type: "STRING" as const, enum: ["important", "viva", "short", "long"] },
            difficulty: { type: "STRING" as const, enum: ["easy", "medium", "hard"] }
          },
          required: ["question_text", "answer", "type", "difficulty"]
        }
      },
      mcqs: {
        type: "ARRAY" as const,
        items: {
          type: "OBJECT" as const,
          properties: {
            question_text: { type: "STRING" as const },
            option_a: { type: "STRING" as const },
            option_b: { type: "STRING" as const },
            option_c: { type: "STRING" as const },
            option_d: { type: "STRING" as const },
            correct_option: { type: "STRING" as const, enum: ["A", "B", "C", "D"] },
            explanation: { type: "STRING" as const },
            difficulty: { type: "STRING" as const, enum: ["easy", "medium", "hard"] }
          },
          required: ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation", "difficulty"]
        }
      }
    },
    required: ["notes", "questions", "mcqs"]
  };

  return executeWithRetry(async () => {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
      }
    });
    return JSON.parse(result.response.text());
  });
};

export const chatWithAI = async (message: string, history?: any[], context?: string): Promise<string> => {
  const prompt = `You are a helpful AI study assistant.\nContext:\n${context || 'No context'}\nMessage:\n${message}`;
  return executeWithRetry(async () => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
};

export const generateNotes = async (rawText: string): Promise<any> => {
  const prompt = `Generate extensive study notes in markdown based directly on this text:\n\n${rawText.slice(0, 10000)}`;
  const responseSchema = {
    type: "OBJECT" as const,
    properties: {
      content: { type: "STRING" as const },
      summary: { type: "STRING" as const },
      key_points: { type: "ARRAY" as const, items: { type: "STRING" as const } }
    },
    required: ["content", "summary", "key_points"]
  };

  return executeWithRetry(async () => {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema as any }
    });
    return JSON.parse(result.response.text());
  });
};

const fileToGenerativePart = (buffer: Buffer, mimeType: string) => {
  return { inlineData: { data: buffer.toString("base64"), mimeType } };
};

export const extractTopicsFromMultimodal = async (fileBuffer: Buffer, mimeType: string, rawText?: string): Promise<any[]> => {
  let contents: any[] = [];
  if ((mimeType === 'application/pdf' || mimeType === 'text/plain') && rawText) {
    contents = [{ role: 'user', parts: [{ text: `Extract syllabus units and topics from this raw text:\n\n${rawText}` }] }];
  } else {
    const imagePart = fileToGenerativePart(fileBuffer, mimeType);
    contents = [{
      role: 'user',
      parts: [
        { text: "Analyze this uploaded syllabus snapshot carefully. Extract all structured syllabus units, chapters, and their inner detailed technical topics." },
        imagePart
      ]
    }];
  }

  const responseSchema = {
    type: "ARRAY" as const,
    items: {
      type: "OBJECT" as const,
      properties: {
        unit_number: { type: "NUMBER" as const },
        unit_title: { type: "STRING" as const },
        topics: { type: "ARRAY" as const, items: { type: "STRING" as const } }
      },
      required: ["unit_number", "unit_title", "topics"],
    }
  };

  return executeWithRetry(async () => {
    const result = await model.generateContent({
      contents,
      generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema as any }
    });
    return JSON.parse(result.response.text());
  });
};