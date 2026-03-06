import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { sortPostsByDate, filterPublished } from '../utils/content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const allPosts = await getCollection('posts');
  const posts = sortPostsByDate(filterPublished(allPosts));

  const container = await AstroContainer.create();

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      const content = await container.renderToString(Content);

      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.date,
        link: `/blog/post/${post.id}/`,
        content,
        categories: [post.data.category, ...post.data.tags],
        customData: `
          <author>redteam@kbmsecurity.com.br</author>
          <category>${post.data.category}</category>
          <difficulty>${post.data.difficulty}</difficulty>
        `.trim(),
      };
    }),
  );

  return rss({
    title: 'r3d/ops — Blog Red Team KBM Security',
    description: 'Tutoriais de segurança ofensiva, scripts e playbooks para operações red team autorizadas.',
    site: context.site ?? 'https://www.kbmsecurity.com.br',
    stylesheet: '/blog/feed.xsl',
    customData: `<language>pt-br</language><copyright>© ${new Date().getFullYear()} KBM Security</copyright>`,
    items,
  });
};
