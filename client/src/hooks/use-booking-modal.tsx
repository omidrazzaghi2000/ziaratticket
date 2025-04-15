import { create } from 'zustand';

interface Caravan {
  id: number;
  name: string;
  departureDate: string;
  duration: number;
  transportationType: string;
  price: number;
  capacity: number;
  remainingCapacity: number;
  accommodationType: string;
  accommodationDistance: number;
  manager: string;
}

interface Companion {
  name: string;
  nationalId: string;
  relationship: string;
  birthdate: string;
}

interface BookingModalState {
  isOpen: boolean;
  caravan: Caravan | null;
  companions: Companion[];
  setCaravan: (caravan: Caravan) => void;
  openModal: () => void;
  closeModal: () => void;
  addCompanion: () => void;
  removeCompanion: (index: number) => void;
  updateCompanion: (index: number, data: Partial<Companion>) => void;
  resetCompanions: () => void;
}

export const useBookingModal = create<BookingModalState>((set) => ({
  isOpen: false,
  caravan: null,
  companions: [{ name: '', nationalId: '', relationship: '', birthdate: '' }],
  
  setCaravan: (caravan) => set({ caravan, isOpen: true }),
  
  openModal: () => set({ isOpen: true }),
  
  closeModal: () => set({ isOpen: false }),
  
  addCompanion: () => set((state) => ({ 
    companions: [...state.companions, { name: '', nationalId: '', relationship: '', birthdate: '' }]
  })),
  
  removeCompanion: (index) => set((state) => {
    if (state.companions.length <= 1) return state;
    const newCompanions = [...state.companions];
    newCompanions.splice(index, 1);
    return { companions: newCompanions };
  }),
  
  updateCompanion: (index, data) => set((state) => {
    const newCompanions = [...state.companions];
    newCompanions[index] = { ...newCompanions[index], ...data };
    return { companions: newCompanions };
  }),
  
  resetCompanions: () => set({ 
    companions: [{ name: '', nationalId: '', relationship: '', birthdate: '' }]
  }),
}));
