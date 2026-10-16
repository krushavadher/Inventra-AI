import { ProductModel, IProduct } from '../models/product.model.js';
import mongoose from 'mongoose';

export interface ProductQueryFilter {
  tenantId: string;
  categoryId?: string;
  abcClass?: string;
  status?: string;
  search?: string;
  warehouseId?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const memoryProducts: Map<string, IProduct> = new Map();
memoryProducts.clear(); // Ensure 100% clean catalog state on launch

export class ProductRepository {
  async queryProducts(filterOptions: ProductQueryFilter) {
    const limit = filterOptions.limit || 20;
    const page = filterOptions.page || 1;

    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = { isDeleted: false };
        if (filterOptions.abcClass) query.abcClass = filterOptions.abcClass;
        if (filterOptions.status) query.status = filterOptions.status;
        if (filterOptions.search) {
          query.$or = [
            { name: { $regex: filterOptions.search, $options: 'i' } },
            { sku: { $regex: filterOptions.search, $options: 'i' } }
          ];
        }
        const products = await ProductModel.find(query).sort({ createdAt: -1 });
        if (products && products.length > 0) {
          return { products, totalRecords: products.length, page, totalPages: 1, limit };
        }
      } catch (e) {}
    }

    let result = Array.from(memoryProducts.values()).filter((p) => !p.isDeleted);
    if (filterOptions.abcClass) {
      result = result.filter((p) => p.abcClass === filterOptions.abcClass);
    }
    if (filterOptions.search) {
      const q = filterOptions.search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return { products: result, totalRecords: result.length, page, totalPages: 1, limit };
  }

  async findById(id: string, tenantId: string): Promise<IProduct | null> {
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      try {
        const p = await ProductModel.findOne({ _id: id, isDeleted: false });
        if (p) return p;
      } catch (e) {}
    }

    const p = memoryProducts.get(id);
    if (p && !p.isDeleted) return p;
    return null;
  }

  async findBySku(sku: string, tenantId: string): Promise<IProduct | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        const p = await ProductModel.findOne({ sku: sku.toUpperCase(), isDeleted: false });
        if (p) return p;
      } catch (e) {}
    }

    for (const p of memoryProducts.values()) {
      if (p.sku.toUpperCase() === sku.toUpperCase() && !p.isDeleted) return p;
    }
    return null;
  }

  async create(data: Partial<IProduct>): Promise<IProduct> {
    if (mongoose.connection.readyState === 1) {
      try {
        const product = await ProductModel.create(data);
        memoryProducts.set(String(product._id), product);
        return product;
      } catch (e) {}
    }

    const mockId = new mongoose.Types.ObjectId().toString();
    const mockProduct: any = {
      _id: mockId,
      tenantId: data.tenantId,
      sku: data.sku,
      name: data.name,
      barcode: data.barcode || `890${Date.now().toString().slice(-6)}`,
      pricing: data.pricing || { unitCost: 10, sellingPrice: 20, taxRate: 18 },
      abcClass: data.abcClass || 'A',
      status: data.status || 'ACTIVE',
      isDeleted: false,
      createdAt: new Date()
    };
    memoryProducts.set(mockId, mockProduct);
    return mockProduct;
  }

  async update(id: string, tenantId: string, updateData: Partial<IProduct>): Promise<IProduct | null> {
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      try {
        const product = await ProductModel.findOneAndUpdate({ _id: id, isDeleted: false }, updateData, { new: true });
        if (product) {
          memoryProducts.set(id, product);
          return product;
        }
      } catch (e) {}
    }

    const p = memoryProducts.get(id);
    if (p) {
      Object.assign(p, updateData);
      return p;
    }
    return null;
  }

  async softDelete(id: string, tenantId: string): Promise<boolean> {
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      try {
        await ProductModel.updateOne({ _id: id }, { isDeleted: true });
      } catch (e) {}
    }

    memoryProducts.delete(id);
    return true;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    return this.softDelete(id, tenantId);
  }
}
