export type XmlQuestion = {
  type: string;
  label: string;
  choices: string[];
  mediaUrl?: string | null;
  mediaType?: string | null;
  answer?: any;
  answerType?: string | null;
};

export function buildProjectXml(
  project: {
    name: string;
    description?: string | null;
    sector?: string | null;
    country?: string | null;
    status?: string | null;
  },
  questions: any[]
): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<project version="1.0">');
  lines.push('  <meta>');
  lines.push(`    <name>${esc(project.name)}</name>`);
  lines.push(`    <description>${esc(project.description ?? '')}</description>`);
  lines.push(`    <sector>${esc(project.sector ?? '')}</sector>`);
  lines.push(`    <country>${esc(project.country ?? '')}</country>`);
  lines.push(`    <status>${esc(project.status ?? 'draft')}</status>`);
  lines.push(`    <exported_at>${new Date().toISOString()}</exported_at>`);
  lines.push('  </meta>');
  lines.push('  <questions>');

  for (const q of questions) {
    const type = String(q.type ?? 'Text');
    const label = String(q.label ?? '');
    const choices: string[] = Array.isArray(q.choices) ? q.choices.map(String) : [];
    const mediaUrl = q.media_url ?? null;
    const mediaType = q.media_type ?? null;
    const answer = q.answer;

    lines.push(`    <question type="${esc(type)}">`);
    lines.push(`      <label>${esc(label)}</label>`);

    if (choices.length > 0) {
      lines.push('      <choices>');
      for (const c of choices) lines.push(`        <choice>${esc(c)}</choice>`);
      lines.push('      </choices>');
    }
    if (mediaUrl) {
      lines.push(`      <media_url>${esc(mediaUrl)}</media_url>`);
      if (mediaType) lines.push(`      <media_type>${esc(mediaType)}</media_type>`);
    }
    if (answer && typeof answer === 'object') {
      const t = answer.type;
      const v = answer.value;
      if (t === 'datetime' && v) {
        lines.push(`      <answer type="datetime">${esc(String(v))}</answer>`);
      } else if (v !== undefined && v !== null) {
        if (Array.isArray(v)) {
          lines.push(`      <answer type="list">${esc(JSON.stringify(v))}</answer>`);
        } else {
          lines.push(`      <answer>${esc(String(v))}</answer>`);
        }
      }
    }
    lines.push('    </question>');
  }

  lines.push('  </questions>');
  lines.push('</project>');
  return lines.join('\n');
}

export function parseProjectXml(xml: string): {
  meta: Record<string, string>;
  questions: XmlQuestion[];
} {
  const meta: Record<string, string> = {};
  const questions: XmlQuestion[] = [];

  const metaMatch = xml.match(/<meta>([\s\S]*?)<\/meta>/);
  if (metaMatch) {
    const body = metaMatch[1];
    meta.name = tag(body, 'name') ?? 'Imported project';
    meta.description = tag(body, 'description') ?? '';
    meta.sector = tag(body, 'sector') ?? 'Other';
    meta.country = tag(body, 'country') ?? '';
    meta.status = tag(body, 'status') ?? 'draft';
  }

  const qRe = /<question\s+type="([^"]*)"\s*>([\s\S]*?)<\/question>/g;
  let m: RegExpExecArray | null;
  while ((m = qRe.exec(xml)) !== null) {
    const type = unesc(m[1]);
    const body = m[2];
    const label = tag(body, 'label') ?? 'Untitled';
    const choices = allTags(body, 'choice');
    const mediaUrl = tag(body, 'media_url');
    const mediaType = tag(body, 'media_type');

    let answer: any = undefined;
    let answerType: string | null = null;
    const aMatch = body.match(/<answer(?:\s+type="([^"]*)")?\s*>([\s\S]*?)<\/answer>/);
    if (aMatch) {
      const aType = aMatch[1];
      const aVal = unesc(aMatch[2]);
      if (aType === 'datetime') {
        answer = aVal;
        answerType = 'datetime';
      } else if (aType === 'list') {
        try {
          answer = JSON.parse(aVal);
        } catch {
          answer = aVal;
        }
      } else {
        answer = aVal;
      }
    }

    questions.push({ type, label, choices, mediaUrl, mediaType, answer, answerType });
  }

  return { meta, questions };
}

function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unesc(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function tag(body: string, name: string): string | null {
  const m = body.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? unesc(m[1]).trim() : null;
}

function allTags(body: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.push(unesc(m[1]).trim());
  return out;
}