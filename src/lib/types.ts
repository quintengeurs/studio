
export type Role = 'operative' | 'supervisor' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  team?: string;
  training?: string;
  isDriver?: boolean;
  isRoSPATrained?: boolean;
  isArchived?: boolean;
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
  status: 'Open' | 'In Progress' | 'Pending Approval' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  category: string;
  park: string;
  reportedBy: string;
  assignedTo?: string;
  assetId?: string;
  imageUrl?: string;
  createdAt: string;
}

export type Frequency = 'One-off' | 'Twice Daily' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Six Monthly' | 'Yearly';

export interface Task {
  id: string;
  title: string;
  objective: string;
  status: 'Todo' | 'Doing' | 'Pending Approval' | 'Completed';
  dueDate: string;
  assignedTo: string;
  park: string;
  linkedIssueId?: string;
  completionNote?: string;
  completionImageUrl?: string;
  frequency?: Frequency | null;
}

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
  frequency?: Frequency | null;
  completedAt?: string;
  inspectedBy?: string;
  results?: { item: string; passed: boolean; notes?: string }[];
}

export type RequestCategory = 'Materials' | 'Tools' | 'Equipment' | 'PPE' | 'Other';
export type RequestStatus = 'Open' | 'Available' | 'Archived';

export interface MaterialRequest {
  id: string;
  category: RequestCategory;
  description: string;
  imageUrl?: string;
  status: RequestStatus;
  requestedBy: string;
  depot: string;
  createdAt: string;
}
