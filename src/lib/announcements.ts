export interface Announcement {
  id: string;
  title: string;
  date: string;
  description: string;
  features: string[];
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "v1.1-volunteer-hub",
    title: "Introducing the Volunteer Hub!",
    date: "May 2026",
    description: "We've completely revamped how volunteering works. Now you can easily manage, track, and reward your volunteers all in one place.",
    features: [
      "New Volunteer Hub interface tailored for public access",
      "Dynamic points and rewards system for volunteer tasks",
      "Dedicated 'Hub News' tab for community announcements",
    ],
  },
  {
    id: "v1.1-smart-tasking",
    title: "Smart Tasking Engine",
    date: "April 2026",
    description: "Our new Smart Tasking engine automatically routes issues and tasks to the right people based on skill tags and location.",
    features: [
      "Automated assignment based on rules",
      "Dynamic rule builder in Platform Admin",
    ],
  }
];
