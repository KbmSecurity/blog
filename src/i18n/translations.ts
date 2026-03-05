/**
 * Central translation strings for PT-BR / EN.
 * Each key maps to the `data-i18n` attribute value on DOM elements.
 * The global `applyTranslations(lang)` function (injected in BaseLayout.astro)
 * reads this map and sets element.textContent for each match.
 */
export const translations = {
    pt: {
        // ── Navigation ──────────────────────────────────────────────────────────
        "nav.mobile.title": "navegar",
        "nav.mobile.active": "ativo",
        "nav.mobile.legal": "⚠ Apenas para uso autorizado. Todo o conteúdo é para fins educacionais e pesquisa profissional em segurança.",
        "nav.mobile.services": "kbmsecurity.com.br — Serviços Red Team",

        // ── Footer ───────────────────────────────────────────────────────────────
        "footer.disclaimer": "⚠ APENAS PARA USO AUTORIZADO — Todo o conteúdo é destinado a profissionais de segurança em engagements autorizados, CTFs e ambientes de laboratório educacionais. O uso não autorizado é ilegal.",
        "footer.brand.desc": "Base de Conhecimento Red Team. Tutoriais, scripts & playbooks para operações ofensivas autorizadas.",
        "footer.heading.categories": "categorias",
        "footer.heading.resources": "recursos",
        "footer.heading.external": "externo",
        "footer.heading.contact": "contato",
        "footer.link.allPosts": "Todos os Posts",
        "footer.copyright": "Todos os direitos reservados.",
        "footer.terminal": "fique curioso",

        // ── Post Card ─────────────────────────────────────────────────────────────
        "card.readingTime": "min de leitura",
        "card.read": "ler",

        // ── Index — Hero ──────────────────────────────────────────────────────────
        "index.hero.desc": "Tutoriais de segurança ofensiva, técnicas de exploração e playbooks red team — alinhados ao MITRE ATT&CK, pensados para engagements autorizados. Por",
        "index.hero.cta.posts": "ver posts",

        // ── Index — Sections ──────────────────────────────────────────────────────
        "index.categories.heading": "categorias de ataque",
        "index.featured.heading": "destaque",
        "index.featured.badge": "DESTAQUE",
        "index.featured.readPost": "ler post",
        "index.recent.heading": "posts recentes",
        "index.recent.empty1": "// nenhum post publicado ainda",
        "index.recent.empty2": "conteúdo em breve",
        "index.recent.viewAll": "ver todos os posts",

        // ── Index — Bottom CTA ────────────────────────────────────────────────────
        "index.cta.heading": "Precisa de um Red Team engagement?",
        "index.cta.desc": "A KBM Security oferece operações profissionais de red team, pentest e serviços de simulação de adversários.",
        "index.rss.pre": "Assine via",
        "index.rss.post": "— fique por dentro das novas técnicas.",

        // ── Difficulty labels ─────────────────────────────────────────────────────
        "difficulty.easy": "fácil",
        "difficulty.medium": "médio",
        "difficulty.hard": "difícil",
        "difficulty.expert": "expert",

        // ── Post page sidebar & footer ─────────────────────────────────────────
        "post.meta.category": "Categoria",
        "post.meta.difficulty": "Dificuldade",
        "post.meta.os": "SO Alvo",
        "post.meta.readingTime": "Tempo de leitura",
        "post.meta.published": "Publicado",
        "post.footer.allPosts": "todos os posts",
        "post.footer.related": "posts relacionados",
        "post.footer.disclaimer.title": "⚠ Aviso Legal",
        "post.footer.disclaimer.body": "Este conteúdo é destinado exclusivamente a profissionais de segurança que operam em ambientes autorizados (testes de penetração, engagements red team, competições CTF ou laboratórios pessoais). O uso não autorizado dessas técnicas contra sistemas que você não possui ou não tem permissão escrita explícita para testar é ilegal e antiético. A KBM Security não assume responsabilidade por uso indevido.",
        "post.mitre.tactic": "Tática",
        "post.mitre.technique": "Técnica",
    },

    en: {
        // ── Navigation ──────────────────────────────────────────────────────────
        "nav.mobile.title": "navigate",
        "nav.mobile.active": "active",
        "nav.mobile.legal": "⚠ For authorized use only. All content is for educational purposes and professional security research.",
        "nav.mobile.services": "kbmsecurity.com.br — Red Team Services",

        // ── Footer ───────────────────────────────────────────────────────────────
        "footer.disclaimer": "⚠ FOR AUTHORIZED USE ONLY — All content is intended for security professionals in authorized engagements, CTFs, and educational lab environments. Unauthorized use is illegal.",
        "footer.brand.desc": "Red Team Knowledge Base. Tutorials, scripts & playbooks for authorized offensive operations.",
        "footer.heading.categories": "categories",
        "footer.heading.resources": "resources",
        "footer.heading.external": "external",
        "footer.heading.contact": "contact",
        "footer.link.allPosts": "All Posts",
        "footer.copyright": "All rights reserved.",
        "footer.terminal": "stay curious",

        // ── Post Card ─────────────────────────────────────────────────────────────
        "card.readingTime": "min read",
        "card.read": "read",

        // ── Index — Hero ──────────────────────────────────────────────────────────
        "index.hero.desc": "Offensive security tutorials, exploitation techniques and red team playbooks — aligned with MITRE ATT&CK, built for authorized engagements. By",
        "index.hero.cta.posts": "view posts",

        // ── Index — Sections ──────────────────────────────────────────────────────
        "index.categories.heading": "attack categories",
        "index.featured.heading": "featured",
        "index.featured.badge": "FEATURED",
        "index.featured.readPost": "read post",
        "index.recent.heading": "recent posts",
        "index.recent.empty1": "// no published posts yet",
        "index.recent.empty2": "content coming soon",
        "index.recent.viewAll": "view all posts",

        // ── Index — Bottom CTA ────────────────────────────────────────────────────
        "index.cta.heading": "Need a Red Team engagement?",
        "index.cta.desc": "KBM Security offers professional red team operations, pentesting, and adversary simulation services.",
        "index.rss.pre": "Subscribe via",
        "index.rss.post": "— stay up to date with new techniques.",

        // ── Difficulty labels ─────────────────────────────────────────────────────
        "difficulty.easy": "easy",
        "difficulty.medium": "medium",
        "difficulty.hard": "hard",
        "difficulty.expert": "expert",

        // ── Post page sidebar & footer ─────────────────────────────────────────
        "post.meta.category": "Category",
        "post.meta.difficulty": "Difficulty",
        "post.meta.os": "Target OS",
        "post.meta.readingTime": "Reading time",
        "post.meta.published": "Published",
        "post.footer.allPosts": "all posts",
        "post.footer.related": "related posts",
        "post.footer.disclaimer.title": "⚠ Legal Notice",
        "post.footer.disclaimer.body": "This content is intended exclusively for security professionals operating in authorized environments (penetration testing, red team engagements, CTF competitions, or personal labs). Unauthorized use of these techniques against systems you do not own or do not have explicit written permission to test is illegal and unethical. KBM Security assumes no responsibility for misuse.",
        "post.mitre.tactic": "Tactic",
        "post.mitre.technique": "Technique",
    },
} as const;

export type Lang = keyof typeof translations;
export type TranslationKey = keyof typeof translations.pt;
