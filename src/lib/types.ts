
export type Role = 'operative' | 'supervisor' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  park: string;
  location: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  lastInspected: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  category: string;
  reportedBy: string;
  assignedTo?: string;
  assetId?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  objective: string;
  status: 'Todo' | 'Doing' | 'Done';
  dueDate: string;
  assignedTo: string;
  park: string;
}
