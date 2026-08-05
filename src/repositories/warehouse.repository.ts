import { WarehouseModel, IWarehouse } from '../models/warehouse.model.js';
import mongoose from 'mongoose';

const memoryWarehouses: Map<string, IWarehouse> = new Map();

export class WarehouseRepository {
  async findAll(tenantId: string): Promise<IWarehouse[]> {
    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = { isDeleted: false };
        if (mongoose.Types.ObjectId.isValid(tenantId)) {
          query.tenantId = new mongoose.Types.ObjectId(tenantId);
        }
        const warehouses = await WarehouseModel.find({ isDeleted: false });
        return warehouses;
      } catch (e) {
        console.warn('findAll Warehouse Mongoose error:', e);
      }
    }

    return Array.from(memoryWarehouses.values()).filter((w) => !w.isDeleted);
  }

  async findById(id: string, tenantId: string): Promise<IWarehouse | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const wh = await WarehouseModel.findOne({ _id: id, isDeleted: false });
          if (wh) return wh;
        }
      } catch (e) {}
    }

    const w = memoryWarehouses.get(id);
    if (w && !w.isDeleted) return w;
    return null;
  }

  async findByCode(code: string, tenantId: string): Promise<IWarehouse | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        const wh = await WarehouseModel.findOne({ code: code.toUpperCase(), isDeleted: false });
        if (wh) return wh;
      } catch (e) {}
    }

    for (const w of memoryWarehouses.values()) {
      if (w.code.toUpperCase() === code.toUpperCase() && !w.isDeleted) return w;
    }
    return null;
  }

  async create(data: Partial<IWarehouse>): Promise<IWarehouse> {
    if (mongoose.connection.readyState === 1) {
      try {
        const wh = await WarehouseModel.create(data);
        return wh;
      } catch (e) {
        console.warn('create Warehouse Mongoose error:', e);
      }
    }

    const mockId = new mongoose.Types.ObjectId().toString();
    const mockWh: any = {
      _id: mockId,
      tenantId: data.tenantId,
      code: data.code || `WH-${Date.now().toString().slice(-4)}`,
      name: data.name,
      type: data.type || 'DISTRIBUTION_CENTER',
      totalCapacityVolume: data.totalCapacityVolume || 50000,
      totalCapacityWeight: data.totalCapacityWeight || 100000,
      status: data.status || 'ACTIVE',
      address: data.address || { street: '100 Logistics Way', city: 'Boston', state: 'MA', postalCode: '02108', country: 'USA' },
      zones: data.zones || [{ zoneCode: 'ZONE-A', name: 'Zone A', type: 'STORAGE', aisles: [] }],
      isDeleted: false,
      createdAt: new Date()
    };
    memoryWarehouses.set(mockId, mockWh);
    return mockWh;
  }

  async update(id: string, tenantId: string, updateData: Partial<IWarehouse>): Promise<IWarehouse | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const wh = await WarehouseModel.findOneAndUpdate({ _id: id, isDeleted: false }, updateData, { new: true });
          if (wh) return wh;
        }
      } catch (e) {}
    }

    const w = memoryWarehouses.get(id);
    if (w) {
      Object.assign(w, updateData);
      return w;
    }
    return null;
  }

  async softDelete(id: string, tenantId: string): Promise<boolean> {
    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const res = await WarehouseModel.updateOne({ _id: id }, { isDeleted: true });
          if (res.modifiedCount > 0) return true;
        }
      } catch (e) {}
    }

    const w = memoryWarehouses.get(id);
    if (w) {
      w.isDeleted = true;
      return true;
    }
    return false;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    return this.softDelete(id, tenantId);
  }
}
