import { User, AccessPermissions, Role } from "./types";

const ALL_FALSE: AccessPermissions = {
  viewDashboard: false,
  viewMyTasks: false,
  viewAssets: false,
  viewParks: false,
  viewDepots: false,
  viewInspections: false,
  viewIssues: false,
  viewResolvedIssues: false,
  viewStaffRequests: false,
  viewAllTasks: false,
  viewArchivedTasks: false,
  viewUsers: false,
  viewArchivedStaff: false,

  createTask: false,
  assignTask: false,
  createIssue: false,
  scheduleInspection: false,
  manageAssets: false,
  approveResolution: false,

  editParksFull: false,
  editParkDevelopment: false,
  editDepotsFull: false,
};

export function getDefaultPermissionsForUser(user: User | null | undefined): AccessPermissions {
  if (!user) return { ...ALL_FALSE };
  
  if (user.permissions) {
    return user.permissions;
  }

  // Fallback map evaluating legacy roles mapping
  const roles = user.roles || (user.role ? [user.role] : []);
  const isAdmin = roles.includes('Admin') || user.email?.toLowerCase() === 'quinten.geurs@gmail.com';
  const isContractor = roles.includes('Contractor') && roles.length === 1;
  const isManagement = roles.some(r => ['Area Manager', 'Assistant Area Manager', 'Operations Manager', 'Head Gardener'].includes(r)) || isAdmin;
  const canViewRequests = isAdmin || roles.includes('Area Manager') || roles.includes('Operations Manager');

  if (isAdmin) {
    return {
      viewDashboard: true,
      viewMyTasks: true,
      viewAssets: true,
      viewParks: true,
      viewDepots: true,
      viewInspections: true,
      viewIssues: true,
      viewResolvedIssues: true,
      viewStaffRequests: true,
      viewAllTasks: true,
      viewArchivedTasks: true,
      viewUsers: true,
      viewArchivedStaff: true,
      
      createTask: true,
      assignTask: true,
      createIssue: true,
      scheduleInspection: true,
      manageAssets: true,
      approveResolution: true,
      
      editParksFull: true,
      editParkDevelopment: true,
      editDepotsFull: true,
    };
  }

  if (isContractor) {
    return {
      ...ALL_FALSE,
      viewDashboard: true,
      viewParks: true,
      viewDepots: true,
      createIssue: true,
      viewMyTasks: true, // Assuming contractors pull from tasks explicitly assigned
    };
  }

  if (isManagement) {
    return {
      ...ALL_FALSE,
      viewDashboard: true,
      viewMyTasks: true,
      viewAssets: true,
      viewParks: true,
      viewDepots: true,
      viewInspections: true,
      viewIssues: true,
      viewResolvedIssues: true,
      viewStaffRequests: canViewRequests,
      viewAllTasks: true,
      
      createTask: true,
      assignTask: true,
      createIssue: true,
      scheduleInspection: true,
      manageAssets: true,
      approveResolution: true,

      editParksFull: roles.some(r => ['Area Manager', 'Head Gardener'].includes(r)),
      editParkDevelopment: roles.includes('Parks Development Officer'),
      editDepotsFull: roles.some(r => ['Area Manager', 'Head Gardener'].includes(r)),
    };
  }

  // Standard Operations
  return {
    ...ALL_FALSE,
    viewDashboard: true,
    viewMyTasks: true,
    viewParks: true,
    viewDepots: true,
    createIssue: true,
  };
}
