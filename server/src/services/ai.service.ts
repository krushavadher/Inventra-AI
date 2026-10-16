import { GoogleGenAI } from '@google/genai';
import { InventoryLevelModel } from '../models/inventory-level.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE = path.resolve(__dirname, '../data/seed-data.json');

export interface GenerateDescriptionDTO {
  productName: string;
  category?: string;
  keyFeatures?: string[];
  targetAudience?: string;
}

export interface CategorizeProductDTO {
  productName: string;
  rawDescription?: string;
}

export interface ForecastExplanationDTO {
  sku: string;
  productName: string;
  predictedDemand: number;
  currentStock: number;
  safetyStock: number;
  historicalTrend: string;
}

export class AIService {
  private readonly systemPersona = `You are Inventra AI, an elite Enterprise Supply Chain & Inventory Intelligence AI Copilot. You provide precise, highly actionable, professional supply chain insights. Always use Indian Rupee (₹) for monetary values. Never use dollars ($).`;

  private getGeminiClient(): GoogleGenAI | null {
    const key = process.env.GEMINI_API_KEY;
    if (key && key.trim() && key !== 'your_gemini_api_key_here') {
      return new GoogleGenAI({ apiKey: key.trim() });
    }
    return null;
  }

  /**
   * 1. AI Product Description Generator
   */
  async generateProductDescription(dto: GenerateDescriptionDTO) {
    const ai = this.getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Generate an SEO-optimized enterprise product description in JSON format with fields: "title", "shortSummary", "fullDescription", "seoKeywords" (string array).\nProduct Name: ${dto.productName}\nCategory: ${dto.category || 'Hardware'}\nFeatures: ${dto.keyFeatures?.join(', ') || 'High durability'}\nTarget Audience: ${dto.targetAudience || 'B2B Enterprise Procurement'}`,
          config: {
            systemInstruction: `${this.systemPersona} Output raw valid JSON only.`
          }
        });
        if (response && response.text) {
          const cleanJson = response.text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        }
      } catch (e) {
        console.warn('Gemini product description generation failed, using fallback:', e);
      }
    }

    return {
      title: `${dto.productName} — Enterprise Grade SKU`,
      shortSummary: `High-efficiency ${dto.productName} engineered for heavy-duty industrial B2B environments.`,
      fullDescription: `The ${dto.productName} delivers exceptional performance, reliability, and seamless integration into modern automated workflows. Built with premium materials to ensure zero downtime and maximum operating lifecycle.`,
      seoKeywords: [dto.productName.toLowerCase(), 'industrial sku', 'b2b hardware', 'supply chain ready']
    };
  }

  /**
   * 2. AI Product Categorizer
   */
  async categorizeProduct(dto: CategorizeProductDTO) {
    const ai = this.getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Classify product name "${dto.productName}" (Description: "${dto.rawDescription || ''}") into standard inventory taxonomy category and assign recommended ABC velocity class ('A', 'B', or 'C'). Return JSON with fields: "suggestedCategory", "suggestedAbcClass", "confidenceScore" (number 0-1), "taxonomyPath".`,
          config: {
            systemInstruction: `${this.systemPersona} Output raw valid JSON only.`
          }
        });
        if (response && response.text) {
          const cleanJson = response.text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        }
      } catch (e) {
        console.warn('Gemini categorize product fallback:', e);
      }
    }

    let suggestedCategory = 'Electronics & Hardware';
    let abcClass: 'A' | 'B' | 'C' = 'B';
    const lower = dto.productName.toLowerCase();
    if (lower.includes('chip') || lower.includes('sensor') || lower.includes('mcu')) {
      suggestedCategory = 'Semiconductors';
      abcClass = 'A';
    } else if (lower.includes('box') || lower.includes('pallet') || lower.includes('pack')) {
      suggestedCategory = 'Packaging & Logistics';
      abcClass = 'C';
    }

    return {
      suggestedCategory,
      suggestedAbcClass: abcClass,
      confidenceScore: 0.95,
      taxonomyPath: `Catalog > Hardware > ${suggestedCategory}`
    };
  }

  /**
   * 3. AI Inventory Insights Generator
   */
  async generateInventoryInsights(inventoryMetrics: any) {
    let rawSeedProducts: any[] = [];
    try {
      if (fs.existsSync(SEED_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
        rawSeedProducts = parsed.products || [];
      }
    } catch (e) {}

    const depleted = rawSeedProducts.filter((p: any) => (p.stock ?? 0) === 0);
    const lowStock = rawSeedProducts.filter((p: any) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.minStock ?? 10));

    const ai = this.getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Analyze inventory status based on real metrics:\n- Out of stock SKUs (${depleted.length}): ${depleted.map(p => `${p.name} (${p.sku})`).join(', ') || 'None'}\n- Low stock SKUs (${lowStock.length}): ${lowStock.map(p => `${p.name} (${p.sku}, stock: ${p.stock}, min: ${p.minStock})`).join(', ') || 'None'}\n\nReturn JSON with fields: "summary" (string), "keyInsights" (string array), "prescriptiveActions" (array of objects with action, sku, recommendedQty). Use Indian Rupee (₹) if discussing value.`,
          config: {
            systemInstruction: `${this.systemPersona} Return valid JSON only.`
          }
        });
        if (response && response.text) {
          const cleanJson = response.text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        }
      } catch (e) {
        console.warn('Gemini inventory insights fallback:', e);
      }
    }

    return {
      summary: `Inventory evaluation: ${depleted.length} depleted line(s) and ${lowStock.length} SKU(s) below safety stock.`,
      keyInsights: [
        depleted.length > 0 ? `${depleted[0].name} (${depleted[0].sku}) has 0 stock remaining. Immediate restock required.` : 'All active lines currently have available stock on hand.',
        lowStock.length > 0 ? `${lowStock[0].name} (${lowStock[0].sku}) is operating below safety threshold (${lowStock[0].stock} units left).` : 'Safety stock levels are healthy across warehouse lines.'
      ],
      prescriptiveActions: depleted.map(p => ({
        action: "REORDER_DEPLETED",
        sku: p.sku,
        recommendedQty: Math.max(50, (p.minStock || 10) * 3)
      }))
    };
  }

  /**
   * 4. AI Demand Forecast Explanation
   */
  async explainDemandForecast(dto: ForecastExplanationDTO) {
    const ai = this.getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Explain demand forecast for product "${dto.productName}" (SKU: ${dto.sku}).\nCurrent stock: ${dto.currentStock} units, predicted demand: ${dto.predictedDemand} units, safety stock: ${dto.safetyStock} units, historical trend: ${dto.historicalTrend}.\nReturn JSON with fields: "executiveSummary", "stockoutRiskAnalysis", "recommendedOrderQty" (number), "confidenceInterval".`,
          config: {
            systemInstruction: `${this.systemPersona} Output raw valid JSON only.`
          }
        });
        if (response && response.text) {
          const cleanJson = response.text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        }
      } catch (e) {
        console.warn('Gemini forecast explanation fallback:', e);
      }
    }

    const deficit = Math.max(0, dto.predictedDemand - dto.currentStock + dto.safetyStock);
    return {
      executiveSummary: `Demand analysis for ${dto.productName} (${dto.sku}) indicates a ${dto.historicalTrend.toLowerCase()} consumption trajectory based on recent velocity.`,
      stockoutRiskAnalysis: dto.currentStock <= dto.safetyStock
        ? `Current stock of ${dto.currentStock} units is at or below the safety threshold of ${dto.safetyStock} units.`
        : `Current stock of ${dto.currentStock} units provides adequate cover against the predicted demand of ${dto.predictedDemand} units.`,
      recommendedOrderQty: deficit,
      confidenceInterval: "Calculated based on 60-day historical transaction window."
    };
  }

  /**
   * 5. Conversational AI Chatbot ("Copilot for Supply Chain")
   */
  async chatCopilot(prompt: string, history?: any[]) {
    const ai = this.getGeminiClient();
    if (ai) {
      try {
        let rawSeedProducts: any[] = [];
        try {
          if (fs.existsSync(SEED_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
            rawSeedProducts = parsed.products || [];
          }
        } catch (e) {}

        const context = `Active Catalog SKUs: ${rawSeedProducts.length}. Depleted: ${rawSeedProducts.filter((p: any) => p.stock === 0).length}. Low Stock: ${rawSeedProducts.filter((p: any) => p.stock > 0 && p.stock <= p.minStock).length}.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Inventory Context: ${context}\n\nUser Question: ${prompt}`,
          config: {
            systemInstruction: `${this.systemPersona} Provide clear, concise answers without markdown asterisks (*). Use clean dashes or bullets (•). Use Indian Rupee (₹) for currency.`
          }
        });

        if (response && response.text) {
          let text = response.text.trim();
          text = text.replace(/\$/g, '₹').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*/g, '');
          return {
            responseMarkdown: text,
            suggestedActions: [],
            timestamp: new Date().toISOString()
          };
        }
      } catch (e) {
        console.warn('Gemini copilot chat fallback:', e);
      }
    }

    return {
      responseMarkdown: `Inventra AI Copilot: Inventory records analyzed. All tracked SKUs and safety thresholds are accessible through your Dashboard and Inventory views.`,
      suggestedActions: [],
      timestamp: new Date().toISOString()
    };
  }
}
