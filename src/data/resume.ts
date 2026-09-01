import { z } from 'astro/zod';
import resumeData from './resume.json';

const dateString = z.string().regex(/^\d{4}(-\d{2})?(-\d{2})?$/, 'Use YYYY, YYYY-MM, or YYYY-MM-DD');

const resumeSchema = z.object({
  basics: z.object({
    name: z.string().min(1),
    label: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    url: z.string().url().optional(),
    summary: z.string(),
    location: z.object({
      city: z.string(),
      region: z.string(),
      countryCode: z.string().length(2),
    }),
    profiles: z.array(z.object({
      network: z.string(),
      username: z.string(),
      url: z.string().url(),
    })).default([]),
  }),

  work: z.array(z.object({
    name: z.string(),
    position: z.string(),
    startDate: dateString,
    endDate: dateString.nullable(),
    summary: z.string().optional(),
    highlights: z.array(z.string()).default([]),
  })).default([]),

  education: z.array(z.object({
    institution: z.string(),
    area: z.string(),
    studyType: z.string(),
    startDate: dateString,
    endDate: dateString.nullable(),
    courses: z.array(z.string()).default([]),
  })).default([]),

  certificates: z.array(z.object({
    name: z.string(),
    date: dateString,
    issuer: z.string(),
    url: z.string().url().optional(),
  })).default([]),

  skills: z.array(z.object({
    name: z.string(),
    level: z.string().optional(),
    keywords: z.array(z.string()).default([]),
  })).default([]),
});

export const resume = resumeSchema.parse(resumeData);
export type Resume = z.infer<typeof resumeSchema>;