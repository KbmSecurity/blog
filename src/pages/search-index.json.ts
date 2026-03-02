import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { filterPublished, calcReadingTime } from '../utils/content';

export const GET: APIRoute = async () => {
  const allPosts = await getCollection('posts');
  const posts    = filterPublished(allPosts);

  const index = posts.map((post) => ({
    id:          post.slug,
    title:       post.data.title,
    description: post.data.description,
    category:    post.data.category,
    difficulty:  post.data.difficulty,
    tags:        post.data.tags.join(' '),
    os:          post.data.os.join(' '),
    slug:        post.slug,
    readingTime: post.data.readingTime ?? calcReadingTime(post.body),
    date:        post.data.date.toISOString(),
  }));

  return new Response(JSON.stringify(index), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
