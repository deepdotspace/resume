/**
 * Europass template — EU-style CV aligned with the official Europass format
 * (European Commission standard). Features:
 * - Optional photo, nationality, date of birth, driving license
 * - Official section names with two-column left-label layout
 * - Mother tongue(s) separated from Other language(s)
 * - CEFR 5-skill self-assessment grid for languages
 * - EU blue branding, reverse chronological order
 */

import type { ResumeFormData, LanguageEntry, CefrSkills } from './types'
import { escapeLatex, escapeLatexUrl, getEmbeddedPhotoPath } from './latexEscape'

/** EU blue used in official Europass (RGB 0, 51, 153) */
const EU_BLUE = '0,51,153'

const CEFR_KEYS: (keyof CefrSkills)[] = ['listening', 'reading', 'spokenInteraction', 'spokenProduction', 'writing']
const CEFR_LABELS: Record<keyof CefrSkills, string> = {
  listening: 'Listening',
  reading: 'Reading',
  spokenInteraction: 'Spoken interaction',
  spokenProduction: 'Spoken production',
  writing: 'Writing',
}

function hasAnyCefr(cefr?: CefrSkills): boolean {
  return !!cefr && CEFR_KEYS.some(k => !!cefr[k])
}

function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', 'yes', 'y', '1', 'on'].includes(normalized)) return true
    if (['false', 'no', 'n', '0', 'off'].includes(normalized)) return false
  }
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  return null
}

function isMotherTongueLanguage(lang: LanguageEntry): boolean {
  // `LanguageEntry` has a narrow shape but this function also checks legacy
  // key names that aren't on the type. Go through `unknown` so TS doesn't
  // complain about the mismatch — legacy keys are intentional back-compat.
  const raw = lang as unknown as Record<string, unknown>

  // Primary flag from current form model.
  const explicit = parseBooleanLike(raw.isMotherTongue)
  if (explicit !== null) return explicit

  // Backward compatibility with legacy key names.
  const legacy =
    parseBooleanLike(raw.motherTongue) ??
    parseBooleanLike(raw['mother_tongue']) ??
    parseBooleanLike(raw['is_mother_tongue'])
  if (legacy !== null) return legacy

  // Fallback marker persisted by form logic when mother tongue is toggled on.
  const proficiency = (lang.proficiency || '').trim().toLowerCase()
  return proficiency === 'mother tongue' || proficiency === 'native'
}

/** Wraps section content in two-column layout: label (left) | content (right) */
function sectionBlock(label: string, content: string, rawLabel?: string): string {
  const labelLaTeX = rawLabel ?? escapeLatex(label)
  return `\\noindent\\begin{tabular}{@{}p{0.18\\textwidth}p{0.78\\textwidth}@{}}
\\textcolor{eublue}{\\scshape\\bfseries ${labelLaTeX}} &
\\begin{minipage}[t]{\\linewidth}\\raggedright
${content}
\\end{minipage} \\\\[0.5em]
\\end{tabular}

\\vspace{6pt}
`
}

