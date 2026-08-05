import { WarehouseRepository } from '../repositories/warehouse.repository.js';
import { IWarehouse, IZone } from '../models/warehouse.model.js';
import { AppError } from '../utils/app-error.util.js';

export interface CreateWarehouseDTO {
  code: string;
  name: string;
  type?: 'DISTRIBUTION_CENTER' | 'REGIONAL_HUB' | 'RETAIL_STORE' | 'COLD_STORAGE';
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: { lat: number; lng: number };
  };
  totalCapacityVolume?: number;
  totalCapacityWeight?: number;
}

export interface AddZoneDTO {
  zoneCode: string;
  name: string;
  type: 'RECEIVING' | 'STORAGE' | 'PICKING' | 'COLD_STORAGE' | 'QUARANTINE' | 'DISPATCH';
  tempControlCelsius?: number;
  aislesCount?: number;
  racksPerAisle?: number;
  shelvesPerRack?: number;
  binsPerShelf?: number;
}

export class WarehouseService {
  private warehouseRepo = new WarehouseRepository();

  /**
   * 1. Create Warehouse Facility
   */
  async createWarehouse(tenantId: string, dto: CreateWarehouseDTO): Promise<IWarehouse> {
    const existing = await this.warehouseRepo.findByCode(dto.code, tenantId);
    if (existing) {
      throw new AppError(`Warehouse code '${dto.code}' already exists`, 400, 'DUPLICATE_WAREHOUSE_CODE');
    }

    // Default seed zone structure (Zone A Storage, Zone B Receiving)
    const defaultZones: IZone[] = [
      {
        zoneCode: 'ZONE-A',
        name: 'General High-Density Storage',
        type: 'STORAGE',
        aisles: [
          {
            aisleCode: 'AISLE-01',
            racks: [
              {
                rackCode: 'RACK-01',
                shelves: [
                  {
                    shelfCode: 'SHELF-01',
                    bins: [
                      { binCode: 'A-01-1-A', maxVolumeCubicMeters: 5, currentVolumeUsed: 3.5, maxWeightKg: 1000, currentWeightUsed: 450, isLocked: false, status: 'PARTIAL' },
                      { binCode: 'A-01-1-B', maxVolumeCubicMeters: 5, currentVolumeUsed: 5.0, maxWeightKg: 1000, currentWeightUsed: 980, isLocked: false, status: 'FULL' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        zoneCode: 'ZONE-B',
        name: 'Inbound Receiving Dock',
        type: 'RECEIVING',
        aisles: [
          {
            aisleCode: 'AISLE-DOCK',
            racks: [
              {
                rackCode: 'RACK-DOCK-1',
                shelves: [
                  {
                    shelfCode: 'SHELF-DOCK-1',
                    bins: [
                      { binCode: 'B-DOCK-1-A', maxVolumeCubicMeters: 10, currentVolumeUsed: 0, maxWeightKg: 2000, currentWeightUsed: 0, isLocked: false, status: 'EMPTY' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ];

    return this.warehouseRepo.create({
      tenantId: tenantId as any,
      code: dto.code.toUpperCase(),
      name: dto.name,
      type: dto.type || 'DISTRIBUTION_CENTER',
      address: dto.address,
      totalCapacityVolume: dto.totalCapacityVolume || 10000,
      totalCapacityWeight: dto.totalCapacityWeight || 500000,
      zones: defaultZones,
      status: 'ACTIVE'
    });
  }

  /**
   * 2. Get Warehouse By ID & List All
   */
  async getWarehouseById(id: string, tenantId: string): Promise<IWarehouse> {
    const warehouse = await this.warehouseRepo.findById(id, tenantId);
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
    }
    return warehouse;
  }

  async listWarehouses(tenantId: string): Promise<IWarehouse[]> {
    return this.warehouseRepo.findAll(tenantId);
  }

  /**
   * 3. Update Warehouse Details
   */
  async updateWarehouse(id: string, tenantId: string, dto: Partial<CreateWarehouseDTO>): Promise<IWarehouse> {
    const warehouse = await this.warehouseRepo.findById(id, tenantId);
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
    }

    const updated = await this.warehouseRepo.update(id, tenantId, dto as any);
    return updated!;
  }

  /**
   * 4. Soft Delete Warehouse
   */
  async deleteWarehouse(id: string, tenantId: string): Promise<boolean> {
    const warehouse = await this.warehouseRepo.findById(id, tenantId);
    if (!warehouse) {
      throw new AppError('Warehouse not found', 404, 'WAREHOUSE_NOT_FOUND');
    }
    return this.warehouseRepo.softDelete(id, tenantId);
  }

  /**
   * 5. Add Custom Zone & Generate Bins
   */
  async addZone(id: string, tenantId: string, dto: AddZoneDTO): Promise<IWarehouse> {
    const warehouse = await this.getWarehouseById(id, tenantId);

    const aislesCount = dto.aislesCount || 1;
    const racksCount = dto.racksPerAisle || 2;
    const shelvesCount = dto.shelvesPerRack || 3;
    const binsCount = dto.binsPerShelf || 4;

    const generatedAisles = [];
    for (let a = 1; a <= aislesCount; a++) {
      const aisleCode = `AISLE-${a.toString().padStart(2, '0')}`;
      const generatedRacks = [];

      for (let r = 1; r <= racksCount; r++) {
        const rackCode = `RACK-${r.toString().padStart(2, '0')}`;
        const generatedShelves = [];

        for (let s = 1; s <= shelvesCount; s++) {
          const shelfCode = `SHELF-${s.toString().padStart(2, '0')}`;
          const generatedBins = [];

          for (let b = 1; b <= binsCount; b++) {
            const binLetter = String.fromCharCode(64 + b);
            const binCode = `${dto.zoneCode}-${a}-${r}-${binLetter}`;
            generatedBins.push({
              binCode,
              maxVolumeCubicMeters: 5,
              currentVolumeUsed: 0,
              maxWeightKg: 1000,
              currentWeightUsed: 0,
              isLocked: false,
              status: 'EMPTY' as const
            });
          }

          generatedShelves.push({ shelfCode, bins: generatedBins });
        }

        generatedRacks.push({ rackCode, shelves: generatedShelves });
      }

      generatedAisles.push({ aisleCode, racks: generatedRacks });
    }

    const newZone: IZone = {
      zoneCode: dto.zoneCode.toUpperCase(),
      name: dto.name,
      type: dto.type,
      tempControlCelsius: dto.tempControlCelsius,
      aisles: generatedAisles
    };

    warehouse.zones.push(newZone);
    await warehouse.save();

    return warehouse;
  }

  /**
   * 6. Warehouse Analytics (Occupancy %, Bin Counts, Volume & Weight Capacity)
   */
  async getWarehouseAnalytics(id: string, tenantId: string) {
    const warehouse = await this.getWarehouseById(id, tenantId);

    let totalBins = 0;
    let emptyBins = 0;
    let partialBins = 0;
    let fullBins = 0;
    let totalVolumeCapacityM3 = 0;
    let totalVolumeUsedM3 = 0;
    let totalWeightCapacityKg = 0;
    let totalWeightUsedKg = 0;

    const zoneMetrics: any[] = [];

    for (const zone of warehouse.zones) {
      let zoneBins = 0;
      let zoneUsedVol = 0;

      for (const aisle of zone.aisles) {
        for (const rack of aisle.racks) {
          for (const shelf of rack.shelves) {
            for (const bin of shelf.bins) {
              totalBins++;
              zoneBins++;
              if (bin.status === 'EMPTY') emptyBins++;
              else if (bin.status === 'PARTIAL') partialBins++;
              else if (bin.status === 'FULL') fullBins++;

              totalVolumeCapacityM3 += bin.maxVolumeCubicMeters;
              totalVolumeUsedM3 += bin.currentVolumeUsed;
              zoneUsedVol += bin.currentVolumeUsed;

              totalWeightCapacityKg += bin.maxWeightKg;
              totalWeightUsedKg += bin.currentWeightUsed;
            }
          }
        }
      }

      zoneMetrics.push({
        zoneCode: zone.zoneCode,
        zoneName: zone.name,
        type: zone.type,
        totalBins: zoneBins,
        volumeUsedM3: zoneUsedVol
      });
    }

    const occupancyRatePercentage = totalVolumeCapacityM3 > 0 ? Number(((totalVolumeUsedM3 / totalVolumeCapacityM3) * 100).toFixed(2)) : 0;
    const weightLoadPercentage = totalWeightCapacityKg > 0 ? Number(((totalWeightUsedKg / totalWeightCapacityKg) * 100).toFixed(2)) : 0;

    return {
      warehouseId: warehouse._id,
      warehouseCode: warehouse.code,
      warehouseName: warehouse.name,
      occupancyRatePercentage,
      weightLoadPercentage,
      binSummary: {
        totalBins,
        emptyBins,
        partialBins,
        fullBins
      },
      capacity: {
        totalVolumeCapacityM3,
        totalVolumeUsedM3,
        totalWeightCapacityKg,
        totalWeightUsedKg
      },
      zoneBreakdown: zoneMetrics
    };
  }

  /**
   * 7. 2D Spatial Heatmap Grid Data Generator
   */
  async getHeatmapGridData(id: string, tenantId: string) {
    const warehouse = await this.getWarehouseById(id, tenantId);

    const heatmapCells: any[] = [];

    let rowIndex = 0;
    for (const zone of warehouse.zones) {
      let colIndex = 0;
      for (const aisle of zone.aisles) {
        for (const rack of aisle.racks) {
          for (const shelf of rack.shelves) {
            for (const bin of shelf.bins) {
              const utilPercent = bin.maxVolumeCubicMeters > 0 ? (bin.currentVolumeUsed / bin.maxVolumeCubicMeters) * 100 : 0;
              let heatColor = '#10B981'; // Green for empty / low
              if (utilPercent > 85) heatColor = '#F43F5E'; // Red for full
              else if (utilPercent > 40) heatColor = '#F59E0B'; // Amber for partial

              heatmapCells.push({
                x: colIndex,
                y: rowIndex,
                binCode: bin.binCode,
                zoneCode: zone.zoneCode,
                utilizationPercent: Number(utilPercent.toFixed(1)),
                status: bin.status,
                color: heatColor
              });

              colIndex++;
            }
          }
        }
      }
      rowIndex++;
    }

    return {
      warehouseId: warehouse._id,
      warehouseCode: warehouse.code,
      cells: heatmapCells
    };
  }
}
