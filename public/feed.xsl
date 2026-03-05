<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title><xsl:value-of select="/rss/channel/title"/> — RSS Feed</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""/>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,700;1,400&amp;display=swap" rel="stylesheet"/>
        <style><![CDATA[
          *, *::before, *::after { box-sizing: border-box; }

          :root {
            --bg:          #0a0a0a;
            --bg-card:     #111111;
            --bg-raised:   #161616;
            --border:      #1c1c1c;
            --border-b:    #2a2a2a;
            --green:       #00ff41;
            --green-dim:   #00cc33;
            --red:         #ff3c3c;
            --yellow:      #ffd700;
            --blue:        #4fc3f7;
            --text:        #c9d1d9;
            --text-muted:  #6e7681;
            --text-dim:    #444d56;
          }

          html {
            background: var(--bg);
            color: var(--text);
            font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
            -webkit-font-smoothing: antialiased;
            scroll-behavior: smooth;
          }

          body { margin: 0; padding: 0; min-height: 100vh; }

          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: var(--bg); }
          ::-webkit-scrollbar-thumb { background: var(--border-b); border-radius: 2px; }
          ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

          ::selection { background: rgba(0,255,65,.15); color: var(--green); }

          a { color: var(--blue); text-decoration: none; transition: color .15s; }
          a:hover { color: var(--green); }

          /* ── Header ── */
          .site-header {
            border-bottom: 1px solid var(--border);
            padding: 1.5rem 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            background: var(--bg-card);
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .header-left { display: flex; align-items: center; gap: 1rem; }

          .rss-icon {
            width: 40px; height: 40px;
            background: rgba(255,88,0,.12);
            border: 1px solid rgba(255,88,0,.35);
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.2rem;
            flex-shrink: 0;
          }

          .feed-meta {}
          .feed-title {
            font-size: 1rem;
            font-weight: 700;
            color: var(--green);
            margin: 0 0 .25rem;
            letter-spacing: -.01em;
          }
          .feed-desc {
            font-size: .72rem;
            color: var(--text-muted);
            margin: 0;
          }

          .header-right { display: flex; align-items: center; gap: .75rem; }

          .badge {
            display: inline-flex; align-items: center; gap: .3rem;
            padding: .2rem .6rem;
            border-radius: 4px;
            font-size: .65rem;
            font-weight: 600;
            letter-spacing: .08em;
            text-transform: uppercase;
          }
          .badge-rss {
            background: rgba(255,88,0,.1);
            border: 1px solid rgba(255,88,0,.3);
            color: #ff5800;
          }
          .badge-count {
            background: rgba(0,255,65,.07);
            border: 1px solid rgba(0,255,65,.2);
            color: var(--green);
          }

          /* ── Layout ── */
          .page { max-width: 860px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

          /* ── Prompt bar ── */
          .prompt-bar {
            display: flex; align-items: center; gap: .4rem;
            font-size: .75rem;
            color: var(--text-muted);
            margin-bottom: 1.75rem;
            padding: .5rem .75rem;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
          }
          .prompt-host { color: var(--green); }
          .prompt-sep  { color: var(--text-dim); }
          .prompt-path { color: var(--blue); }
          .prompt-cmd  { color: var(--text); }
          .cursor {
            display: inline-block;
            width: .5em; height: 1em;
            background: var(--green);
            animation: blink 1s step-end infinite;
            vertical-align: text-bottom;
            margin-left: 2px;
          }

          /* ── Post cards ── */
          .post-list { display: flex; flex-direction: column; gap: 1rem; }

          .post-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.25rem 1.5rem;
            transition: border-color .2s, transform .2s;
            display: block;
          }
          .post-card:hover {
            border-color: var(--green-dim);
            transform: translateY(-1px);
          }

          .post-card-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 1rem;
            margin-bottom: .75rem;
          }

          .post-title {
            font-size: .95rem;
            font-weight: 700;
            color: var(--text);
            margin: 0 0 .3rem;
            line-height: 1.35;
            transition: color .15s;
          }
          .post-card:hover .post-title { color: var(--green); }

          .post-date {
            font-size: .65rem;
            color: var(--text-dim);
            white-space: nowrap;
            flex-shrink: 0;
            margin-top: .15rem;
          }

          .post-desc {
            font-size: .8rem;
            color: var(--text-muted);
            line-height: 1.6;
            margin: 0 0 .9rem;
          }

          .post-footer {
            display: flex;
            align-items: center;
            gap: .5rem;
            flex-wrap: wrap;
          }

          .tag {
            display: inline-flex; align-items: center;
            padding: .1rem .45rem;
            border-radius: 3px;
            font-size: .62rem;
            font-weight: 500;
            letter-spacing: .04em;
            background: var(--bg-raised);
            border: 1px solid var(--border-b);
            color: var(--text-muted);
          }

          .read-link {
            margin-left: auto;
            font-size: .68rem;
            color: var(--blue);
            display: flex; align-items: center; gap: .25rem;
          }
          .read-link:hover { color: var(--green); }
          .read-link::after { content: " →"; }

          /* ── Footer ── */
          .site-footer {
            text-align: center;
            padding: 2rem;
            font-size: .7rem;
            color: var(--text-dim);
            border-top: 1px solid var(--border);
            margin-top: 3rem;
          }
          .site-footer a { color: var(--text-muted); }
          .site-footer a:hover { color: var(--green); }

          /* ── Animations ── */
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

          @media (max-width: 600px) {
            .site-header { padding: 1rem; }
            .page { padding: 1.25rem 1rem 3rem; }
            .post-card { padding: 1rem; }
            .post-card-top { flex-direction: column; gap: .25rem; }
          }
        ]]></style>
      </head>
      <body>

        <!-- Header -->
        <header class="site-header">
          <div class="header-left">
            <div class="rss-icon">📡</div>
            <div class="feed-meta">
              <p class="feed-title"><xsl:value-of select="/rss/channel/title"/></p>
              <p class="feed-desc"><xsl:value-of select="/rss/channel/description"/></p>
            </div>
          </div>
          <div class="header-right">
            <span class="badge badge-rss">RSS 2.0</span>
          </div>
        </header>

        <main class="page">

          <!-- Prompt bar -->
          <div class="prompt-bar">
            <span class="prompt-host">kbm</span>
            <span class="prompt-sep">@</span>
            <span class="prompt-path">~/blog/feed.xml</span>
            <span class="prompt-sep">›</span>
            <span class="prompt-cmd">cat posts</span>
            <span class="cursor"/>
          </div>

          <!-- Post list -->
          <div class="post-list">
            <xsl:for-each select="/rss/channel/item">
              <a class="post-card" href="{link}">
                <div class="post-card-top">
                  <div>
                    <p class="post-title"><xsl:value-of select="title"/></p>
                  </div>
                  <span class="post-date">
                    <xsl:value-of select="substring(pubDate, 1, 16)"/>
                  </span>
                </div>
                <p class="post-desc"><xsl:value-of select="description"/></p>
                <div class="post-footer">
                  <xsl:for-each select="category">
                    <span class="tag">#<xsl:value-of select="."/></span>
                  </xsl:for-each>
                  <span class="read-link">ler post</span>
                </div>
              </a>
            </xsl:for-each>
          </div>

        </main>

        <footer class="site-footer">
          <p>
            Feed RSS do <a href="/blog/">r3d/ops — KBM Security</a>
            ·
            Assine em seu leitor de RSS favorito
          </p>
        </footer>

      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
