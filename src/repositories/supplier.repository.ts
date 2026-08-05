import { SupplierModel, ISupplier } from '../models/supplier.model.js';
import mongoose from 'mongoose';

const memorySuppliers: Map<string, ISupplier> = new Map();

export class SupplierRepository {
  async findAll(tenantId: string, search?: string, riskLevel?: string): Promise<ISupplier[]> {
    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = { isDeleted: false };
        if (riskLevel && riskLevel !== 'ALL') query['performance.riskLevel'] = riskLevel;
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
            { 'contact.primaryName': { $regex: search, $options: 'i' } },
            { 'contact.email': { $regex: search, $options: 'i' } }
          ];
        }

        const suppliers = await SupplierModel.find(query).sort({ createdAt: -1 });
        return suppliers;
      } catch (e) {
        console.warn('findAll Supplier Mongoose error:', e);
      }
    }

    let items = Array.from(memorySuppliers.values()).filter((s) => !s.isDeleted);
    if (riskLevel && riskLevel !== 'ALL') {
      items = items.filter((s) => s.performance?.riskLevel === riskLevel);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.contact?.primaryName?.toLowerCase().includes(q)
      );
    }
    return items;
  }

  async findById(id: string, tenantId: string): Promise<ISupplier | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const sup = await SupplierModel.findOne({ _id: id, isDeleted: false });
          if (sup) return sup;
        }
      } catch (e) {}
    }

    const s = memorySuppliers.get(id);
    if (s && !s.isDeleted) return s;
    return null;
  }

  async findByCode(code: string, tenantId: string): Promise<ISupplier | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        const sup = await SupplierModel.findOne({ code: code.toUpperCase(), isDeleted: false });
        if (sup) return sup;
      } catch (e) {}
    }

    for (const s of memorySuppliers.values()) {
      if (s.code.toUpperCase() === code.toUpperCase() && !s.isDeleted) return s;
    }
    return null;
  }

  async create(data: Partial<ISupplier>): Promise<ISupplier> {
    if (mongoose.connection.readyState === 1) {
      try {
        const sup = await SupplierModel.create(data);
        return sup;
      } catch (e) {
        console.warn('create Supplier Mongoose error:', e);
      }
    }

    const mockId = `sup_${Date.now()}`;
    const mockSup: any = {
      _id: mockId,
      tenantId: data.tenantId,
      code: data.code || `SUP-${Date.now().toString().slice(-4)}`,
      name: data.name,
      taxId: data.taxId || `TAX-${Date.now().toString().slice(-6)}`,
      contact: data.contact || { primaryName: 'John Doe', email: 'vendor@supplier.com', phone: '+1 555 019 0000' },
      leadTime: data.leadTime || { defaultDays: 5, minDays: 3, maxDays: 7, avgVarianceDays: 0 },
      paymentTerms: data.paymentTerms || 'NET_30',
      performance: data.performance || { otifScore: 98.4, defectRatePercent: 0.1, totalOrdersCompleted: 10, totalSpendAmount: 15000, riskLevel: 'LOW' },
      documents: [],
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date()
    };
    memorySuppliers.set(mockId, mockSup);
    return mockSup;
  }

  async update(id: string, tenantId: string, updateData: Partial<ISupplier>): Promise<ISupplier | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const sup = await SupplierModel.findOneAndUpdate({ _id: id, isDeleted: false }, updateData, { new: true });
          if (sup) return sup;
        }
      } catch (e) {}
    }

    const s = memorySuppliers.get(id);
    if (s) {
      Object.assign(s, updateData);
      return s;
    }
    return null;
  }

  async softDelete(id: string, tenantId: string): Promise<boolean> {
    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const res = await SupplierModel.updateOne({ _id: id }, { isDeleted: true });
          if (res.modifiedCount > 0) return true;
        }
      } catch (e) {}
    }

    const s = memorySuppliers.get(id);
    if (s) {
      s.isDeleted = true;
      return true;
    }
    return false;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    return this.softDelete(id, tenantId);
  }
}
