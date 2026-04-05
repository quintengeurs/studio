export type Role = 'Gardener' | 'Keeper' | 'Litter Picker' | 'Bin Run' | 'Area Manager' | 'Operations Manager' | 'Admin';

export const OPERATIVE_ROLES: Role[] = ['Gardener', 'Keeper', 'Litter Picker', 'Bin Run'];
export const MANAGEMENT_ROLES: Role[] = ['Area Manager', 'Operations Manager', 'Admin'];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string;
  avatar?: string;
  training?: string;
  isDriver?: boolean;
  isRoSPATrained?: boolean;
  isArchived?: boolean;
  createdAt?: string;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  park: string;
  location: string;
  condition: string;
  lastInspected: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  category: string;
  park: string;
  reportedBy: string;
  assignedTo?: string;
  createdAt: string;
  assetId?: string;
  imageUrl?: string;
}

export type Frequency = 'One-off' | 'Daily' | 'Weekly' | 'Monthly' | 'Six Monthly' | 'Yearly';

export interface Task {
  id: string;
  title: string;
  objective: string;
  status: 'Todo' | 'Doing' | 'Pending Approval' | 'Completed';
  dueDate: string;
  assignedTo: string;
  park: string;
  frequency?: Frequency | null;
  completionNote?: string;
  completionImageUrl?: string;
  collaborators?: string[];
  linkedIssueId?: string;
}

export interface RecurringSchedule {
  id: string;
  title: string;
  frequency: string;
  park: string;
  assignedTo: string;
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
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  dueDate: string;
  completedAt?: string;
  inspectedBy?: string;
  notes?: string;
  checklist?: { item: string, status: 'Pass' | 'Fail' | 'N/A', notes: string }[];
}

export interface RegistryConfig {
  teams: string[];
  trainingOptions: string[];
  parks: string[];
  assetCategories?: string[];
}

export type RequestCategory = 'Materials' | 'Tools' | 'Equipment' | 'PPE' | 'Other';

export interface MaterialRequest {
  id: string;
  category: RequestCategory;
  description: string;
  depot: string;
  imageUrl?: string;
  requestedBy: string;
  status: 'Open' | 'In Progress' | 'Available' | 'Collected' | 'Archived';
  createdAt: string;
}
