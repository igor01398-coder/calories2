import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = 'gemini-2.5-flash-image';

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix if present (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1]; 
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const editImageWithGemini = async (
  base64Image: string,
  prompt: string,
  mimeType: string = 'image/jpeg'
): Promise<string> => {
  
  // 1. Initialize Client
  // The API key is obtained exclusively from process.env.API_KEY as per instructions
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // 2. Call generateContent
    // We send the image + text. The model acts as an editor based on the text instruction.
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    // 3. Extract Image from Response
    // The response might contain text or inlineData (image). We look for inlineData.
    const candidates = response.candidates;
    if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }

    throw new Error("No image generated in response. The model might have returned only text.");
    
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};