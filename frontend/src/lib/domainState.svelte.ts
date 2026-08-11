export type DomainType = 'ROBOTICS' | 'WIND_TURBINES' | 'CYCLOGENESIS' | 'DRONES' | 'UMBRELLAS' | 'DNA_STRUCTURES' | 'FLOWERS' | 'GEOMETRIC_NC';

export interface ModelSystem {
  id: string;
  name: string;
  details: string;
}

export const DOMAINS: Record<DomainType, { label: string; models: ModelSystem[] }> = {
  ROBOTICS: {
    label: 'Robotics',
    models: [
      { id: 'KUKA_LBR_iiwa', name: 'KUKA iiwa', details: '7-DOF' },
      { id: 'Franka_Panda', name: 'Panda', details: '7-DOF' },
      { id: 'UR5', name: 'UR5', details: '6-DOF' }
    ]
  },
  WIND_TURBINES: {
    label: 'Wind Turbines',
    models: [
      { id: 'VAWT', name: 'VAWT', details: 'Vertical Axis' },
      { id: 'GE_Haliade_X', name: 'GE Haliade-X', details: '14MW' }
    ]
  },
  CYCLOGENESIS: {
    label: 'Cyclogenetic Systems',
    models: [
      { id: 'Tornado_EF5', name: 'Tornado', details: 'EF5' },
      { id: 'Hurricane_Cat5', name: 'Hurricane', details: 'Cat 5' }
    ]
  },
  DRONES: {
    label: 'Drone Systems',
    models: [
      { id: 'Quadcopter_DJI', name: 'Quadcopter', details: '4-Rotor' },
      { id: 'FixedWing', name: 'Fixed-Wing', details: 'Glider' }
    ]
  },
  UMBRELLAS: {
    label: 'Umbrellas',
    models: [
      { id: 'Patio_Umbrella', name: 'Patio Umbrella', details: 'Cantilever' },
      { id: 'Classic_Umbrella', name: 'Classic', details: '8-Rib' }
    ]
  },
  DNA_STRUCTURES: {
    label: 'DNA Structures',
    models: [
      { id: 'B_DNA', name: 'B-DNA', details: 'Right-handed' },
      { id: 'Z_DNA', name: 'Z-DNA', details: 'Left-handed' }
    ]
  },
  FLOWERS: {
    label: 'Flowers',
    models: [
      { id: 'Dandelion', name: 'Dandelion', details: 'Pappus' },
      { id: 'Sunflower', name: 'Sunflower', details: 'Fibonacci' }
    ]
  },
  GEOMETRIC_NC: {
    label: 'Geometric NC',
    models: [
      { id: 'Observability_Dashboard', name: 'Observability', details: 'Meta-Material' }
    ]
  }
};

class DomainState {
  activeDomain = $state<DomainType>('ROBOTICS');
  
  // Keep track of the selected model per domain so switching back restores it
  activeModels = $state<Record<DomainType, string>>({
    ROBOTICS: 'KUKA_LBR_iiwa',
    WIND_TURBINES: 'VAWT',
    CYCLOGENESIS: 'Tornado_EF5',
    DRONES: 'Quadcopter_DJI',
    UMBRELLAS: 'Patio_Umbrella',
    DNA_STRUCTURES: 'B_DNA',
    FLOWERS: 'Dandelion',
    GEOMETRIC_NC: 'Observability_Dashboard'
  });

  get currentModels() {
    return DOMAINS[this.activeDomain].models;
  }

  get activeModelId() {
    return this.activeModels[this.activeDomain];
  }

  setActiveDomain(domain: DomainType) {
    this.activeDomain = domain;
  }

  setActiveModel(modelId: string) {
    this.activeModels[this.activeDomain] = modelId;
    this.activeModels = { ...this.activeModels }; // Force Svelte 5 deep reactivity update
  }
}

export const domainState = new DomainState();
