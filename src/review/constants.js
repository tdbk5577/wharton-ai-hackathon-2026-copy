export const DEFAULT_RECENT_MONTHS = 12;

export const TOPIC_TAXONOMY = [
  {
    key: 'cleanliness',
    label: 'Cleanliness',
    keywords: ['clean', 'dirty', 'spotless', 'stain', 'smell', 'odor', 'mold', 'dust', 'bathroom', 'housekeeping']
  },
  {
    key: 'service',
    label: 'Staff and service',
    keywords: ['staff', 'service', 'front desk', 'manager', 'helpful', 'friendly', 'rude', 'check in', 'check-in']
  },
  {
    key: 'location',
    label: 'Location and access',
    keywords: ['location', 'walk', 'near', 'close', 'airport', 'downtown', 'beach', 'train', 'parking', 'traffic']
  },
  {
    key: 'room_comfort',
    label: 'Room comfort',
    keywords: ['room', 'bed', 'comfortable', 'uncomfortable', 'noise', 'quiet', 'loud', 'ac', 'air conditioning', 'temperature']
  },
  {
    key: 'amenities',
    label: 'Amenities',
    keywords: ['pool', 'spa', 'hot tub', 'gym', 'fitness', 'wifi', 'internet', 'restaurant', 'bar', 'breakfast']
  },
  {
    key: 'condition',
    label: 'Property condition',
    keywords: ['old', 'new', 'renovated', 'remodel', 'broken', 'maintenance', 'elevator', 'run down', 'out of order']
  },
  {
    key: 'value',
    label: 'Value for money',
    keywords: ['price', 'value', 'expensive', 'cheap', 'worth', 'overpriced', 'fee', 'charge', 'cost']
  },
  {
    key: 'safety',
    label: 'Safety and trust',
    keywords: ['safe', 'unsafe', 'security', 'police', 'scam', 'theft', 'stolen', 'lock', 'sketchy']
  }
];

export const TOPIC_PRIORITY = [
  'cleanliness',
  'service',
  'room_comfort',
  'amenities',
  'condition',
  'location',
  'value',
  'safety'
];
