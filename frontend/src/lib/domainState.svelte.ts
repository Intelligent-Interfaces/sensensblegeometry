export type DomainType = 'ROBOTICS' | 'WIND_TURBINES' | 'CYCLOGENESIS' | 'DRONES';

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
      { id: 'Vestas_V164', name: 'Vestas V164', details: 'Offshore' },
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
  }
};

class DomainState {
  activeDomain = $state<DomainType>('ROBOTICS');
  
  // Keep track of the selected model per domain so switching back restores it
  activeModels = $state<Record<DomainType, string>>({
    ROBOTICS: 'KUKA_LBR_iiwa',
    WIND_TURBINES: 'Vestas_V164',
    CYCLOGENESIS: 'Tornado_EF5',
    DRONES: 'Quadcopter_DJI'
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
  }
}

export const domainState = new DomainState();
