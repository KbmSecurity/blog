import * as deepl from 'deepl-node';

const translator = new deepl.Translator(import.meta.env.DEEPL_API_KEY);

export async function translateToPt(text: string): Promise<string> {
    const result = await translator.translateText(text, 'en', 'pt-BR');
    return result.text;
}
