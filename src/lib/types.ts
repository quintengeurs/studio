export type Role = 'Gardener' | 'Keeper' | 'Litter Picker' | 'Bin Run' | 'Area Manager' | 'Assistant Area Manager' | 'Operations Manager' | 'Head Gardener' | 'Parks Development Officer' | 'Tree Officer' | 'Biodiversity Manager' | 'Contractor' | 'Project Manager' | 'Events Manager' | 'Volunteering Coordinator' | 'Sports and Leisure Manager' | 'User Group Chair' | 'Park Manager' | 'Volunteer' | 'Admin';

export const OPERATIVE_ROLES: Role[] = ['Gardener', 'Keeper', 'Litter Picker', 'Bin Run', 'Head Gardener', 'Contractor'];
export const MANAGEMENT_ROLES: Role[] = ['Area Manager', 'Assistant Area Manager', 'Operations Manager', 'Parks Development Officer', 'Tree Officer', 'Biodiversity Manager', 'Project Manager', 'Events Manager', 'Volunteering Coordinator', 'Sports and Leisure Manager', 'User Group Chair', 'Park Manager', 'Admin'];

export const CONTRACTOR_ROLE: Role = 'Contractor';
export const STANDARD_OFFICER_ROLES: Role[] = ['Tree Officer', 'Parks Development Officer', 'Bin Run', 'Litter Picker', 'Project Manager', 'Events Manager', 'Volunteering Coordinator', 'Sports and Leisure Manager', 'Biodiversity Manager', 'Gardener', 'Keeper', 'Park Manager'];
export const OPERATIONAL_MGMT_ROLES: Role[] = ['Head Gardener', 'Area Manager', 'Assistant Area Manager', 'Operations Manager'];

// Categorization for Dashboard Visibility logic
export const OFFICE_ROLES: Role[] = ['Parks Development Officer', 'Events Manager', 'Sports and Leisure Manager', 'Project Manager', 'Volunteering Coordinator', 'Biodiversity Manager', 'User Group Chair', 'Park Manager', 'Tree Officer'];
export const OPS_ROLES: Role[] = ['Gardener', 'Keeper', 'Litter Picker', 'Bin Run'];
export const SENIOR_OPS_ROLES: Role[] = ['Head Gardener', 'Assistant Area Manager'];
export const SENIOR_MGMT_ROLES: Role[] = ['Area Manager', 'Operations Manager', 'Admin'];

export interface AssignedRole {
  role: Role;
  depotIds: string[];
}

