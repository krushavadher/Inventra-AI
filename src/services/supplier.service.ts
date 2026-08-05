import { SupplierRepository } from '../repositories/supplier.repository.js';
import { ISupplier } from '../models/supplier.model.js';
import { AppError } from '../utils/app-error.util.js';
import crypto from 'crypto';

export interface CreateSupplierDTO {
  code?: string;
  name: string;
  taxId?: string;
  categories?: string[];
  contact: {
    primaryName: string;
    email: string;
    phone: string;
    designation?: string;
    address?: { street: string; city: string; state: string; country: string; postalCode: string };
  };
  paymentTerms?: 'NET_15' | 'NET_30' | 'NET_60' | 'DUE_ON_RECEIPT';
  leadTime?: {
    defaultDays: number;
    minDays?: number;
    maxDays?: number;
  };
}

export class SupplierService {
  private supplierRepo = new SupplierRepository();

  private generateSupplierCode(): string {
    return `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  /**
   * 1. Create Supplier
   */
  async createSupplier(tenantId: string, dto: CreateSupplierDTO): Promise<ISupplier> {
    const code = dto.code ? dto.code.toUpperCase() : this.generateSupplierCode();

    const existing = await this.supplierRepo.findByCode(code, tenantId);
    if (existing) {
      throw new AppError(`Supplier code '${code}' already exists`, 400, 'DUPLICATE_SUPPLIER_CODE');
    }

    return this.supplierRepo.create({
      tenantId: tenantId as any,
      code,
      name: dto.name,
      taxId: dto.taxId,
      categories: dto.categories || ['General Components'],
      contact: dto.contact,
      paymentTerms: dto.paymentTerms || 'NET_30',
      leadTime: {
        defaultDays: dto.leadTime?.defaultDays || 7,
        minDays: dto.leadTime?.minDays || 3,
        maxDays: dto.leadTime?.maxDays || 14,
        avgVarianceDays: 0
      },
      performance: {
        otifScore: 98.0,
        defectRatePercent: 0.2,
        totalOrdersCompleted: 0,
        totalSpendAmount: 0,
        riskLevel: 'LOW'
      },
      documents: [],
      status: 'ACTIVE'
    });
  }

  /**
   * 2. Get Supplier By ID & List
   */
  async getSupplierById(id: string, tenantId: string): Promise<ISupplier> {
    const supplier = await this.supplierRepo.findById(id, tenantId);
    if (!supplier) {
      throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
    }
    return supplier;
  }

  async listSuppliers(tenantId: string, search?: string, riskLevel?: string): Promise<ISupplier[]> {
    return this.supplierRepo.findAll(tenantId, search, riskLevel);
  }

  /**
   * 3. Update Supplier
   */
  async updateSupplier(id: string, tenantId: string, dto: Partial<CreateSupplierDTO>): Promise<ISupplier> {
    const supplier = await this.supplierRepo.findById(id, tenantId);
    if (!supplier) {
      throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
    }

    const updated = await this.supplierRepo.update(id, tenantId, dto as any);
    return updated!;
  }

  /**
   * 4. Soft Delete Supplier
   */
  async deleteSupplier(id: string, tenantId: string): Promise<boolean> {
    const supplier = await this.supplierRepo.findById(id, tenantId);
    if (!supplier) {
      throw new AppError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
    }
    return this.supplierRepo.softDelete(id, tenantId);
  }

  /**
   * 5. Add Document to Supplier
   */
  async addSupplierDocument(id: string, tenantId: string, doc: { title: string; fileUrl: string; type: 'CONTRACT' | 'TAX_CERTIFICATE' | 'SLA' | 'OTHER'; expiryDate?: string }) {
    const supplier = await this.getSupplierById(id, tenantId);

    supplier.documents.push({
      title: doc.title,
      fileUrl: doc.fileUrl,
      type: doc.type,
      expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
      uploadedAt: new Date()
    });

    await supplier.save();
    return supplier;
  }

  /**
   * 6. Update Performance Scorecard
   */
  async updatePerformance(id: string, tenantId: string, otifScore: number, defectRatePercent: number, addSpendAmount: number) {
    const supplier = await this.getSupplierById(id, tenantId);

    supplier.performance.otifScore = otifScore;
    supplier.performance.defectRatePercent = defectRatePercent;
    supplier.performance.totalOrdersCompleted += 1;
    supplier.performance.totalSpendAmount += addSpendAmount;

    // Recalculate Risk Level
    if (otifScore < 85 || defectRatePercent > 5) {
      supplier.performance.riskLevel = 'HIGH';
    } else if (otifScore < 92 || defectRatePercent > 2) {
      supplier.performance.riskLevel = 'MEDIUM';
    } else {
      supplier.performance.riskLevel = 'LOW';
    }

    await supplier.save();
    return supplier;
  }

  /**
   * 7. Supplier Performance Dashboard Analytics
   */
  async getPerformanceDashboard(tenantId: string) {
    const suppliers = await this.supplierRepo.findAll(tenantId);

    const totalSuppliers = suppliers.length;
    const avgOtifScore = totalSuppliers > 0 ? Number((suppliers.reduce((acc, s) => acc + s.performance.otifScore, 0) / totalSuppliers).toFixed(1)) : 0;
    const totalProcurementSpend = suppliers.reduce((acc, s) => acc + s.performance.totalSpendAmount, 0);

    const lowRiskCount = suppliers.filter((s) => s.performance.riskLevel === 'LOW').length;
    const mediumRiskCount = suppliers.filter((s) => s.performance.riskLevel === 'MEDIUM').length;
    const highRiskCount = suppliers.filter((s) => s.performance.riskLevel === 'HIGH').length;

    const topSuppliersBySpend = [...suppliers]
      .sort((a, b) => b.performance.totalSpendAmount - a.performance.totalSpendAmount)
      .slice(0, 5)
      .map((s) => ({
        id: s._id,
        code: s.code,
        name: s.name,
        otifScore: s.performance.otifScore,
        totalSpendAmount: s.performance.totalSpendAmount,
        riskLevel: s.performance.riskLevel
      }));

    return {
      totalSuppliers,
      avgOtifScore,
      totalProcurementSpend,
      riskBreakdown: {
        low: lowRiskCount,
        medium: mediumRiskCount,
        high: highRiskCount
      },
      topSuppliersBySpend
    };
  }
}
