import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateDailyDemand,
  calculateDaysLeft,
  calculateReorder,
  calculateRisk,
  calculateTrend,
  calculateConfidence,
  generateSeries
} from '../src/services/forecast.service.js';

describe('Inventory Forecast Calculation Functions', () => {
  describe('1. calculateDailyDemand', () => {
    it('1.1 should correctly calculate weighted daily demand for mature product (60 days)', () => {
      // 60 days of constant 10 units/day
      const sales60 = new Array(60).fill(10);
      const demand = calculateDailyDemand(sales60, 60);
      // 0.5 * 10 + 0.3 * 10 + 0.2 * 10 = 10.00
      assert.strictEqual(demand, 10);
    });

    it('1.2 should renormalize weights for a new product with only 5 days history', () => {
      // 5 days history: sales = [2, 4, 6, 8, 10], rest 0
      const sales60 = [2, 4, 6, 8, 10, ...new Array(55).fill(0)];
      const demand = calculateDailyDemand(sales60, 5);
      // Average of 5 days = 30 / 5 = 6.00, only window 1 fits so weight = 1.0
      assert.strictEqual(demand, 6);
    });

    it('1.3 should renormalize weights for product with 35 days history (windows 1 & 2 fit)', () => {
      // Window 1 (first 7 days) avg = 20
      // Window 2 (days 8-30, 23 days) avg = 10
      // Window 3 (days 31-60) not used as 35 < 60
      const sales60 = [
        ...new Array(7).fill(20),
        ...new Array(23).fill(10),
        ...new Array(30).fill(0)
      ];
      const demand = calculateDailyDemand(sales60, 35);
      // Renormalized weights: w1 = 0.5 / 0.8 = 0.625, w2 = 0.3 / 0.8 = 0.375
      // 20 * 0.625 + 10 * 0.375 = 12.5 + 3.75 = 16.25
      assert.strictEqual(demand, 16.25);
    });

    it('1.4 should return 0 for zero sales', () => {
      const sales60 = new Array(60).fill(0);
      const demand = calculateDailyDemand(sales60, 60);
      assert.strictEqual(demand, 0);
    });
  });

  describe('2. calculateDaysLeft', () => {
    const fixedToday = new Date('2026-10-16T00:00:00.000Z');

    it('2.1 should compute daysLeft and stockoutDate accurately', () => {
      const { daysLeft, stockoutDate } = calculateDaysLeft(100, 10, fixedToday);
      assert.strictEqual(daysLeft, 10);
      assert.strictEqual(stockoutDate, '2026-10-26');
    });

    it('2.2 should round daysLeft to 1 decimal place', () => {
      const { daysLeft } = calculateDaysLeft(20, 3, fixedToday);
      assert.strictEqual(daysLeft, 6.7);
    });

    it('2.3 should return null when dailyDemand is 0', () => {
      const { daysLeft, stockoutDate } = calculateDaysLeft(50, 0, fixedToday);
      assert.strictEqual(daysLeft, null);
      assert.strictEqual(stockoutDate, null);
    });

    it('2.4 should return 0 daysLeft when stock is 0', () => {
      const { daysLeft } = calculateDaysLeft(0, 5, fixedToday);
      assert.strictEqual(daysLeft, 0);
    });
  });

  describe('3. calculateReorder (reorderPoint, suggestedOrderQty, suggestedOrderCost)', () => {
    it('3.1 should calculate reorderPoint, suggestedOrderQty, and suggestedOrderCost when stock is low', () => {
      // stock: 50, demand: 4, leadTime: 7, unitCost: 250, safety: 5, cover: 30
      // reorderPoint = ceil(4 * (7 + 5)) = 48
      // target = ceil(4 * (7 + 5 + 30)) = ceil(4 * 42) = 168
      // suggestedOrderQty = max(0, 168 - 50) = 118
      // suggestedOrderCost = 118 * 250 = 29500
      const result = calculateReorder(50, 4, 7, 250, 5, 30);
      assert.strictEqual(result.reorderPoint, 48);
      assert.strictEqual(result.suggestedOrderQty, 118);
      assert.strictEqual(result.suggestedOrderCost, 29500);
    });

    it('3.2 should suggest 0 reorder quantity when current stock exceeds coverage target', () => {
      // stock: 200, demand: 2, leadTime: 7, unitCost: 100, safety: 5, cover: 30
      // target = ceil(2 * 42) = 84 < 200
      const result = calculateReorder(200, 2, 7, 100, 5, 30);
      assert.strictEqual(result.reorderPoint, 24);
      assert.strictEqual(result.suggestedOrderQty, 0);
      assert.strictEqual(result.suggestedOrderCost, 0);
    });
  });

  describe('4. calculateRisk', () => {
    it('4.1 should return "no_data" if fewer than 3 sales days', () => {
      const risk = calculateRisk(50, 5, 10, 7, 2, 60, 5);
      assert.strictEqual(risk, 'no_data');
    });

    it('4.2 should return "no_data" if less than 7 days of history', () => {
      const risk = calculateRisk(50, 5, 10, 7, 4, 5, 5);
      assert.strictEqual(risk, 'no_data');
    });

    it('4.3 should return "out" if stock is 0 and demand > 0', () => {
      const risk = calculateRisk(0, 5, 0, 7, 10, 60, 5);
      assert.strictEqual(risk, 'out');
    });

    it('4.4 should return "critical" if daysLeft <= leadTimeDays', () => {
      // daysLeft 6 <= leadTimeDays 7
      const risk = calculateRisk(30, 5, 6, 7, 10, 60, 5);
      assert.strictEqual(risk, 'critical');
    });

    it('4.5 should return "warning" if daysLeft <= leadTimeDays + SAFETY_DAYS + 7', () => {
      // threshold: 7 + 5 + 7 = 19 days. daysLeft = 14
      const risk = calculateRisk(70, 5, 14, 7, 10, 60, 5);
      assert.strictEqual(risk, 'warning');
    });

    it('4.6 should return "no_demand" if stock > 0 and demand is 0', () => {
      const risk = calculateRisk(50, 0, null, 7, 5, 60, 5);
      assert.strictEqual(risk, 'no_demand');
    });

    it('4.7 should return "healthy" when stock comfortably exceeds warning threshold', () => {
      // daysLeft 45 > 19
      const risk = calculateRisk(225, 5, 45, 7, 15, 60, 5);
      assert.strictEqual(risk, 'healthy');
    });
  });

  describe('5. Trend & Confidence Helpers', () => {
    it('5.1 should detect upward trend >= +15%', () => {
      // Last 14 days avg 20, previous 14 days avg 10 => +100%
      const sales = [...new Array(14).fill(20), ...new Array(14).fill(10), ...new Array(32).fill(0)];
      const { trend, percentChange } = calculateTrend(sales);
      assert.strictEqual(trend, 'up');
      assert.strictEqual(percentChange, 100);
    });

    it('5.2 should assign confidence levels appropriately', () => {
      assert.strictEqual(calculateConfidence(3, []), 'low');
      assert.strictEqual(calculateConfidence(8, []), 'medium');
      // 15 days with identical sales (zero variance, CV = 0 < 1.0)
      assert.strictEqual(calculateConfidence(15, new Array(15).fill(10)), 'high');
    });
  });
});
