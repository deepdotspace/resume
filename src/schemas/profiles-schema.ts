import type { CollectionSchema } from 'deepspace/worker'

export const profilesSchema: CollectionSchema = {
  name: 'profiles',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'personalInfo', storage: 'text', interpretation: 'plain' },
    { name: 'summary', storage: 'text', interpretation: 'plain' },
    { name: 'experience', storage: 'text', interpretation: 'plain' },
    { name: 'education', storage: 'text', interpretation: 'plain' },
    { name: 'skills', storage: 'text', interpretation: 'plain' },
    { name: 'languages', storage: 'text', interpretation: 'plain' },
    { name: 'certifications', storage: 'text', interpretation: 'plain' },
    { name: 'projects', storage: 'text', interpretation: 'plain' },
    { name: 'customSections', storage: 'text', interpretation: 'plain' },
    { name: 'createdAt', storage: 'number', interpretation: 'plain' },
    { name: 'updatedAt', storage: 'number', interpretation: 'plain' },
  ],
  permissions: {
    admin: { read: true, create: true, update: true, delete: true },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    viewer: { read: 'own', create: true, update: 'own', delete: false },
  },
}
