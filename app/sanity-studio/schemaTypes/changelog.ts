import {defineField, defineType} from 'sanity'

/**
 * Changelog document schema.
 *
 * Each document = one released version.
 *
 * Fields:
 *  version     – semver string,  e.g. "1.1.4"
 *  title       – display label,  e.g. "v1.1.4 – Storage & Budget"
 *  publishedAt – ISO date the version shipped
 *  summary     – one-liner for the sidebar / preview
 *  notes       – rich-text (blockContent) with the full release details
 *  tags        – free-form labels,  e.g. ["feature", "fix", "ui"]
 */
export default defineType({
  name: 'changelog',
  title: 'Changelog',
  type: 'document',

  fields: [
    defineField({
      name: 'version',
      title: 'Version',
      type: 'string',
      description: 'Semver string — e.g. 1.1.4',
      validation: (Rule) =>
        Rule.required().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, {
          name: 'semver',
          invert: false,
        }),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Short label shown in sidebar — e.g. "Storage & Budget Tracker"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'date',
      options: {dateFormat: 'YYYY-MM-DD'},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'string',
      description: 'One-sentence description shown in previews and tooltips',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        layout: 'tags',
        list: [
          {title: 'Feature', value: 'feature'},
          {title: 'Fix', value: 'fix'},
          {title: 'UI', value: 'ui'},
          {title: 'Performance', value: 'perf'},
          {title: 'Security', value: 'security'},
          {title: 'Breaking', value: 'breaking'},
          {title: 'Internal', value: 'internal'},
        ],
      },
    }),
    defineField({
      name: 'notes',
      title: 'Release Notes',
      type: 'blockContent',
      description: 'Full rich-text release notes visible on the changelog page',
    }),
  ],

  orderings: [
    {
      title: 'Release Date, Newest First',
      name: 'releaseDateDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],

  preview: {
    select: {
      title: 'version',
      subtitle: 'title',
      description: 'publishedAt',
    },
    prepare({title, subtitle, description}) {
      return {
        title: `v${title}`,
        subtitle: `${description ?? ''} — ${subtitle ?? ''}`,
      }
    },
  },
})