export function generateLatex(data: ResumeFormData): string {
  const p = data.personalInfo
  const name = escapeLatex(p?.name || 'Your Name')
  const title = escapeLatex(p?.title || '')
  const email = p?.email?.trim() || ''
  const phone = escapeLatex(p?.phone || '')
  const location = escapeLatex(p?.location || '')
  const website = p?.website?.trim() || ''
  const linkedin = p?.linkedin?.trim() || ''
  const nationality = p?.nationality?.trim()
  const dateOfBirth = p?.dateOfBirth?.trim()
  const drivingLicense = p?.drivingLicense?.trim()
  const photoPath = getEmbeddedPhotoPath(p?.photo)

  const contactRows: string[] = []
  if (email) contactRows.push(`\\textbf{Email} & \\href{mailto:${escapeLatexUrl(email)}}{${escapeLatex(email)}} \\\\`)
  if (phone) contactRows.push(`\\textbf{Phone} & ${phone} \\\\`)
  if (location) contactRows.push(`\\textbf{Address} & ${location} \\\\`)
  if (nationality) contactRows.push(`\\textbf{Nationality} & ${escapeLatex(nationality)} \\\\`)
  if (dateOfBirth) contactRows.push(`\\textbf{Date of birth} & ${escapeLatex(dateOfBirth)} \\\\`)
  if (drivingLicense) contactRows.push(`\\textbf{Driving licence} & ${escapeLatex(drivingLicense)} \\\\`)
  if (website) contactRows.push(`\\textbf{Website} & \\href{${escapeLatexUrl(website)}}{${escapeLatex(website)}} \\\\`)
  if (linkedin) contactRows.push(`\\textbf{LinkedIn} & \\href{${escapeLatexUrl(linkedin)}}{${escapeLatex(linkedin)}} \\\\`)
  const contactTable = contactRows.length
    ? `\\begin{tabular}{@{}ll}\n${contactRows.join('\n')}\n\\end{tabular}`
    : ''

  const headerSection = photoPath
    ? `\\begin{minipage}[t]{0.22\\textwidth}
  \\raggedright
  \\includegraphics[width=2.5cm,height=3cm,keepaspectratio]{${photoPath}}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.74\\textwidth}
{\\Huge \\textbf{${name}}}${title ? `\\\\[4pt]\n{\\large ${title}}` : ''}

\\vspace{6pt}
${contactTable}
\\end{minipage}`
    : `{\\Huge \\textbf{${name}}}${title ? `\\\\[4pt]\n{\\large ${title}}` : ''}

\\vspace{6pt}
${contactTable}`

  let body = ''

  // About me
  if (data.summary?.trim()) {
    body += sectionBlock('About me', escapeLatex(data.summary))
  }

  // Work Experience
  if (data.experience?.length) {
    let expContent = ''
    for (const exp of data.experience) {
      if (!exp.company && !exp.role) continue
      const dates = `${escapeLatex(exp.startDate || '')} -- ${escapeLatex(exp.endDate || 'Present')}`
      expContent += `\\textbf{${escapeLatex(exp.role || 'Role')}} \\hfill ${dates}\n\\\\\n`
      expContent += `\\textit{${escapeLatex(exp.company || 'Company')}}\n`
      if (exp.bullets?.length) {
        expContent += `\\begin{itemize}[leftmargin=*, nosep]\n`
        for (const b of exp.bullets) {
          if (b?.trim()) expContent += `  \\item ${escapeLatex(b)}\n`
        }
        expContent += `\\end{itemize}\n`
      }
      expContent += `\\vspace{4pt}\n`
    }
    body += sectionBlock('Work experience', expContent, 'Work\\\\experience')
  }

  // Education and Training
  if (data.education?.length) {
    let eduContent = ''
    for (const edu of data.education) {
      if (!edu.institution && !edu.degree) continue
      const dates = `${escapeLatex(edu.startDate || '')} -- ${escapeLatex(edu.endDate || '')}`
      const degree = `${escapeLatex(edu.degree || 'Degree')}${edu.field?.trim() ? ` in ${escapeLatex(edu.field)}` : ''}`
      eduContent += `\\textbf{${degree}} \\hfill ${dates}\n\\\\\n`
      eduContent += `\\textit{${escapeLatex(edu.institution || 'Institution')}}`
      if (edu.gpa?.trim()) eduContent += ` \\quad GPA: ${escapeLatex(edu.gpa)}`
      eduContent += '\n\\vspace{4pt}\n\n'
    }
    body += sectionBlock('Education and training', eduContent)
  }

  // Personal Skills — Mother tongue(s) / Other language(s) with CEFR grid
  const motherTongues = (data.languages || []).filter((l): l is LanguageEntry => !!l.name?.trim() && isMotherTongueLanguage(l))
  const otherLanguages = (data.languages || []).filter((l): l is LanguageEntry => !!l.name?.trim() && !isMotherTongueLanguage(l))
  const hasSkills = data.skills?.some(sg => (sg.category || sg.items?.length) && (sg.items || []).some(Boolean))

  if (motherTongues.length > 0 || otherLanguages.length > 0 || hasSkills) {
    let skillsContent = ''

    if (motherTongues.length > 0) {
      skillsContent += `\\subsection*{Mother tongue(s)}\n`
      skillsContent += motherTongues.map(l => escapeLatex(l.name)).join(', ') + '\n\n'
    }

    if (otherLanguages.length > 0) {
      skillsContent += `\\subsection*{Other language(s)}\n`
      const hasCefrGrid = otherLanguages.some(l => hasAnyCefr(l.cefr))
      if (hasCefrGrid) {
        skillsContent += `\\begin{tabular}{@{}lccccc}\n`
        skillsContent += `\\textbf{Language} & \\footnotesize Listening & \\footnotesize Reading & \\footnotesize Spoken int. & \\footnotesize Spoken prod. & \\footnotesize Writing \\\\\n`
        skillsContent += `\\hline\n`
        for (const lang of otherLanguages) {
          const c = lang.cefr || {}
          const listen = escapeLatex(c.listening || '')
          const read = escapeLatex(c.reading || '')
          const interact = escapeLatex(c.spokenInteraction || '')
          const prod = escapeLatex(c.spokenProduction || '')
          const write = escapeLatex(c.writing || '')
          if (hasAnyCefr(lang.cefr)) {
            skillsContent += `${escapeLatex(lang.name)} & ${listen} & ${read} & ${interact} & ${prod} & ${write} \\\\\n`
          } else {
            const prof = lang.proficiency?.trim() ? escapeLatex(lang.proficiency) : '—'
            skillsContent += `${escapeLatex(lang.name)} & \\multicolumn{5}{l}{${prof}} \\\\\n`
          }
        }
        skillsContent += `\\end{tabular}\n\n`
      } else {
        skillsContent += `\\begin{tabular}{@{}ll}\n`
        for (const lang of otherLanguages) {
          const prof = lang.proficiency?.trim() ? ` (${escapeLatex(lang.proficiency)})` : ''
          skillsContent += `${escapeLatex(lang.name)} & ${prof} \\\\\n`
        }
        skillsContent += `\\end{tabular}\n\n`
      }
    }

    if (hasSkills) {
      skillsContent += `\\vspace{10pt}\n\\subsection*{Digital competences / Other skills}\n`
      for (const sg of data.skills!) {
        if (!sg.category && !sg.items?.length) continue
        const items = (sg.items || []).filter(Boolean).map(s => escapeLatex(s))
        if (items.length) {
          skillsContent += `\\textbf{${escapeLatex(sg.category || 'Skills')}}: ${items.join(', ')}\n\\\\\n`
        }
      }
    }

    body += sectionBlock('Personal skills', skillsContent)
  }

  // Additional Information
  const hasProjects = data.projects?.some(proj => proj.name || proj.description)
  const hasCerts = data.certifications?.some(c => c.name || c.issuer)
  if (hasProjects || hasCerts) {
    let addContent = ''
    if (data.projects?.length) {
      for (const proj of data.projects) {
        if (!proj.name && !proj.description) continue
        addContent += `\\textbf{${escapeLatex(proj.name || 'Project')}}`
        if (proj.url?.trim()) addContent += ` -- \\href{${escapeLatexUrl(proj.url)}}{Link}`
        addContent += '\n\\\\\n'
        if (proj.description?.trim()) addContent += `${escapeLatex(proj.description)}\n`
        if (proj.bullets?.length) {
          addContent += `\\begin{itemize}[leftmargin=*, nosep]\n`
          for (const b of proj.bullets) {
            if (b?.trim()) addContent += `  \\item ${escapeLatex(b)}\n`
          }
          addContent += `\\end{itemize}\n`
        }
        addContent += `\\vspace{4pt}\n`
      }
    }
    if (data.certifications?.length) {
      for (const cert of data.certifications) {
        if (!cert.name && !cert.issuer) continue
        addContent += `\\textbf{${escapeLatex(cert.name || '')}}`
        if (cert.issuer?.trim()) addContent += ` -- ${escapeLatex(cert.issuer)}`
        if (cert.date?.trim()) addContent += ` (${escapeLatex(cert.date)})`
        addContent += '\n\n'
      }
    }
    body += sectionBlock('Additional information', addContent)
  }

  if (data.customSections?.length) {
    for (const section of data.customSections) {
      if (!section.title?.trim() && !section.entries?.length) continue
      let sContent = ''
      for (const entry of section.entries) {
        if (!entry.primary && !entry.secondary) continue
        const date = entry.date?.trim() ? ` \\hfill ${escapeLatex(entry.date)}` : ''
        sContent += `\\textbf{${escapeLatex(entry.primary || '')}}${date}\n`
        if (entry.secondary?.trim()) sContent += `\\\\\n\\textit{${escapeLatex(entry.secondary)}}\n`
        if (entry.bullets?.length) {
          const nonEmpty = entry.bullets.filter(b => b?.trim())
          if (nonEmpty.length) {
            sContent += `\\begin{itemize}[leftmargin=*, nosep]\n`
            for (const b of nonEmpty) {
              sContent += `  \\item ${escapeLatex(b)}\n`
            }
            sContent += `\\end{itemize}\n`
          }
        }
        sContent += `\\vspace{4pt}\n`
      }
      body += sectionBlock(section.title || 'Other', sContent)
    }
  }

  return `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{graphicx}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage{array}
\\definecolor{eublue}{RGB}{${EU_BLUE}}
\\geometry{a4paper, margin=0.75in}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

\\titleformat{\\section}{\\normalfont}{}{0em}{}
\\titlespacing*{\\section}{0pt}{12pt}{6pt}

\\begin{document}

${headerSection}

\\vspace{12pt}

${body}
\\end{document}
`
}
