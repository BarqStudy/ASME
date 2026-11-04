import type { publicContent } from "./content";
type Wire<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Wire<U>[]
    : T extends object
      ? { [K in keyof T]: Wire<T[K]> }
      : T;
export type Content = Wire<Awaited<ReturnType<typeof publicContent>>>;
export type Bi = { ar: string; en: string };
export type Lang = "ar" | "en";
export type Me = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  verified: boolean;
};
export type Profile = {
  universityId: string;
  college: string;
  major: string;
  level: string;
  bioAr: string;
  bioEn: string;
  skills: string[];
  software: string[];
  experience: string[];
  awards: string[];
  linkedin: string;
  github: string;
  slug: string;
  publicEnabled: boolean;
  publicSkills: boolean;
  publicProjects: boolean;
  publicExperience: boolean;
};
export type Registration = {
  id: string;
  status: string;
  event: Content["events"][number];
  attendance: { checkedAt: string } | null;
  certificate: { code: string; revokedAt: string | null } | null;
  feedback: { rating: number; comment: string } | null;
};
export type Portal = {
  application: { id: string; status: string; reviewNote: string } | null;
  registrations: Registration[];
  projects: (Content["projects"][number] & {
    publication: string;
    applications: {
      id: string;
      status: string;
      message: string;
      user: { fullName: string };
    }[];
  })[];
  teamApplications: {
    id: string;
    status: string;
    project: { title: unknown };
  }[];
  submissions: {
    id: string;
    title: string;
    competition: { title: unknown };
    scores: { total: number; feedback: string }[];
  }[];
  saved: { id: string; resource: Content["resources"][number] }[];
  notifications: {
    id: string;
    title: unknown;
    body: unknown;
    readAt: string | null;
    link: string;
  }[];
  tasks: { id: string; title: unknown; description: unknown; status: string }[];
};
