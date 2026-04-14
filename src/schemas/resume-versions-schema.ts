import type { CollectionSchema } from 'deepspace/worker'

export const resumeVersionsSchema: CollectionSchema = {
  name: 'resume-versions',
  columns: [
    { name: 'resumeId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'pdfData', storage: 'text', interpretation: 'plain', required: true },
    { name: 'latexSource', storage: 'text', interpretation: 'plain', required: true },
    { name: 'compiler', storage: 'text', interpretation: 'plain' },
    { name: 'templateId', storage: 'text', interpretation: 'plain' },
    { name: 'compiledAt', storage: 'number', interpretation: 'plain', required: true },
    { name: 'versionNum', storage: 'number', interpretation: 'plain', required: true },
  ],
  permissions: {
    admin: { read: true, create: true, update: true, delete: true },
    member: { read: 'own', create: true, update: false, delete: 'own' },
    viewer: { read: 'own', create: true, update: false, delete: false },
  },
}
