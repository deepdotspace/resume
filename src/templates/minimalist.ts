/**
 * Minimalist template — ultra-clean single-column, generous white space.
 * Single accent color, no section rules, elegant typography.
 * Popular for senior professionals and designers.
 */

import type { ResumeFormData } from './types'
import { escapeLatex } from './latexEscape'

const ACCENT = '80,80,90' // subtle gray accent (RGB)

export function generateLatex(data: ResumeFormData): string {
  const p = data.personalInfo
  const name = escapeLatex(p?.name || 'Your Name')
  const title = escapeLatex(p?.title || '')
  const email = p?.email?.trim() || ''
  const phone = escapeLatex(p?.phone || '')
  const location = escapeLatex(p?.location || '')
  const website = p?.website?.trim() || ''
  const linkedin = p?.linkedin?.trim() || ''

  const contactParts: string[] = []
  if (email) contactParts.push(`\\href{mailto:${escapeLatex(email)}}{${escapeLatex(email)}}`)
  if (phone) contactParts.push(phone)
  if (location) contactParts.push(location)
  if (website) contactParts.push(`\\href{${escapeLatex(website)}}{${escapeLatex(website)}}`)
  if (linkedin) contactParts.push(`\\href{${escapeLatex(linkedin)}}{LinkedIn}`)
  const contactLine = contactParts.join(' \\quad $\\cdot$ \\quad ')

  let body = ''

  if (data.summary?.trim()) {
    body += `\\section*{}\\vspace{-8pt}\n\\textcolor{accent}{\\small\\uppercase{Summary}}\\vspace{4pt}\n\\par\n${escapeLatex(data.summary)}\n\n\\vspace{12pt}\n`
  }

  if (data.experience?.length) {
    body += `\\textcolor{accent}{\\small\\uppercase{Experience}}\\vspace{8pt}\n\n`
    for (const exp of data.experience) {
      if (!exp.company && !exp.role) continue
      const role = escapeLatex(exp.role || 'Role')
      const company = escapeLatex(exp.company || 'Company')
      const dates = `${escapeLatex(exp.startDate || '')} -- ${escapeLatex(exp.endDate || 'Present')}`
      body += `\\textbf{${role}} \\hfill \\textit{${dates}}\\\\\n\\textit{${company}}\\vspace{2pt}\n`
      if (exp.bullets?.length) {
        body += `\\begin{itemize}[leftmargin=*, itemsep=1pt, topsep=4pt]\n`
        for (const b of exp.bullets) {
          if (b?.trim()) body += `  \\item \\small{${escapeLatex(b)}}\n`
        }
        body += `\\end{itemize}\n`
      }
      body += `\\vspace{10pt}\n`
    }
    body += '\n'
  }

  if (data.education?.length) {
    body += `\\textcolor{accent}{\\small\\uppercase{Education}}\\vspace{8pt}\n\n`
    for (const edu of data.education) {
      if (!edu.institution && !edu.degree) continue
      const degree = `${escapeLatex(edu.degree || 'Degree')}${edu.field?.trim() ? ` in ${escapeLatex(edu.field)}` : ''}`
      const institution = escapeLatex(edu.institution || 'Institution')
      const dates = `${escapeLatex(edu.startDate || '')} -- ${escapeLatex(edu.endDate || '')}`
      body += `\\textbf{${degree}} \\hfill \\textit{${dates}}\\\\\n\\textit{${institution}}`
      if (edu.gpa?.trim()) body += ` \\quad GPA: ${escapeLatex(edu.gpa)}`
      body += '\n\\vspace{8pt}\n'
    }
    body += '\n'
  }

  if (data.skills?.length) {
    body += `\\textcolor{accent}{\\small\\uppercase{Skills}}\\vspace{6pt}\n\n`
    const allItems: string[] = []
    for (const sg of data.skills) {
      if (!sg.items?.length) continue
      const items = (sg.items || []).filter(Boolean).map(s => escapeLatex(s))
      allItems.push(...items)
    }
    if (allItems.length) body += allItems.join(' \\quad $\\cdot$ \\quad ') + '\n\n'
  }

  if (data.projects?.length) {
    body += `\\textcolor{accent}{\\small\\uppercase{Projects}}\\vspace{8pt}\n\n`
    for (const proj of data.projects) {
      if (!proj.name && !proj.description) continue
      body += `\\textbf{${escapeLatex(proj.name || 'Project')}}`
      if (proj.url?.trim()) body += ` \\href{${escapeLatex(proj.url)}}{\\small Link}`
      body += '\\\\\n'
      if (proj.description?.trim()) body += `\\small{${escapeLatex(proj.description)}}\n`
      if (proj.bullets?.length) {
        body += `\\begin{itemize}[leftmargin=*, itemsep=1pt, topsep=4pt]\n`
        for (const b of proj.bullets) {
          if (b?.trim()) body += `  \\item \\small{${escapeLatex(b)}}\n`
        }
        body += `\\end{itemize}\n`
      }
      body += `\\vspace{6pt}\n`
    }
    body += '\n'
  }

  if (data.certifications?.length) {
    body += `\\textcolor{accent}{\\small\\uppercase{Certifications}}\\vspace{6pt}\n\n`
    for (const cert of data.certifications) {
      if (!cert.name && !cert.issuer) continue
      body += `${escapeLatex(cert.name || '')} -- ${escapeLatex(cert.issuer || '')}${cert.date?.trim() ? ` (${escapeLatex(cert.date)})` : ''}\n\\vspace{2pt}\n`
    }
    body += '\n'
  }

  if (data.languages?.length) {
    body += `\\textcolor{accent}{\\small\\uppercase{Languages}}\\vspace{6pt}\n\n`
    const langParts = data.languages
      .filter(l => l.name?.trim())
      .map(l => {
        const prof = l.proficiency?.trim() ? ` (${escapeLatex(l.proficiency)})` : ''
        return `${escapeLatex(l.name)}${prof}`
      })
    body += `${langParts.join(' \\quad $\\cdot$ \\quad ')}\n`
  }

  if (data.customSections?.length) {
    for (const section of data.customSections) {
      if (!section.title?.trim() && !section.entries?.length) continue
      body += `\\textcolor{accent}{\\small\\uppercase{${escapeLatex(section.title || 'Other')}}}\\vspace{8pt}\n\n`
      for (const entry of section.entries) {
        if (!entry.primary && !entry.secondary) continue
        body += `\\textbf{${escapeLatex(entry.primary || '')}}`
        if (entry.date?.trim()) body += ` \\hfill \\textit{${escapeLatex(entry.date)}}`
        body += '\\\\\n'
        if (entry.secondary?.trim()) body += `\\textit{${escapeLatex(entry.secondary)}}\n`
        if (entry.bullets?.length) {
          const nonEmpty = entry.bullets.filter(b => b?.trim())
          if (nonEmpty.length) {
            body += `\\begin{itemize}[leftmargin=*, itemsep=1pt, topsep=4pt]\n`
            for (const b of nonEmpty) {
              body += `  \\item \\small{${escapeLatex(b)}}\n`
            }
            body += `\\end{itemize}\n`
          }
        }
        body += `\\vspace{6pt}\n`
      }
      body += '\n'
    }
  }

  return `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage[hidelinks]{hyperref}

\\definecolor{accent}{RGB}{${ACCENT}}
\\geometry{a4paper, left=1in, right=1in, top=0.9in, bottom=0.9in}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}
\\renewcommand{\\baselinestretch}{1.05}

\\begin{document}

\\vspace{8pt}
\\begin{center}
  {\\LARGE \\textbf{${name}}}\\\\[2pt]
  ${title ? `{\\normalsize \\textit{${title}}}\\\\[4pt]` : ''}
  \\small ${contactLine}
\\end{center}

\\vspace{16pt}

${body}
\\end{document}
`
}
