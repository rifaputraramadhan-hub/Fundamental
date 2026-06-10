import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for generating news
  app.post("/api/generate-news", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined");
      }

      const { mode } = req.body;
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const difficultyMap: Record<string, string> = {
        'easy': 'NFP, CPI, GDP, Unemployment Rate, Initial Jobless Claims',
        'normal': 'PPI, Retail Sales, FOMC, Initial Jobless Claims, Durable Goods Orders',
        'hard': 'Rare, obscure, or highly unpredictable global macroeconomic data like Empire State Mfg Index, Core PCE, or sudden geopolitical trade balance shocks'
      };
      
      const newsTypeHints = difficultyMap[mode] || difficultyMap['normal'];

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `You are an expert forex and macroeconomic data generator. Generate a plausible, fictional but highly realistic upcoming macroeconomic news event for the XAU/USD (Gold vs US Dollar) market. 
        Create a news event fitting the ${mode} difficulty tier. Typical events in this tier include: ${newsTypeHints}.

        Respond in JSON format according to the schema provided.
        - Previous: The previous value of this economic indicator (e.g. "3.1%", "250K", "-10.5"). (If hard mode, make it "???")
        - Forecast: The market expectation/forecast (e.g. "3.0%", "200K", "-5.0").
        
        Provide the outcome scenarios considering XAU/USD movement:
        - "actualUp" and "explanationUp": the data outcome that would cause XAU/USD to go UP (i.e. weak USD). 
        - "actualDown" and "explanationDown": the data outcome that would cause XAU/USD to go DOWN (i.e. strong USD). 
        The explanation should be roughly 1 sentence, dramatic, and clear.
        Use Bahasa Indonesia for explanations.
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "A unique string ID for the event, e.g. 'cpi_123'" },
              name: { type: Type.STRING, description: "The name of the economic indicator" },
              time: { type: Type.STRING, description: "A generic time of day like '19:30' or '21:00'" },
              explanation: { type: Type.STRING, description: "1-2 sentence explanation of what this news event is and why it matters to the market, in Bahasa Indonesia." },
              previous: { type: Type.STRING },
              forecast: { type: Type.STRING },
              actualUp: { type: Type.STRING, description: "The actual number/value that would cause Gold (XAU) to go UP" },
              actualDown: { type: Type.STRING, description: "The actual number/value that would cause Gold (XAU) to go DOWN" },
              explanationUp: { type: Type.STRING, description: "Why that actualUp value drops USD / pumps Gold" },
              explanationDown: { type: Type.STRING, description: "Why that actualDown value pumps USD / drops Gold" }
            },
            required: ["id", "name", "time", "explanation", "previous", "forecast", "actualUp", "actualDown", "explanationUp", "explanationDown"]
          }
        }
      });

      const jsonStr = response.text?.trim() || "{}";
      const newsEvent = JSON.parse(jsonStr);
      res.json(newsEvent);
    } catch (error: any) {
      // Handle the 503, 429, 404 specifically if we want to log it clearly without crashing
      if (error?.status === 503 || error?.code === 503 || error?.status === 429 || error?.code === 429 || error?.status === 404 || error?.code === 404) {
        console.warn(`Gemini API Issue (${error?.status || error?.code || 'unknown'}). Using fallback logic in server.`);
      } else {
        console.error("Gemini API Error:", error);
      }
      
      const fallbackEvents = [
        {
          id: "fallback_nfp_" + Date.now(),
          name: "Non-Farm Payroll (NFP)",
          time: "19:30",
          explanation: "Data tenaga kerja AS terkini. Jika pasar tenaga kerja kuat, The Fed akan menahan suku bunga (USD melesat).",
          previous: "200K",
          forecast: "180K",
          actualUp: "250K",
          actualDown: "110K",
          explanationUp: "Data NFP meledak naik! Pasar tenaga kerja tak terbendung. USD melesat menghancurkan harga emas seketika.",
          explanationDown: "NFP sangat sangat buruk. Alarm resesi berbunyi ekstrem, Dolar ditinggalkan, emas terbang sebagai safe-haven."
        },
        {
          id: "fallback_cpi_" + Date.now(),
          name: "CPI Inflation Data",
          time: "19:30",
          explanation: "Inflasi Bulanan AS. Fundamental penopang kebijakan the FED.",
          previous: "3.2%",
          forecast: "3.1%",
          actualUp: "3.5%",
          actualDown: "2.7%",
          explanationUp: "Inflasi kembali bandel dan tak terkendali! USD diborong besar-besaran untuk antisipasi rate hike.",
          explanationDown: "Inflasi anjlok drastis! Pasar mem-price in pemotongan suku bunga the Fed. USD dump, Gold pump!"
        },
        {
          id: "fallback_gdp_" + Date.now(),
          name: "US Advance GDP q/q",
          time: "19:30",
          explanation: "Indikator pertumbuhan ekonomi AS. Ekonomi kuat = Dolar solid.",
          previous: "2.1%",
          forecast: "2.4%",
          actualUp: "3.2%",
          actualDown: "1.2%",
          explanationUp: "Perekonomian AS secara ajaib meroket tak peduli tingginya bunga pinjaman. Dolar AS tak tertandingi.",
          explanationDown: "Kejutan tragis, pertumbuhan ekonomi mandek. Bayang-bayang stagflasi menjauhkan uang dari mata uang Dolar."
        },
        {
          id: "fallback_ppi_" + Date.now(),
          name: "Producer Price Index (PPI)",
          time: "19:30",
          explanation: "Inflasi tingkat produsen. Leading indicator sebelum CPI.",
          previous: "0.2%",
          forecast: "0.3%",
          actualUp: "0.8%",
          actualDown: "-0.2%",
          explanationUp: "Biaya produksi membengkak tajam! Prediksi inflasi kembali menyala. Trader borong USD.",
          explanationDown: "Deflasi tingkat produsen! Penurunan biaya parah menandakan resesi demand. Emas melonjak."
        },
        {
          id: "fallback_retail_" + Date.now(),
          name: "Core Retail Sales m/m",
          time: "19:30",
          explanation: "Data sentimen belanja masyarakat, denyut nadi utama PDB Amerika.",
          previous: "0.4%",
          forecast: "0.3%",
          actualUp: "1.1%",
          actualDown: "-0.5%",
          explanationUp: "Warga negara AS boros tak terbendung! Ekonomi riil bergerak kencang, USD rebound kuat.",
          explanationDown: "Kinerja ritel jeblok menembus area minus! Dompet masyarakat kering, mematikan nilai Dolar."
        },
        {
          id: "fallback_fomc_" + Date.now(),
          name: "FOMC Rate Decision",
          time: "01:00",
          explanation: "Keputusan Suku Bunga The Fed. Event paling diwaspadai di dunia.",
          previous: "5.50%",
          forecast: "5.50%",
          actualUp: "5.75%",
          actualDown: "5.25%",
          explanationUp: "Surprise Hawkish! The Fed menaikkan suku bunga tiba-tiba. Tsunami margin call menghantam penjual USD.",
          explanationDown: "Surprise Dovish! Bunga akhirnya merosot. Pesta pora pembeli Gold, meninggalkan USD jatuh bebas."
        },
        {
          id: "fallback_claims_" + Date.now(),
          name: "Unemployment Claims",
          time: "19:30",
          explanation: "Klaim pengangguran mingguan, data fast-paced soal PHK AS.",
          previous: "212K",
          forecast: "215K",
          actualUp: "195K",
          actualDown: "250K",
          explanationUp: "Tidak ada yang melamar tunjangan! Job market terlalu ketat, membuat USD naik stabil.",
          explanationDown: "Lonjakan besar PHK! Terlalu banyak warga menuntut tunjangan, sinyal kemerosotan Dolar."
        },
        {
          id: "fallback_pmi_" + Date.now(),
          name: "ISM Services PMI",
          time: "21:00",
          explanation: "Aktivitas industri jasa penyumbang terbesar makroekonomi AS.",
          previous: "51.4",
          forecast: "52.0",
          actualUp: "54.5",
          actualDown: "49.2",
          explanationUp: "Industri perhotelan & jasa terbang roket. Ketahanan luar biasa perekonomian AS mendukung USD mutlak.",
          explanationDown: "Sektor jasa resmi ambruk ke wilayah kontraksi! Alarm menyala, uang membanjiri Emas."
        }
      ];
      
      const fallbackEvent = fallbackEvents[Math.floor(Math.random() * fallbackEvents.length)];
      
      // Return 200 with fallback data instead of 500 so the client doesn't break
      res.status(200).json(fallbackEvent);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
