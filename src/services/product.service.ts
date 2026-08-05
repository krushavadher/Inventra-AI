import crypto from 'crypto';
import { ProductRepository, ProductQueryFilter } from '../repositories/product.repository.js';
import { CategoryRepository } from '../repositories/category.repository.js';
import { IProduct } from '../models/product.model.js';
import { AppError } from '../utils/app-error.util.js';

export interface CreateProductDTO {
  sku?: string;
  name: string;
  description?: string;
  categoryId?: string;
  barcode?: string;
  images?: { url: string; isPrimary: boolean; altText?: string }[];
  pricing: {
    unitCost: number;
    sellingPrice: number;
    wholesalePrice?: number;
    taxRate?: number;
    taxCode?: string;
  };
  physicalDimensions?: {
    weight?: number;
    weightUom?: 'KG' | 'G' | 'LB' | 'OZ';
    length?: number;
    width?: number;
    height?: number;
    dimensionUom?: 'CM' | 'M' | 'IN' | 'FT';
  };
  warehouseLocation?: {
    defaultWarehouseId?: string;
    defaultBinCode?: string;
  };
  supplierMapping?: {
    primarySupplierId?: string;
    secondarySupplierId?: string;
    supplierSku?: string;
  };
  abcClass?: 'A' | 'B' | 'C';
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
}

export class ProductService {
  private productRepo = new ProductRepository();
  private categoryRepo = new CategoryRepository();

  private generateAutoSku(): string {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `SKU-${Date.now().toString().slice(-4)}-${randomHex}`;
  }

  private generateAutoBarcode(): string {
    const randomDigits = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    return `890${randomDigits.slice(0, 9)}`; // EAN-13 style
  }

  /**
   * Create Product
   */
  async createProduct(tenantId: string, dto: CreateProductDTO): Promise<IProduct> {
    let categoryId = dto.categoryId;
    if (!categoryId) {
      const defaultCategories = await this.categoryRepo.findAll(tenantId);
      if (defaultCategories && defaultCategories.length > 0) {
        categoryId = String(defaultCategories[0]._id);
      } else {
        const newCat = await this.categoryRepo.create({ tenantId: tenantId as any, name: 'General Hardware & Electronics' });
        categoryId = String(newCat._id);
      }
    }

    const sku = dto.sku ? dto.sku.toUpperCase() : this.generateAutoSku();
    const barcode = dto.barcode || this.generateAutoBarcode();
    const qrCode = `stockmind://product/${sku}?tenant=${tenantId}`;

    const productData: Partial<IProduct> = {
      tenantId: tenantId as any,
      sku,
      name: dto.name,
      description: dto.description || 'Enterprise component SKU',
      categoryId: categoryId as any,
      barcode,
      qrCode,
      images: dto.images || [{ url: 'https://via.placeholder.com/300', isPrimary: true, altText: dto.name }],
      pricing: {
        unitCost: dto.pricing?.unitCost || 10,
        sellingPrice: dto.pricing?.sellingPrice || 20,
        wholesalePrice: dto.pricing?.wholesalePrice || (dto.pricing?.sellingPrice || 20) * 0.85,
        taxRate: dto.pricing?.taxRate || 18,
        taxCode: dto.pricing?.taxCode || 'HSN-8471'
      },
      physicalDimensions: {
        weight: dto.physicalDimensions?.weight || 0.5,
        weightUom: dto.physicalDimensions?.weightUom || 'KG',
        length: dto.physicalDimensions?.length || 10,
        width: dto.physicalDimensions?.width || 5,
        height: dto.physicalDimensions?.height || 2,
        dimensionUom: dto.physicalDimensions?.dimensionUom || 'CM'
      },
      warehouseLocation: {
        defaultWarehouseId: dto.warehouseLocation?.defaultWarehouseId as any,
        defaultBinCode: dto.warehouseLocation?.defaultBinCode || 'BIN-A-01'
      },
      supplierMapping: {
        primarySupplierId: dto.supplierMapping?.primarySupplierId as any,
        secondarySupplierId: dto.supplierMapping?.secondarySupplierId as any,
        supplierSku: dto.supplierMapping?.supplierSku || sku
      },
      abcClass: dto.abcClass || 'A',
      status: dto.status || 'ACTIVE',
      isDeleted: false
    };

    return this.productRepo.create(productData);
  }

  async getProductById(id: string, tenantId: string): Promise<IProduct> {
    const product = await this.productRepo.findById(id, tenantId);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }
    return product;
  }

  async getProductBySku(sku: string, tenantId: string): Promise<IProduct> {
    const product = await this.productRepo.findBySku(sku, tenantId);
    if (!product) {
      throw new AppError(`Product with SKU '${sku}' not found`, 404, 'PRODUCT_NOT_FOUND');
    }
    return product;
  }

  async listProducts(tenantId: string, filterOptions: Omit<ProductQueryFilter, 'tenantId'>) {
    return this.productRepo.queryProducts({ tenantId, ...filterOptions });
  }

  async updateProduct(id: string, tenantId: string, dto: Partial<CreateProductDTO>): Promise<IProduct> {
    const updated = await this.productRepo.update(id, tenantId, dto as any);
    if (!updated) {
      throw new AppError('Failed to update product', 500, 'UPDATE_FAILED');
    }
    return updated;
  }

  async deleteProduct(id: string, tenantId: string): Promise<void> {
    await this.productRepo.delete(id, tenantId);
  }

  async createCategory(tenantId: string, name: string, description?: string) {
    return this.categoryRepo.create({
      tenantId: tenantId as any,
      name,
      description
    });
  }

  async listCategories(tenantId: string) {
    return this.categoryRepo.findAll(tenantId);
  }
}
