import { describe, it, expect } from '@jest/globals';
import { AIService } from '../src/services/ai.service.js';

describe('2. AI Module & Prompt Engineering Unit Tests', () => {
  const aiService = new AIService();

  it('2.1 Should generate SEO product description with JSON structure', async () => {
    const res = await aiService.generateProductDescription({
      productName: 'Dual-Core Industrial MCU',
      category: 'Electronics',
      keyFeatures: ['Low Power', 'CAN Bus interface']
    });

    expect(res).toHaveProperty('title');
    expect(res).toHaveProperty('shortSummary');
    expect(res).toHaveProperty('fullDescription');
    expect(res.seoKeywords).toBeInstanceOf(Array);
    expect(res.seoKeywords.length).toBeGreaterThan(0);
  });

  it('2.2 Should classify product into category taxonomy and assign ABC class', async () => {
    const res = await aiService.categorizeProduct({
      productName: 'Microcontroller Sensor Unit'
    });

    expect(res).toHaveProperty('suggestedCategory');
    expect(res).toHaveProperty('suggestedAbcClass');
    expect(['A', 'B', 'C']).toContain(res.suggestedAbcClass);
    expect(res.confidenceScore).toBeGreaterThanOrEqual(0.9);
  });

  it('2.3 Should handle AI Copilot conversational chat requests', async () => {
    const res = await aiService.chatCopilot('Which items are at risk of stockout?');

    expect(res).toHaveProperty('responseMarkdown');
    expect(res).toHaveProperty('suggestedActions');
    expect(res.responseMarkdown).toContain('stockout');
  });
});
