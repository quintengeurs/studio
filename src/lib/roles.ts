export const Roles = {
  ADMIN: 'Admin',
  HEAD_OF_SERVICE: 'Head of Service',
  OPERATIONS_MANAGER: 'Operations Manager',
  AREA_MANAGER: 'Area Manager',
  ASSISTANT_AREA_MANAGER: 'Assistant Area Manager',
  SUPERVISOR: 'Supervisor',
  FIELD_OPERATIVE: 'Field Operative',
  CONTRACTOR: 'Contractor',
  VOLUNTEER_COORDINATOR: 'Volunteer Coordinator',
  VOLUNTEER: 'Volunteer',
  PARK_MANAGER: 'Park Manager',
  PARKS_DEVELOPMENT_OFFICER: 'Parks Development Officer',
  TREE_OFFICER: 'Tree Officer',
  BIODIVERSITY_MANAGER: 'Biodiversity Manager',
  PROJECT_MANAGER: 'Project Manager',
  EVENTS_MANAGER: 'Events Manager',
  SPORTS_AND_LEISURE_MANAGER: 'Sports and Leisure Manager',
  USER_GROUP_CHAIR: 'User Group Chair',
} as const;

export type Role = typeof Roles[keyof typeof Roles];

export const Modules = {
  CORE: 'core',
  SMART_TASKING: 'smart_tasking',
  INSPECTIONS: 'inspections',
  COMMUNITY: 'community',
  ESG_REPORTING: 'esg_reporting',
  ADVANCED_ANALYTICS: 'advanced_analytics',
} as const;

export type Module = typeof Modules[keyof typeof Modules];

export const MANAGEMENT_ROLES: Role[] = [
  Roles.ADMIN,
  Roles.AREA_MANAGER,
  Roles.ASSISTANT_AREA_MANAGER,
  Roles.HEAD_OF_SERVICE,
  Roles.OPERATIONS_MANAGER,
  Roles.PARK_MANAGER,
  Roles.PARKS_DEVELOPMENT_OFFICER,
  Roles.TREE_OFFICER,
  Roles.BIODIVERSITY_MANAGER,
  Roles.PROJECT_MANAGER,
  Roles.EVENTS_MANAGER,
  Roles.SPORTS_AND_LEISURE_MANAGER,
  Roles.USER_GROUP_CHAIR,
];

export const VOLUNTEER_ROLES: Role[] = [
  Roles.VOLUNTEER,
  Roles.VOLUNTEER_COORDINATOR,
];
