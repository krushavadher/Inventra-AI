import { TenantModel, ITenant } from '../models/tenant.model.js';

const memoryTenants: Map<string, ITenant> = new Map();

export class TenantRepository {
  async findBySlug(slug: string): Promise<ITenant | null> {
    try {
      const tenant = await TenantModel.findOne({ slug: slug.toLowerCase() });
      if (tenant) return tenant;
    } catch (e) {}

    for (const t of memoryTenants.values()) {
      if (t.slug.toLowerCase() === slug.toLowerCase()) {
        return t;
      }
    }
    return null;
  }

  async findById(id: string): Promise<ITenant | null> {
    try {
      const tenant = await TenantModel.findOne({ _id: id });
      if (tenant) return tenant;
    } catch (e) {}

    const t = memoryTenants.get(id);
    if (t) return t;
    return null;
  }

  async create(data: Partial<ITenant>): Promise<ITenant> {
    try {
      const tenant = await TenantModel.create(data);
      return tenant;
    } catch (e) {
      const mockId = `tenant_${Date.now()}`;
      const mockTenant: any = {
        _id: mockId,
        name: data.name || 'Default Enterprise Tenant',
        slug: data.slug || 'stockmind-default',
        subscriptionTier: data.subscriptionTier || 'ENTERPRISE',
        status: data.status || 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryTenants.set(mockId, mockTenant);
      return mockTenant;
    }
  }
}
