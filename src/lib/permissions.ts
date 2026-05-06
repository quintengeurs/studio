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

/**
 * Calculates the final, effective permission set for a user by merging role defaults 
 * with any custom overrides stored in their user profile.
 */
export function getEffectivePermissions(
  user: User | null | undefined, 
  isMobile: boolean,
  fallbackEmail?: string | null
): AccessPermissions {
  // 1. Get the base defaults for the current platform
  const defaults = isMobile 
    ? getDefaultMobilePermissionsForUser(user) 
    : getDefaultPermissionsForUser(user, fallbackEmail);

  // 2. Determine if the user is a system admin (special override that always gets full access)
  const isSystemAdmin = 
    user?.email?.toLowerCase() === 'quinten.geurs@gmail.com' || 
    fallbackEmail?.toLowerCase() === 'quinten.geurs@gmail.com' ||
    (user?.roles || []).includes('Admin');

  if (isSystemAdmin) {
    // Return full desktop permissions regardless of platform for system admins to ensure they are never locked out
    return getDefaultPermissionsForUser(null, 'quinten.geurs@gmail.com');
  }

  // 3. Extract custom overrides from the user profile
  const overrides = isMobile ? user?.mobilePermissions : user?.permissions;

  // 4. Merge defaults with overrides (if any exist)
  if (overrides && Object.keys(overrides).length > 0) {
    return {
      ...defaults,
      ...overrides
    };
  }

  return defaults;
}

/**
 * Overrides user permissions based on the active features enabled for their organization.
 * This ensures that if a module is disabled at the SaaS level, no user (even admins) can access it.
 */
export function applyFeatureGating(permissions: AccessPermissions, activeFeatures: string[] | undefined): AccessPermissions {
  if (!activeFeatures) return permissions;

  return {
    ...permissions,
    viewDashboard: permissions.viewDashboard && activeFeatures.includes('dashboard'),
    viewAssets: permissions.viewAssets && activeFeatures.includes('assets'),
    viewParks: permissions.viewParks && activeFeatures.includes('parks'),
    viewDepots: permissions.viewDepots && activeFeatures.includes('depots'),
    viewInspections: permissions.viewInspections && activeFeatures.includes('inspections'),
    viewIssues: permissions.viewIssues && activeFeatures.includes('issues'),
    viewStaffRequests: permissions.viewStaffRequests && activeFeatures.includes('requests'),
    viewAllTasks: permissions.viewAllTasks && activeFeatures.includes('tasks'),
    viewUsers: permissions.viewUsers && activeFeatures.includes('users'),
    viewVolunteering: permissions.viewVolunteering && activeFeatures.includes('volunteering'),
    viewSmartTasking: permissions.viewSmartTasking && activeFeatures.includes('smart_tasking'),
    viewInfoCorner: permissions.viewInfoCorner && activeFeatures.includes('info_corner'),
    viewMap: permissions.viewMap && activeFeatures.includes('map'),
  };
}

