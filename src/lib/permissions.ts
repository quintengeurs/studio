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
  viewMap: false,

  createTask: false,
  assignTask: false,
  createIssue: false,
  scheduleInspection: false,
  manageAssets: false,
  approveResolution: false,

  editParksFull: false,
  editParkDevelopment: false,
  editDepotsFull: false,
  viewInfoCorner: false,
  manageInfoCorner: false,
  viewSmartTasking: false,
  viewVolunteering: false,
};

export function getDefaultPermissionsForUser(user: User | null | undefined, fallbackEmail?: string | null): AccessPermissions {
  // If no user profile exists, check if the logged-in email is the system admin
  const isSystemAdmin = fallbackEmail?.toLowerCase() === 'quinten.geurs@gmail.com';
  
  if (!user && !isSystemAdmin) {
    if (fallbackEmail) {
      return {
        ...ALL_FALSE,
        viewDashboard: true,
        viewMyTasks: true,
        viewParks: true,
        viewDepots: true,
        viewInfoCorner: true,
        viewVolunteering: true,
        createIssue: true,
      };
    }
    return { ...ALL_FALSE };
  }
  

  // Aggregate unique roles from all legacy and new fields
  const rolesSet = new Set<string>();
  if (user?.role) rolesSet.add(user.role);
  if (user?.roles) user.roles.forEach(r => rolesSet.add(r));
  if (user?.assignedRoles) user.assignedRoles.forEach(ar => rolesSet.add(ar.role));
  
  const roles = Array.from(rolesSet);
  const isAdmin = roles.includes('Admin') || user?.email?.toLowerCase() === 'quinten.geurs@gmail.com' || isSystemAdmin;
  const isContractor = roles.includes('Contractor') && roles.length === 1;
  const isManagement = roles.some(r => ['Area Manager', 'Assistant Area Manager', 'Operations Manager', 'Head Gardener', 'Park Manager'].includes(r)) || isAdmin;
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
      viewMap: true,
      viewInfoCorner: true,
      manageInfoCorner: true,
      viewSmartTasking: true,
      viewVolunteering: true,
    };
  }

  if (isContractor) {
    return {
      ...ALL_FALSE,
      viewDashboard: true,
      viewParks: true,
      viewDepots: true,
      createIssue: true,
      viewMyTasks: true,
      viewVolunteering: true,
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

      editParksFull: roles.some(r => ['Area Manager', 'Head Gardener', 'Park Manager'].includes(r)),
      editParkDevelopment: roles.some(r => ['Parks Development Officer', 'Biodiversity Manager'].includes(r)),
      editDepotsFull: roles.some(r => ['Area Manager', 'Head Gardener', 'Park Manager'].includes(r)),
      viewMap: roles.some(r => ['Area Manager', 'Operations Manager', 'Assistant Area Manager', 'Head Gardener'].includes(r)),
      viewInfoCorner: true,
      viewVolunteering: true,
      manageInfoCorner: roles.some(r => ['Area Manager', 'Operations Manager'].includes(r)),
    };
  }

  // Standard Operations
  return {
    ...ALL_FALSE,
    viewDashboard: true,
    viewMyTasks: true,
    viewParks: true,
    viewDepots: true,
    viewInfoCorner: true,
    viewVolunteering: true,
    createIssue: true,
  };
}

/**
 * Returns sensible mobile-specific default permissions for a user based on their role.
 * Mobile defaults are generally narrower than desktop — focused on field-relevant pages.
 */
export function getDefaultMobilePermissionsForUser(user: User | null | undefined): AccessPermissions {
  if (!user) return { ...ALL_FALSE };

  const rolesSet = new Set<string>();
  if (user.role) rolesSet.add(user.role);
  if (user.roles) user.roles.forEach(r => rolesSet.add(r));
  if (user.assignedRoles) user.assignedRoles.forEach(ar => rolesSet.add(ar.role));

  const roles = Array.from(rolesSet);
  const isAdmin = roles.includes('Admin') || user.email?.toLowerCase() === 'quinten.geurs@gmail.com';
  const isContractor = roles.includes('Contractor') && roles.length === 1;
  const isManagement = roles.some(r => ['Area Manager', 'Assistant Area Manager', 'Operations Manager', 'Head Gardener', 'Park Manager'].includes(r)) || isAdmin;

  if (isAdmin) {
    return {
      ...ALL_FALSE,
      viewDashboard: true,
      viewMyTasks: true,
      viewParks: true,
      viewDepots: true,
      viewInspections: true,
      viewIssues: true,
      viewAllTasks: true,
      createTask: true,
      assignTask: true,
      createIssue: true,
      scheduleInspection: true,
      approveResolution: true,
      viewInfoCorner: true,
      manageInfoCorner: true,
      viewMap: true,
      viewVolunteering: true,
    };
  }

  if (isContractor) {
    return {
      ...ALL_FALSE,
      viewDashboard: true,
      viewMyTasks: true,
      viewParks: true,
      createIssue: true,
      viewVolunteering: true,
    };
  }

  if (isManagement) {
    return {
      ...ALL_FALSE,
      viewDashboard: true,
      viewMyTasks: true,
      viewParks: true,
      viewDepots: true,
      viewInspections: true,
      viewIssues: true,
      createTask: true,
      assignTask: true,
      createIssue: true,
      scheduleInspection: true,
      approveResolution: true,
      viewInfoCorner: true,
      viewVolunteering: true,
      viewMap: roles.some(r => ['Area Manager', 'Operations Manager', 'Assistant Area Manager', 'Head Gardener'].includes(r)),
    };
  }

  // Standard operatives on mobile
  return {
    ...ALL_FALSE,
    viewDashboard: true,
    viewMyTasks: true,
    viewParks: true,
    viewDepots: true,
    viewInfoCorner: true,
    viewVolunteering: true,
    createIssue: true,
  };
}
