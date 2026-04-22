import type { CollectionSchema } from 'deepspace/worker'

export const editorSettingsSchema: CollectionSchema = {
  name: 'editorSettings',
  columns: [
    { name: 'theme', storage: 'text', interpretation: 'plain' },
    { name: 'defaultTemplate', storage: 'text', interpretation: 'plain' },
    { name: 'defaultCompiler', storage: 'text', interpretation: 'plain' },
    { name: 'activeResumeId', storage: 'text', interpretation: 'plain' },
    { name: 'backgroundId', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    admin: { read: true, create: true, update: true, delete: true },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    viewer: { read: 'own', create: false, update: false, delete: false },
  },
}
