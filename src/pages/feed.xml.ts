import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { sortPostsByDate, filterPublished } from '../utils/content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const allPosts = await getCollection('posts');
  const posts = sortPostsByDate(filterPublished(allPosts));

  return rss({
    title: 'r3d/ops — Blog Red Team KBM Security',
    description: 'Tutoriais de segurança ofensiva, scripts e playbooks para operações red team autorizadas.',
    site: context.site ?? 'https://www.kbmsecurity.com.br',
    customData: `<language>pt-br</language><copyright>© ${new Date().getFullYear()} KBM Security</copyright>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/blog/post/${post.slug}/`,
      categories: [post.data.category, ...post.data.tags],
      customData: `
        <author>redteam@kbmsecurity.com.br</author>
        <category>${post.data.category}</category>
        <difficulty>${post.data.difficulty}</difficulty>
      `.trim(),
    })),
  });
};
