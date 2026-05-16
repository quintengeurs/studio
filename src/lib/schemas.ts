import { z } from 'zod';

/**
 * Common Fields
 */
const BaseSchema = z.object({
  id: z.string().optional(),
  orgId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * User Schema
 */
export const UserSchema = BaseSchema.extend({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.string().optional(),
  roles: z.array(z.string()).optional(),
  depot: z.string().optional(),
  depots: z.array(z.string()).optional(),
  isOnline: z.boolean().optional(),
  lastActive: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const userSchema = UserSchema;
export type User = z.infer<typeof UserSchema>;

/**
 * Task Schema
 */
export const TaskSchema = BaseSchema.extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  assignedTo: z.string().optional(),
  assignedToName: z.string().optional(),
  dueDate: z.string().optional(),
  park: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const taskSchema = TaskSchema;
export type Task = z.infer<typeof TaskSchema>;

/**
 * Issue Schema
 */
export const IssueSchema = BaseSchema.extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  park: z.string().min(1, "Park is required"),
  imageUrl: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).nullable().optional(),
  reportedBy: z.string().optional(),
  reportedByName: z.string().optional(),
});

export const issueSchema = IssueSchema;
export type Issue = z.infer<typeof IssueSchema>;

/**
 * Inspection Schema
 */
export const InspectionSchema = BaseSchema.extend({
  assetId: z.string(),
  assetName: z.string(),
  park: z.string(),
  status: z.enum(['Pending', 'Completed', 'Overdue']).optional(),
  dueDate: z.string(),
  completedAt: z.string().optional(),
  inspectedBy: z.string().optional(),
  frequency: z.string().optional(),
  checklist: z.array(z.object({
    item: z.string(),
    status: z.enum(['Pass', 'Fail', 'N/A']),
    notes: z.string().optional(),
    imageUrl: z.string().optional(),
  })).optional(),
});

export const inspectionSchema = InspectionSchema;
export type Inspection = z.infer<typeof InspectionSchema>;

/**
 * Log Work Schema
 */
export const LogWorkSchema = z.object({
  title: z.string().min(1, "Describe what you did"),
  park: z.string().min(1, "Select a park"),
  note: z.string().optional(),
  imageUrl: z.string().optional(),
  selectedColleagues: z.array(z.string()).default([]),
});

export const logWorkSchema = LogWorkSchema;

/**
 * Request Schema
 */
export const RequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Details are required"),
  type: z.string().min(1, "Type is required"),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  park: z.string().min(1, "Park is required"),
  images: z.array(z.string()).optional(),
});

export const requestSchema = RequestSchema;

/**
 * Volunteer Task Schema
 */
export const VolunteerTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  park: z.string().min(1, "Park is required"),
  date: z.string().min(1, "Date is required"),
  slots: z.number().min(1),
  imageUrl: z.string().optional(),
});

export const volunteerTaskSchema = VolunteerTaskSchema;
