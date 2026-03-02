import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { sortPostsByDate, filterPublished } from '../utils/content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const allPosts = await getCollection('posts');
  const posts    = sortPostsByDate(filterPublished(allPosts));

  return rss({
    title:       'r3d/ops — KBM Security Red Team Blog',
    description: 'Offensive security tutorials, scripts, and playbooks for authorized red team operations.',
    site:        context.site ?? 'https://www.kbmsecurity.com.br',
    customData:  `<language>en-us</language><copyright>© ${new Date().getFullYear()} KBM Security</copyright>`,
    items: posts.map((post) => ({
      title:       post.data.title,
      description: post.data.description,
      pubDate:     post.data.date,
      link:        `/blog/post/${post.slug}/`,
      categories:  [post.data.category, ...post.data.tags],
      customData:  `
        <author>redteam@kbmsecurity.com.br</author>
        <category>${post.data.category}</category>
        <difficulty>${post.data.difficulty}</difficulty>
      `.trim(),
    })),
  });
};