export interface Organisation {
  id: string;
  name: string;
  council?: string;
  depotIds?: string[];
  parkIds?: string[];
  enabledModules?: string[];
  licenseModules?: string[];
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface AccessPermissions {
  // Page Visibility
  viewDashboard: boolean;
  viewMyTasks: boolean;
  viewAssets: boolean;
  viewParks: boolean;
  viewDepots: boolean;
  viewInspections: boolean;
  viewIssues: boolean;
  viewResolvedIssues: boolean;
  viewStaffRequests: boolean;
  viewAllTasks: boolean;
  viewArchivedTasks: boolean;
  viewUsers: boolean;
  viewArchivedStaff: boolean;
  viewInfoCorner: boolean;
  manageInfoCorner: boolean;
  viewSmartTasking: boolean;
  viewVolunteering: boolean;

  // Core Functions
  createTask: boolean;
  assignTask: boolean;
  createIssue: boolean;
  scheduleInspection: boolean;
  manageAssets: boolean;
  approveResolution: boolean;

  // Granular Edits
  editParksFull: boolean;
  editParkDevelopment: boolean; // Just projects/groups
  editDepotsFull: boolean;
  viewMap: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  role?: Role; // Legacy fallback
  permissionKeys?: string[];
  orgId?: string;
  depotIds?: string[];
  parkIds?: string[];
  depot: string; // Primary depot
  depots?: string[]; // Multiple assigned depots
  assignedRoles?: AssignedRole[];
  avatar?: string;
  training?: string;
  phone?: string;
  radioCallSign?: string;
  password?: string;
  allowDesktopView?: boolean;
  isArchived?: boolean;
  createdAt?: string;
  licenseModules?: string[];
  permissions?: AccessPermissions;
  mobilePermissions?: AccessPermissions;
}

export interface Asset {
  id: string;
  orgId?: string;
  name: string;
  type: string;
  park: string;
  location: string;
  condition: string;
  lastInspected: string;
  inspectionNotes?: string;
  customChecks?: string[];
  expectedLifespan?: number | string;
  isArchived?: boolean;
  gpsLocation?: { latitude: number; longitude: number };
  imageUrl?: string;
}

export interface Issue {
  id: string;
  orgId?: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Pending Approval' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  category: string;
  park: string;
  reportedBy: string;
  assignedTo?: string;
  createdAt: string;
  assetId?: string;
  imageUrl?: string;
  resolutionNote?: string;
  resolutionImageUrl?: string;
  resolutionDate?: string;
  collaborators?: string[];
  isArchived?: boolean;
  location?: { latitude: number; longitude: number };
}

export type Frequency = 'One-off' | 'Daily' | 'Weekly' | 'Monthly' | 'Six Monthly' | 'Yearly' | 'Bespoke';

export interface Task {
  id: string;
  orgId?: string;
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
  isLog?: boolean;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  isBespoke?: boolean;
  isArchived?: boolean;
  completedAt?: string;
  source?: 'smart-engine' | 'manual';
  displayTime?: string; // e.g. "09:00"
  isVolunteerEligible?: boolean;
  completedByVolunteers?: string[];
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
  frequency?: Frequency;
  completedAt?: string;
  inspectedBy?: string;
  notes?: string;
  assetNotes?: string;
  customChecks?: string[];
  checklist?: { 
    item: string, 
    status: 'Pass' | 'Fail' | 'N/A', 
    notes: string,
    imageUrl?: string 
  }[];
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  isBespoke?: boolean;
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
  managerNote?: string;
}

export interface ParkUpdate {
  id: string;
  type: 'Project' | 'Event' | 'Volunteering' | 'Sports' | 'UserGroup' | 'Operational' | 'Development' | 'TreeWorks' | 'Biodiversity' | 'ContractorWorks' | 'Maintenance';
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  createdBy: string;
  isArchived: boolean;
}

export interface ParkDetail {
  id: string;
  orgId?: string;
  name: string;
  headGardener?: string;
  areaManager?: string;
  depot?: string;
  parkOfficer?: string;
  features?: string[];
  updates?: ParkUpdate[]; // New discrete updates
  gfInspectionYear?: string;
  gfMysteryShopYear?: string;
  projects?: string;
  events?: string;
  operationalGuidance?: string;
  sportsAndLeisure?: string;
  volunteering?: string;
  userGroup?: string;
  userGroupChair?: string;
  greenflag?: boolean;
  greenFlagStatus?: 'Awarded' | 'Pending' | 'None';
  greenFlagInfo?: string;
}
export interface DepotUpdate {
  id: string;
  orgId?: string;
  type: 'Training' | 'Machinery' | 'Safety' | 'General' | 'Tools' | 'Sites';
  title: string;
  description: string;
  attendees?: string[]; // IDs or names of staff members
  startDate?: string;
  endDate?: string;
  createdAt: string;
  createdBy: string;
  isArchived: boolean;
}

export interface Machinery {
  id: string;
  orgId?: string;
  name: string;
  type: string;
  depotId: string;
  currentHours: number;
  lastServicedHours: number;
  serviceInterval: number;
  status: 'Operational' | 'In Repair' | 'Retired';
  lastUpdated?: string;
}

export interface DepotDetail {
  id: string; // Depot Name used as ID
  name: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  wifiCode?: string;
  gateCode?: string;
  overtimeSites?: string[];
  contractedSites?: string[];
  machinery?: string[]; // Pills for machinery
  tools?: string[]; // Pills for tools
  updates?: DepotUpdate[];
}

export type InfoItemType = 'Document' | 'Information' | 'CTA';

export interface InfoItem {
  id: string;
  type: InfoItemType;
  title: string;
  content: string;
  url?: string;
  ctaLabel?: string;
  interestedUserIds?: string[];
  allowResponse?: boolean;
  isVolunteerVisible?: boolean;
  createdBy: string;
  createdAt: string;
  isArchived: boolean;
}

export interface DailyCondition {
  id?: string;
  parkId: string;
  date: string; // ISO string
  temperature?: number; // Celsius (Optional)
  windSpeed?: number; // mph or km/h (Optional)
  humidity?: number; // Percentage (Optional)
  expectedFootfall?: 'Low' | 'Medium' | 'High' | 'Emergency'; // (Optional)
  tags?: string[]; // New: palette style conditions
  loggedBy: string; // user ID
  createdAt: string; // ISO string
}

export type Operator = '>' | '<' | '==' | '>=' | '<=' | 'contains';

export interface RuleCondition {
  field: 'temperature' | 'windSpeed' | 'humidity' | 'expectedFootfall' | 'tags' | 'machineryHours';
  operator: Operator;
  value: string | number;
  machineryId?: string; // Specific machine if field is machineryHours
}

export interface SmartRule {
  id?: string;
  name: string;
  category?: 'Operational' | 'Biodiversity' | 'ESG' | 'Volunteer';
  isActive: boolean;
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  tasksToGenerate: {
    title: string;
    objective: string;
    assignedTo: string;
    displayTime?: string;
    isVolunteerEligible?: boolean;
  }[];
  createdAt?: string;
}

export interface ParkSectionPermission {
  view: boolean;
  edit: boolean;
}

export type ParkSectionKey = 
  | 'keyInfo'
  | 'projects'
  | 'events'
  | 'operationalGuidance'
  | 'sportsLeisure'
  | 'volunteering'
  | 'userGroup'
  | 'development'
  | 'treeWorks'
  | 'biodiversity'
  | 'contractorWorks'
  | 'maintenanceWork';

export interface RoleParkPermissions {
  [sectionKey: string]: ParkSectionPermission;
}

export interface ParkPermissionsConfig {
  roles: {
    [role: string]: RoleParkPermissions;
  };
}

export const PARK_SECTIONS: { key: ParkSectionKey; label: string; number: number }[] = [
  { key: 'keyInfo', label: 'Key Information', number: 1 },
  { key: 'projects', label: 'Projects', number: 2 },
  { key: 'events', label: 'Events', number: 3 },
  { key: 'operationalGuidance', label: 'Operational Guidance', number: 4 },
  { key: 'sportsLeisure', label: 'Sports and Leisure', number: 5 },
  { key: 'volunteering', label: 'Volunteering', number: 6 },
  { key: 'userGroup', label: 'User Group', number: 7 },
  { key: 'development', label: 'Development Updates', number: 9 },
  { key: 'treeWorks', label: 'Tree Works', number: 10 },
  { key: 'biodiversity', label: 'Biodiversity', number: 11 },
  { key: 'contractorWorks', label: 'Contractor Works', number: 12 },
  { key: 'maintenanceWork', label: 'Recent Maintenance Work', number: 13 },
];

