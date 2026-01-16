import { GoogleGenAI } from "@google/genai";
import { TextbookRequestData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePoliteMessage = async (data: TextbookRequestData): Promise<string> => {
  try {
    const prompt = `
      You are a helpful assistant for a teacher at an academy (학원).
      Create a polite, professional, yet warm message to send to a parent via KakaoTalk/SMS.
      
      The message should inform them about a textbook purchase request.
      
      Details:
      - Student: ${data.studentName}
      - Teacher: ${data.teacherName}
      - Book: ${data.bookName}
      - Price: ${data.price.toLocaleString()} won
      - Account: ${data.bankName} ${data.accountNumber} (Holder: ${data.accountHolder})
      
      Structure:
      1. Greeting (Hello, this is teacher ${data.teacherName}).
      2. Explanation that ${data.studentName} needs a new textbook (${data.bookName}) for the next curriculum.
      3. Payment details clearly listed.
      4. Closing (Ask them to let us know after deposit, Thank you).
      
      Output language: Korean (Natural, polite '해요' style).
      Keep it concise but friendly.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text;
    if (!text || text.trim() === '') {
      return "메시지를 생성할 수 없습니다.";
    }
    return text;
  } catch (error) {
    console.error("Error generating message:", error);
    return "AI 메시지 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
};