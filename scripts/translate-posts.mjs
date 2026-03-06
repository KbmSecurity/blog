import * as deepl from 'deepl-node';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { globSync } from 'glob';

const CONFIG = {
    protectedTerms: ['SUID', 'NTLM', 'AMSI', 'GTFOBins', 'mimikatz', 'root', 'privesc', 'bash', 'sh', 'Linux', 'Windows'],
    postsDir: path.join(process.cwd(), 'posts') // Using the flat posts directory at project root
};

// Handle CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const fileArgIndex = args.indexOf('--file');
const specificFile = fileArgIndex !== -1 ? args[fileArgIndex + 1] : null;

// Adjust directory if it somehow changed
if (!fs.existsSync(CONFIG.postsDir) && fs.existsSync(path.join(process.cwd(), 'src/content/posts'))) {
    CONFIG.postsDir = path.join(process.cwd(), 'src/content/posts');
}

if (!process.env.DEEPL_API_KEY && !isDryRun) {
    console.error('❌ DEEPL_API_KEY environment variable is not set. Use node -r dotenv/config scripts/translate-posts.mjs');
    process.exit(1);
}

const translator = process.env.DEEPL_API_KEY ? new deepl.Translator(process.env.DEEPL_API_KEY) : null;

async function translateFile(filePath) {
    console.log(`\n📄 Processando: ${path.basename(filePath)}`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    if (data.lang !== 'pt') {
        console.log(`⏭️  Ignorando (lang não é 'pt'): ${path.basename(filePath)}`);
        return;
    }

    if (filePath.endsWith('-en.md') || filePath.endsWith('-en.mdx')) {
        console.log(`⚠️  Aviso: Arquivo já é uma tradução (-en.md/mdx): ${path.basename(filePath)}. Pulando.`);
        return;
    }

    const targetPath = filePath.replace(/\.(md|mdx)$/, '-en.$1');

    if (fs.existsSync(targetPath)) {
        console.log(`✅ Já traduzido: O arquivo ${path.basename(targetPath)} já existe. Pulando.`);
        return;
    }

    console.log(`🌍 Traduzindo: ${data.title || path.basename(filePath)} -> ${path.basename(targetPath)}`);

    if (isDryRun) {
        console.log(`🛠️  [DRY RUN] Simulação completada com sucesso. Nenhum arquivo modificado.`);
        return;
    }

    try {
        const result = await translator.translateText(content, 'pt', 'en-US', {
            tagHandling: 'html',
            ignoreTags: ['code', 'pre'],
            // We can also build a glossary for the protected terms on Deepl, but doing naive replace here if needed.
        });

        const newContent = result.text;

        // Update frontmatter
        const newData = {
            ...data,
            lang: 'en',
            lang_original: 'pt',
            translated: true,
            translated_at: new Date().toISOString().split('T')[0]
        };

        const newFileContent = matter.stringify(newContent, newData);
        fs.writeFileSync(targetPath, newFileContent);
        console.log(`✅ Traduzido e salvo: ${targetPath}`);

    } catch (error) {
        console.error(`❌ Erro ao traduzir ${filePath}:`, error.message);
    }
}

async function main() {
    if (specificFile) {
        // try to find the specific file
        const files = globSync(`${CONFIG.postsDir}/**/${specificFile}`);
        if (files.length === 0) {
            console.error(`❌ Arquivo não encontrado: ${specificFile}`);
            return;
        }
        for (const f of files) {
            await translateFile(f);
        }
    } else {
        // find all .md and .mdx files
        const files = globSync(`${CONFIG.postsDir}/**/*.{md,mdx}`);
        // filter out -en translated files
        const ptFiles = files.filter(f => !f.endsWith('-en.md') && !f.endsWith('-en.mdx'));
        console.log(`🔍 Encontrados ${ptFiles.length} posts originais para verificar.`);
        for (const f of ptFiles) {
            await translateFile(f);
        }
    }
}

main().catch(console.error);
