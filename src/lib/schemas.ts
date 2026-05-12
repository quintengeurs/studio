import { z } from "zod";

export const volunteerTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  objective: z.string().min(10, "Please provide a clear objective (min 10 chars)").max(500),
  park: z.string().min(1, "Please select a location"),
  dueDate: z.string().min(1, "Please select a deadline"),
  startDate: z.string().min(1, "Please select a start date"),
  endDate: z.string().min(1, "Please select an expiry date"),
  maxVolunteers: z.coerce.number().min(1, "Must allow at least 1 volunteer").max(100),
  volunteerPoints: z.coerce.number().min(1, "Must award at least 1 point").max(1000),
  rewardDescription: z.string().optional(),
  rewardCode: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const logWorkSchema = z.object({
  title: z.string().min(3, "Please provide a descriptive title").max(100),
  park: z.string().min(1, "Location is required"),
  note: z.string().optional(),
  imageUrl: z.string().optional(),
  selectedColleagues: z.array(z.string()).default([])
});

export const issueSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  category: z.string().min(1, "Please select a category").default("General"),
  park: z.string().min(1, "Location is required"),
  imageUrl: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).nullable().optional()
});

export const requestSchema = z.object({
  category: z.enum(["Materials", "Tools", "Equipment", "PPE", "Other"]).default("Materials"),
  description: z.string().min(5, "Please provide more details about your request").max(500),
  depot: z.string().min(1, "Please select a collection depot"),
  imageUrl: z.string().optional()
});
