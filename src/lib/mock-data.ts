
import { User, Asset, Issue, Task } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'John Doe', email: 'john@hackney.gov.uk', role: 'operative', avatar: 'https://picsum.photos/seed/u1/40/40' },
  { id: 'u2', name: 'Sarah Smith', email: 'sarah@hackney.gov.uk', role: 'supervisor', avatar: 'https://picsum.photos/seed/u2/40/40' },
  { id: 'u3', name: 'Master Admin', email: 'admin@hackney.gov.uk', role: 'master', avatar: 'https://picsum.photos/seed/u3/40/40' },
  { id: 'u4', name: 'Mike Green', email: 'mike@hackney.gov.uk', role: 'operative', avatar: 'https://picsum.photos/seed/u4/40/40' },
];

export const MOCK_ASSETS: Asset[] = [
  { id: 'a1', name: 'Clissold Park Swing Set', type: 'Playground Equipment', park: 'Clissold Park', location: 'Near North Entrance', condition: 'Good', lastInspected: '2024-02-15' },
  { id: 'a2', name: 'London Fields Cafe Bench', type: 'Park Furniture', park: 'London Fields', location: 'Adjacent to Cafe', condition: 'Fair', lastInspected: '2024-01-20' },
  { id: 'a3', name: 'Hackney Marshes Floodlight B4', type: 'Lighting', park: 'Hackney Marshes', location: 'Pitch 4 South', condition: 'Excellent', lastInspected: '2024-03-01' },
  { id: 'a4', name: 'Victoria Park Ornamental Gate', type: 'Fencing', park: 'Victoria Park', location: 'Main Gate', condition: 'Poor', lastInspected: '2023-11-12' },
  { id: 'a5', name: 'Shoreditch Park Trash Bin 12', type: 'Waste Management', park: 'Shoreditch Park', location: 'Skate Park Edge', condition: 'Good', lastInspected: '2024-02-28' },
];

export const MOCK_ISSUES: Issue[] = [
  { id: 'i1', title: 'Graffiti on Bench', description: 'Significant tagging on the new oak bench near the pond.', status: 'Open', priority: 'Low', category: 'Park Furniture', park: 'London Fields', reportedBy: 'John Doe', createdAt: '2024-03-05', assetId: 'a2', imageUrl: 'https://picsum.photos/seed/graffiti/600/400' },
  { id: 'i2', title: 'Broken Swing Chain', description: 'The left swing has a rusted link that snapped.', status: 'In Progress', priority: 'High', category: 'Playground Equipment', park: 'Clissold Park', reportedBy: 'Mike Green', assignedTo: 'John Doe', createdAt: '2024-03-06', assetId: 'a1', imageUrl: 'https://picsum.photos/seed/swing/600/400' },
];

export const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Mow North Lawn', objective: 'Standard maintenance cut for the spring season.', status: 'Todo', dueDate: '2024-03-15', assignedTo: 'John Doe', park: 'Clissold Park' },
  { id: 't2', title: 'Inspect All Bins', objective: 'Check structural integrity and empty status.', status: 'Doing', dueDate: '2024-03-10', assignedTo: 'Mike Green', park: 'Shoreditch Park' },
  { id: 't3', title: 'Prune Rose Garden', objective: 'Annual pruning for the Queen Victoria rose bed.', status: 'Done', dueDate: '2024-03-01', assignedTo: 'John Doe', park: 'Victoria Park' },
];
