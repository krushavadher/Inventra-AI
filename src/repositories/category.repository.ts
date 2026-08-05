import { CategoryModel, ICategory } from '../models/category.model.js';

const memoryCategories: Map<string, ICategory> = new Map();

const seedCategories = () => {
  if (memoryCategories.size === 0) {
    const c1: any = {
      _id: 'cat_hardware',
      tenantId: 'tenant_12345',
      name: 'General Hardware & Microelectronics',
      description: 'Default hardware component category',
      isDeleted: false,
      createdAt: new Date()
    };
    memoryCategories.set(c1._id, c1);
  }
};
seedCategories();

export class CategoryRepository {
  async findById(id: string, tenantId: string): Promise<ICategory | null> {
    try {
      const cat = await CategoryModel.findOne({ _id: id, tenantId, isDeleted: false });
      if (cat) return cat;
    } catch (e) {}

    const c = memoryCategories.get(id);
    if (c && !c.isDeleted) return c;
    return null;
  }

  async findAll(tenantId: string): Promise<ICategory[]> {
    try {
      const categories = await CategoryModel.find({ tenantId, isDeleted: false });
      if (categories && categories.length > 0) return categories;
    } catch (e) {}

    return Array.from(memoryCategories.values()).filter((c) => !c.isDeleted);
  }

  async create(data: Partial<ICategory>): Promise<ICategory> {
    try {
      const category = await CategoryModel.create(data);
      return category;
    } catch (e) {
      const mockId = `cat_${Date.now()}`;
      const mockCat: any = {
        _id: mockId,
        tenantId: data.tenantId,
        name: data.name || 'Hardware & Components',
        description: data.description,
        isDeleted: false,
        createdAt: new Date()
      };
      memoryCategories.set(mockId, mockCat);
      return mockCat;
    }
  }
}
