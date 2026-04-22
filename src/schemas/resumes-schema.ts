import type { CollectionSchema } from 'deepspace/worker'

export const resumesSchema: CollectionSchema = {
  name: 'resumes',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'templateId', storage: 'text', interpretation: 'plain' },
    { name: 'sourceProfileId', storage: 'text', interpretation: 'plain' },
    { name: 'personalInfo', storage: 'text', interpretation: 'plain' },
    { name: 'summary', storage: 'text', interpretation: 'plain' },
    { name: 'experience', storage: 'text', interpretation: 'plain' },
    { name: 'education', storage: 'text', interpretation: 'plain' },
    { name: 'skills', storage: 'text', interpretation: 'plain' },
    { name: 'languages', storage: 'text', interpretation: 'plain' },
    { name: 'certifications', storage: 'text', interpretation: 'plain' },
    { name: 'projects', storage: 'text', interpretation: 'plain' },
    { name: 'customSections', storage: 'text', interpretation: 'plain' },
    { name: 'sectionOrder', storage: 'text', interpretation: 'plain' },
    { name: 'latexSource', storage: 'text', interpretation: 'plain' },
    { name: 'latexOverrideMode', storage: 'number', interpretation: 'boolean' },
    { name: 'jobDescription', storage: 'text', interpretation: 'plain' },
    { name: 'lastCompiledAt', storage: 'number', interpretation: 'plain' },
    { name: 'status', storage: 'text', interpretation: 'plain' },
    { name: 'createdAt', storage: 'number', interpretation: 'plain' },
    { name: 'updatedAt', storage: 'number', interpretation: 'plain' },
  ],
  permissions: {
    admin: { read: true, create: true, update: true, delete: true },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    viewer: { read: 'own', create: false, update: false, delete: false },
  },
}
