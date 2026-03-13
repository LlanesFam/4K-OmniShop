import type { CollectionConfig } from 'payload'

export const Docs: CollectionConfig = {
  slug: 'doc',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true, // Make docs public
  },
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'Slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier (e.g., my-doc-title)',
      },
    },
    {
      name: 'content',
      label: 'Content',
      type: 'richText',
    },
  ],
}
