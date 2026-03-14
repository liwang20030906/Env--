import { GoogleGenAI, Type } from "@google/genai";
import { StatsSummary, AnalysisMode } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getAIAnalysis(
  summary: StatsSummary,
  dataSample: any[],
  mode: AnalysisMode,
  query?: string
) {
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: `
      # Role
      ${mode === 'researcher' 
        ? "你是首席环境数据科学家，擅长统计推断与流行病学归因分析。" 
        : "你是亲切的健康生活顾问，擅长将复杂的数据转化为通俗易懂的生活建议。"}

      # Task
      基于提供的 OLS 回归统计摘要（包含系数、P值、R²）和数据预览，进行深度解读。

      # Constraints
      ${mode === 'researcher' 
        ? `1. 必须严格基于统计数据说话，严禁幻觉。若 P > 0.05，明确指出“统计上不显著”。
           2. 输出必须包含两个部分：
              - [思考过程]: 简要分析模型拟合度、识别潜在的多重共线性或异常离群点、推导因果逻辑。
              - [正式回答]: 使用学术严谨的语言，给出结论、局限性分析及后续研究建议。
           3. 语气：客观、冷静、专业，多用术语（如“显著正相关”、“置信区间”）。`
        : `1. 禁止使用 P 值、回归系数等统计术语，转化为“可能性很大”、“影响明显”等自然语言。
           2. 重点在于“行动建议”（如：戴口罩、减少户外运动）。
           3. 输出必须包含：
              - [思考过程]: 简单联想数据与生活场景的关联。
              - [正式回答]: 温暖、关怀的语气，分点列出风险和建议。
           4. 若数据表明风险低，也要给予安心的提示。`}
      5. 严禁给出具体的用药建议或诊断结论，必须引导用户咨询医疗机构。

      # Input Data
      统计摘要: ${JSON.stringify(summary)}
      数据预览 (前5行): ${JSON.stringify(dataSample.slice(0, 5))}
      ${query ? `用户追问: ${query}` : ""}

      # Output Format
      [思考过程]
      - ...
      [正式回答]
      - ...
    ` }] }],
    config: {
      temperature: 0.7,
    }
  });

  return response.text;
}

export async function translatePaperToNews(abstract: string) {
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: abstract }] }],
    config: {
      temperature: 0.7,
      systemInstruction: `你是一位资深科学记者，擅长将复杂的学术论文转化为大众爱读的新闻资讯。
      输入：一篇关于环境健康的英文论文摘要。
      任务：
      1.标题：起一个吸引人但不过分夸张的中文标题 (参考‘震惊’体但保持严谨)。
      2.一句话结论：用最通俗的语言概括核心发现 (禁止使用P值、置信区间等术语)。
      3.概念图描述：为绘图AI写一段详细的画面描述 (Prompt)，要求画面温馨、直观，解释研究原理。
      4.正文解读：
        背景：为什么这事和你有关？
        怎么做：科学家研究了谁？(例如：他们跟踪了10万个家庭...)
        发现：具体发现了什么规律？
        建议：普通人今天该怎么做？
      约束：语气亲切、客观。必须标注原始论文来源。严禁提供医疗诊断。`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          oneSentenceSummary: { type: Type.STRING },
          conceptImagePrompt: { type: Type.STRING },
          plainTextContent: { type: Type.STRING },
          translatedAbstract: { type: Type.STRING, description: "对原始摘要的专业中文翻译" },
          sourceJournal: { type: Type.STRING }
        },
        required: ["title", "oneSentenceSummary", "conceptImagePrompt", "plainTextContent", "translatedAbstract", "sourceJournal"]
      }
    },
  });

  return JSON.parse(response.text);
}

export async function getWhatIfAnalysis(
  data: { pm25Change: number; predictedDiseaseChange: number },
  coefficient: number
) {
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: `
      # Role
      你是环境健康风险评估专家。

      # Task
      基于以下模拟数据，提供简短的政策建议或生活指导。
      
      # Data
      - PM2.5 变化: ${data.pm25Change}%
      - 预计疾病率变化: ${data.predictedDiseaseChange.toFixed(2)}%
      - 原始回归系数: ${coefficient.toFixed(4)}

      # Constraints
      1. 语气专业且具有前瞻性。
      2. 重点说明这种变化对公共卫生系统的潜在影响。
      3. 限制在 150 字以内。
    ` }] }],
    config: {
      temperature: 0.5,
    }
  });

  return response.text;
}

export async function generateConceptImage(prompt: string) {
  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return "https://picsum.photos/seed/science/800/450";
}
