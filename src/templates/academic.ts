/**
 * Academic CV template — multi-page friendly, serif font, education-first ordering.
 * Uses hrule section dividers and 1-inch margins standard for academic CVs.
 */

import type { ResumeFormData } from './types'
import { escapeLatex, escapeLatexUrl } from './latexEscape'

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
  if (email) contactParts.push(`\\href{mailto:${escapeLatexUrl(email)}}{${escapeLatex(email)}}`)
  if (phone) contactParts.push(phone)
  if (location) contactParts.push(location)
  if (website) contactParts.push(`\\href{${escapeLatexUrl(website)}}{${escapeLatex(website)}}`)
  if (linkedin) contactParts.push(`\\href{${escapeLatexUrl(linkedin)}}{LinkedIn}`)
  const contactLine = contactParts.join(' \\quad $|$ \\quad ')

  let body = ''

  if (data.summary?.trim()) {
    body += `\\section*{Research Interests}\n${escapeLatex(data.summary)}\n\n`
  }

  if (data.education?.length) {
    body += `\\section*{Education}\n`
    for (const edu of data.education) {
      if (!edu.institution && !edu.degree) continue
      const dates = `${escapeLatex(edu.startDate || '')} -- ${escapeLatex(edu.endDate || '')}`
      const degree = `${escapeLatex(edu.degree || 'Degree')}${edu.field?.trim() ? ` in ${escapeLatex(edu.field)}` : ''}`
      body += `\\textbf{${degree}} \\hfill ${dates}\n\\\\\n`
      body += `\\textit{${escapeLatex(edu.institution || 'Institution')}}`
      if (edu.gpa?.trim()) body += ` \\quad GPA: ${escapeLatex(edu.gpa)}`
      body += '\n\\vspace{4pt}\n\n'
    }
  }

  if (data.experience?.length) {
    body += `\\section*{Experience}\n`
    for (const exp of data.experience) {
      if (!exp.company && !exp.role) continue
      const dates = `${escapeLatex(exp.startDate || '')} -- ${escapeLatex(exp.endDate || 'Present')}`
      body += `\\textbf{${escapeLatex(exp.role || 'Role')}} \\hfill ${dates}\n\\\\\n`
      body += `\\textit{${escapeLatex(exp.company || 'Company')}}\n`
      if (exp.bullets?.length) {
        body += `\\begin{itemize}[leftmargin=*, nosep]\n`
        for (const b of exp.bullets) {
          if (b?.trim()) body += `  \\item ${escapeLatex(b)}\n`
        }
        body += `\\end{itemize}\n`
      }
      body += `\\vspace{4pt}\n`
    }
    body += '\n'
  }

  if (data.projects?.length) {
    body += `\\section*{Projects}\n`
    for (const proj of data.projects) {
      if (!proj.name && !proj.description) continue
      body += `\\textbf{${escapeLatex(proj.name || 'Project')}}`
      if (proj.url?.trim()) body += ` -- \\href{${escapeLatexUrl(proj.url)}}{Link}`
      body += '\n\\\\\n'
      if (proj.description?.trim()) body += `${escapeLatex(proj.description)}\n`
      if (proj.bullets?.length) {
        body += `\\begin{itemize}[leftmargin=*, nosep]\n`
        for (const b of proj.bullets) {
          if (b?.trim()) body += `  \\item ${escapeLatex(b)}\n`
        }
        body += `\\end{itemize}\n`
      }
      body += `\\vspace{4pt}\n`
    }
    body += '\n'
  }

  if (data.skills?.length) {
    body += `\\section*{Skills}\n`
    for (const sg of data.skills) {
      if (!sg.category && !sg.items?.length) continue
      const items = (sg.items || []).filter(Boolean).map(s => escapeLatex(s))
      if (items.length) {
        body += `\\textbf{${escapeLatex(sg.category || 'Skills')}}: ${items.join(', ')}\n\\\\\n`
      }
    }
    body += '\n'
  }

  if (data.languages?.length) {
    body += `\\section*{Languages}\n`
    const langParts = data.languages
      .filter(l => l.name?.trim())
      .map(l => {
        const prof = l.proficiency?.trim() ? ` (${escapeLatex(l.proficiency)})` : ''
        return `${escapeLatex(l.name)}${prof}`
      })
    body += `${langParts.join(', ')}\n\n`
  }

  if (data.certifications?.length) {
    body += `\\section*{Certifications}\n`
    for (const cert of data.certifications) {
      if (!cert.name && !cert.issuer) continue
      body += `\\textbf{${escapeLatex(cert.name || '')}}`
      if (cert.issuer?.trim()) body += ` -- ${escapeLatex(cert.issuer)}`
      if (cert.date?.trim()) body += ` (${escapeLatex(cert.date)})`
      body += '\n\n'
    }
  }

  if (data.customSections?.length) {
    for (const section of data.customSections) {
      if (!section.title?.trim() && !section.entries?.length) continue
      body += `\\section*{${escapeLatex(section.title || 'Other')}}\n`
      for (const entry of section.entries) {
        if (!entry.primary && !entry.secondary) continue
        const date = entry.date?.trim() ? ` \\hfill ${escapeLatex(entry.date)}` : ''
        body += `\\textbf{${escapeLatex(entry.primary || '')}}${date}\n`
        if (entry.secondary?.trim()) body += `\\\\\n\\textit{${escapeLatex(entry.secondary)}}\n`
        if (entry.bullets?.length) {
          const nonEmpty = entry.bullets.filter(b => b?.trim())
          if (nonEmpty.length) {
            body += `\\begin{itemize}[leftmargin=*, nosep]\n`
            for (const b of nonEmpty) {
              body += `  \\item ${escapeLatex(b)}\n`
            }
            body += `\\end{itemize}\n`
          }
        }
        body += `\\vspace{4pt}\n`
      }
      body += '\n'
    }
  }

  return `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\geometry{a4paper, margin=1in}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\begin{document}

{\\LARGE \\textbf{${name}}}${title ? `\\\\[2pt]\n{\\large ${title}}` : ''}

\\vspace{2pt}
${contactLine ? `${contactLine}` : ''}

\\vspace{4pt}
\\hrule
\\vspace{8pt}

${body}
\\end{document}
`
}
