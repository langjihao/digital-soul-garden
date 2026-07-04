import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    posts: defineCollection({
      type: 'page',
      source: 'posts/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        tags: z.array(z.string()).default([]),
        lang: z.enum(['zh', 'en']).default('zh'),
        minutes: z.number().default(5),
        draft: z.boolean().default(false),
        cover: z.string().optional(),
      }),
    }),
    tweets: defineCollection({
      type: 'data',
      source: 'tweets/*.yml',
      schema: z.object({
        num: z.number(),
        date: z.string(),
        text: z.string(),
        likes: z.number().default(0),
        replies: z.number().default(0),
        tags: z.array(z.string()).default([]),
      }),
    }),
    media: defineCollection({
      type: 'data',
      source: 'media/*.yml',
      schema: z.object({
        kind: z.enum(['photo', 'audio', 'book', 'film', 'music']),
        title: z.string(),
        note: z.string(),
        date: z.string(),
        duration: z.string().optional(),
        cover: z.string().optional(),
        rating: z.number().optional(),
      }),
    }),
  },
})
