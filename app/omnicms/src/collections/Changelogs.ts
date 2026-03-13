import type { CollectionConfig } from 'payload'

export const Changelogs: CollectionConfig = {
  slug: 'changelog',
  admin: {
    useAsTitle: 'version',
  },
  access: {
    read: () => true, // Make changelogs public to fetch from frontend
  },
  fields: [
    {
      name: 'version',
      label: 'Version Number',
      type: 'text',
      required: true,
      admin: {
        description: 'e.g., v1.1.6',
      },
    },
    {
      name: 'date',
      label: 'Release Date',
      type: 'date',
      required: true,
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'Feature', value: 'feature' },
        { label: 'Bugfix', value: 'bugfix' },
        { label: 'Improvement', value: 'improvement' },
      ],
      required: true,
    },
    {
      name: 'content',
      label: 'Content (Markdown)',
      type: 'textarea',
      required: true,
    },
  ],
}
