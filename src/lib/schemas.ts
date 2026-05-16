import { z } from 'zod';

/**
 * Common Fields
 */
const BaseSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * User Schema
 */
export const UserSchema = BaseSchema.extend({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.string(),
  roles: z.array(z.string()).optional(),
  depot: z.string().optional(),
  depots: z.array(z.string()).optional(),
  isOnline: z.boolean().optional(),
  lastActive: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Task Schema
 */
export const TaskSchema = BaseSchema.extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed', 'Cancelled']),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  assignedTo: z.string().optional(),
  assignedToName: z.string().optional(),
  dueDate: z.string().optional(),
  park: z.string(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * Issue Schema
 */
export const IssueSchema = BaseSchema.extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']),
  type: z.string(),
  park: z.string(),
  location: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
    description: z.string().optional(),
  }).optional(),
  reportedBy: z.string(),
  reportedByName: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export type Issue = z.infer<typeof IssueSchema>;

/**
 * Inspection Schema
 */
export const InspectionSchema = BaseSchema.extend({
  assetId: z.string(),
  assetName: z.string(),
  park: z.string(),
  status: z.enum(['Pending', 'Completed', 'Overdue']),
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

export type Inspection = z.infer<typeof InspectionSchema>;
