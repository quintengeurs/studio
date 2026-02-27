
export type Role = 'operative' | 'supervisor' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  team?: string;
  training?: 'Health & Safety' | 'Equipment Handling' | 'First Aid' | 'Pesticide Application' | 'Chain Saw Operation' | 'None';
  isDriver?: boolean;
  isRoSPATrained?: boolean;
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
  park: string;
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
  linkedIssueId?: string;
  completionNote?: string;
  completionImageUrl?: string;
}

export type Frequency = 'Twice Daily' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';

export interface RecurringSchedule {
  id: string;
  title: string;
  frequency: Frequency;
  park: string;
  assetType?: string;
  assignedTo: string;
  lastRun?: string;
  nextRun: string;
}

export interface InspectionTemplate {
  id: string;
  assetType: string;
  checklist: string[];
}

export interface Inspection {
  id: string;
  assetId: string;
  assetName: string;
  park: string;
  status: 'Pending' | 'Completed' | 'Overdue';
  dueDate: string;
  completedAt?: string;
  inspectedBy?: string;
  results?: { item: string; passed: boolean; notes?: string }[];
}
