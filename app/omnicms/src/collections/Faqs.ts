import type { CollectionConfig } from 'payload'

export const Faqs: CollectionConfig = {
  slug: 'faq',
  admin: {
    useAsTitle: 'question',
  },
  access: {
    read: () => true, // Make FAQs public
  },
  fields: [
    {
      name: 'question',
      label: 'Question',
      type: 'text',
      required: true,
    },
    {
      name: 'answer',
      label: 'Answer',
      type: 'textarea',
      required: true,
    },
  ],
}
