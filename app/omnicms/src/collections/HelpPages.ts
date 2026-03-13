import type { CollectionConfig } from 'payload'

export const HelpPages: CollectionConfig = {
  slug: 'helpPage',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true, // Make help pages public
  },
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      admin: {
        description: 'Short description text below the title.',
      },
    },
    {
      name: 'cards',
      label: 'Help Cards',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea', required: true },
        { name: 'action', type: 'text', required: true, label: 'Action Text' },
        { name: 'url', type: 'text', required: true, label: 'URL/Link' },
        {
          name: 'iconName',
          type: 'select',
          label: 'Icon Name (Lucide)',
          options: [
            { label: 'BookOpen', value: 'BookOpen' },
            { label: 'LifeBuoy', value: 'LifeBuoy' },
            { label: 'MessageSquare', value: 'MessageSquare' },
            { label: 'ExternalLink', value: 'ExternalLink' },
            { label: 'HelpCircle', value: 'HelpCircle' },
          ],
          required: true,
        },
        {
          name: 'external',
          type: 'checkbox',
          label: 'Is External Link?',
          defaultValue: false,
        },
      ],
    },
  ],
}
