export type PickupStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type PickupTimelineStatus = 'created' | 'assigned' | 'on_way' | 'arrived' | 'completed';

export type PickupTimelineEvent = {
  status: PickupTimelineStatus;
  time: string;
  label: string;
};

export type PickupCollector = {
  name: string;
  phone: string;
  rating: number;
  vehiclePlate: string;
};

export type Pickup = {
  id: string;
  wasteTypes: string[];
  weight: string;
  points: number;
  status: PickupStatus;
  date: string;
  timeSlot: string;
  address: string;
  collector: PickupCollector | null;
  timeline: PickupTimelineEvent[];
  completedWeight?: string;
  earnedPoints?: number;
};

export const pickupStatusColors: Record<PickupStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const pickupStatusLabels: Record<PickupStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const customerPickups: Pickup[] = [
  {
    id: 'PKP-2026-0512',
    status: 'completed',
    wasteTypes: ['Plastic', 'Paper'],
    weight: '12.5 kg',
    points: 125,
    date: 'May 12, 2026',
    timeSlot: '09:00 - 11:00',
    address: '123 Green St, Jakarta Selatan',
    collector: {
      name: 'Ahmad',
      phone: '+62 812 1111 2222',
      rating: 4.9,
      vehiclePlate: 'B 1234 ABC',
    },
    timeline: [
      { status: 'created', time: '08:30', label: 'Pickup Created' },
      { status: 'assigned', time: '08:45', label: 'Collector Assigned' },
      { status: 'on_way', time: '09:15', label: 'Collector On The Way' },
      { status: 'arrived', time: '10:05', label: 'Collector Arrived' },
      { status: 'completed', time: '10:35', label: 'Pickup Completed' },
    ],
    completedWeight: '12.5 kg',
    earnedPoints: 125,
  },
  {
    id: 'PKP-2026-0510',
    status: 'in_progress',
    wasteTypes: ['Metal'],
    weight: '8.2 kg',
    points: 82,
    date: 'May 10, 2026',
    timeSlot: '11:00 - 13:00',
    address: '123 Green St, Jakarta Selatan',
    collector: {
      name: 'Budi',
      phone: '+62 813 2222 3333',
      rating: 4.8,
      vehiclePlate: 'B 5678 DEF',
    },
    timeline: [
      { status: 'created', time: '10:00', label: 'Pickup Created' },
      { status: 'assigned', time: '10:15', label: 'Collector Assigned' },
      { status: 'on_way', time: '10:45', label: 'Collector On The Way' },
    ],
  },
  {
    id: 'PKP-2026-0508',
    status: 'assigned',
    wasteTypes: ['Cardboard', 'Paper'],
    weight: '15.3 kg',
    points: 153,
    date: 'May 8, 2026',
    timeSlot: '13:00 - 15:00',
    address: '123 Green St, Jakarta Selatan',
    collector: null,
    timeline: [{ status: 'created', time: '12:00', label: 'Pickup Created' }],
  },
  {
    id: 'PKP-2026-0505',
    status: 'completed',
    wasteTypes: ['Glass', 'Plastic'],
    weight: '18.7 kg',
    points: 187,
    date: 'May 5, 2026',
    timeSlot: '09:00 - 10:30',
    address: '123 Green St, Jakarta Selatan',
    collector: {
      name: 'Citra',
      phone: '+62 814 4444 5555',
      rating: 4.7,
      vehiclePlate: 'B 9012 GHI',
    },
    timeline: [
      { status: 'created', time: '08:00', label: 'Pickup Created' },
      { status: 'assigned', time: '08:15', label: 'Collector Assigned' },
      { status: 'on_way', time: '08:45', label: 'Collector On The Way' },
      { status: 'arrived', time: '09:20', label: 'Collector Arrived' },
      { status: 'completed', time: '09:45', label: 'Pickup Completed' },
    ],
    completedWeight: '18.7 kg',
    earnedPoints: 187,
  },
  {
    id: 'PKP-2026-0503',
    status: 'pending',
    wasteTypes: ['Electronics'],
    weight: '5.1 kg',
    points: 51,
    date: 'May 3, 2026',
    timeSlot: '15:00 - 17:00',
    address: '123 Green St, Jakarta Selatan',
    collector: null,
    timeline: [{ status: 'created', time: '14:00', label: 'Pickup Created' }],
  },
  {
    id: 'PKP-2026-0501',
    status: 'cancelled',
    wasteTypes: ['Mixed Waste'],
    weight: '2.4 kg',
    points: 0,
    date: 'May 1, 2026',
    timeSlot: '10:00 - 12:00',
    address: '123 Green St, Jakarta Selatan',
    collector: null,
    timeline: [{ status: 'created', time: '09:15', label: 'Pickup Created' }],
  },
];