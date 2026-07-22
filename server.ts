
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API routes
  app.post("/api/scan-recitation", async (req, res) => {
    try {
      const { image } = req.body; // base64 image
      if (!image) {
        return res.status(400).json({ error: "Image is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `
أنت خبير في تحليل كشوف التسميع القرآنية المكتوبة بخط اليد بدقة متناهية. مهمتك هي قراءة الكشف المرفق وتحويله إلى بيانات مهيكلة.

### القواعد الذهبية للتحليل:

#### 1. كشف التلاعب والجودة:
- إذا كانت الصورة **ليست كشف تسميع** (مثلاً: صورة شخص، مشهد طبيعي، نص عشوائي)، أو إذا كانت الصورة **غير واضحة جداً** لدرجة تمنع قراءة البيانات، يجب أن تضبط "isForm" على false وتضع رسالة واضحة في "error" مثل: "عذراً، يرجى تصوير الكشف بوضوح أو مسح عدسة الكاميرا للمتابعة".

#### 2. تحديد الطلاب (ID):
- العمود الأول (ID) هو المفتاح الرئيسي (ST-1001، ST-1002...). استخرج هذا الرمز بدقة لكل طالب.

#### 3. تحليل حقل (الحفظ) و (المراجعة):
افهم جميع صيغ الكتابة اليدوية:
- السورة والآيات: "من البقرة آية 1 إلى 50" أو "البقرة 1-50".
- سورة كاملة: "سورة يس" أو "تبارك".
- عدة سور: "الأعلى والطارق والبروج" (في هذه الحالة ضع أول سورة في fromSurah وآخر سورة في toSurah).
- آيات داخل السورة: "الكهف آية 10-20".
- بين سورتين: "من نهاية الكهف إلى بداية مريم".
- الاختصارات: "ق 1-10" تعني سورة "ق". "ج 30" تعني جزء عم (يمكنك كتابتها في اسم السورة كـ "جزء 30").
- النفي: "لم يحفظ"، "لم يراجع" أو حقل فارغ -> hasMemorization: false / hasReview: false.

#### 4. تحليل (الحضور) والتقييم:
- الرموز المكتوبة للحضور:
  - (ح) أو (حاضر) أو (صح) أو حقل فارغ -> present
  - (م) أو (متأخر) -> late
  - (غ) أو (غائب) -> absent
  - (أ) أو (مستأذن) -> excused
- التقييم (الدرجات): إذا كتب المعلم درجة ملحقة بالاسم أو في حقل الحفظ/المراجعة (مثل 10/10 أو 9.5)، استخرجها في حقل rating.

#### 5. تجاهل حقل (الملاحظات الأساسية) تماماً:
- لا تقم بمعالجة أي بيانات في هذا الحقل، فهو ملاحظات يدوية للمعلم فقط.

أجب بصيغة JSON حصراً بهذا الهيكل:
{
  "students": [
    {
      "id": "ST-XXXX",
      "attendance": "present" | "late" | "absent" | "excused",
      "memorization": {
        "hasMemorization": boolean,
        "fromSurah": string,
        "fromAyah": string,
        "toSurah": string,
        "toAyah": string,
        "rating": number // التقييم من 0 إلى 10
      },
      "review": {
        "hasReview": boolean,
        "fromSurah": string,
        "fromAyah": string,
        "toSurah": string,
        "toAyah": string,
        "rating": number // التقييم من 0 إلى 10
      }
    }
  ],
  "isForm": boolean,
  "error": string | null
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image.split(",")[1] || image,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isForm: { type: Type.BOOLEAN },
              error: { type: Type.STRING },
              students: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    attendance: { type: Type.STRING },
                    memorization: {
                      type: Type.OBJECT,
                      properties: {
                        hasMemorization: { type: Type.BOOLEAN },
                        fromSurah: { type: Type.STRING },
                        fromAyah: { type: Type.STRING },
                        toSurah: { type: Type.STRING },
                        toAyah: { type: Type.STRING },
                      },
                    },
                    review: {
                      type: Type.OBJECT,
                      properties: {
                        hasReview: { type: Type.BOOLEAN },
                        fromSurah: { type: Type.STRING },
                        fromAyah: { type: Type.STRING },
                        toSurah: { type: Type.STRING },
                        toAyah: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const data = JSON.parse(response.text);
      res.json(data);
    } catch (error: any) {
      console.error("AI Scan Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
