/**
 * Executive template — multi-page, serif typography, leadership-focused.
 * For directors, VPs, C-suite with 10+ years experience.
 * Executive summary, formal serif font, board/speaking sections.
 */

import type { ResumeFormData } from './types'
import { escapeLatex } from './latexEscape'

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
  const contactLine = contactParts.join(' \\quad $|$ \\quad ')

  let body = ''

  if (data.summary?.trim()) {
    body += `\\section*{Executive Summary}\n\\vspace{4pt}\n${escapeLatex(data.summary)}\n\n\\vspace{12pt}\n`
  }

  if (data.experience?.length) {
    body += `\\section*{Professional Experience}\n\\vspace{4pt}\n`
    for (const exp of data.experience) {
      if (!exp.company && !exp.role) continue
      const role = escapeLatex(exp.role || 'Role')
      const company = escapeLatex(exp.company || 'Company')
      const dates = `${escapeLatex(exp.startDate || '')} -- ${escapeLatex(exp.endDate || 'Present')}`
      body += `\\textbf{${role}} \\hfill ${dates}\\\\\n\\textit{${company}}\\vspace{4pt}\n`
      if (exp.bullets?.length) {
        body += `\\begin{itemize}[leftmargin=*, itemsep=2pt]\n`
        for (const b of exp.bullets) {
          if (b?.trim()) body += `  \\item ${escapeLatex(b)}\n`
        }
        body += `\\end{itemize}\n`
      }
      body += `\\vspace{8pt}\n`
    }
    body += '\n'
  }

  if (data.education?.length) {
    body += `\\section*{Education}\n\\vspace{4pt}\n`
    for (const edu of data.education) {
      if (!edu.institution && !edu.degree) continue
      const degree = `${escapeLatex(edu.degree || 'Degree')}${edu.field?.trim() ? ` in ${escapeLatex(edu.field)}` : ''}`
      const institution = escapeLatex(edu.institution || 'Institution')
      const dates = `${escapeLatex(edu.startDate || '')} -- ${escapeLatex(edu.endDate || '')}`
      body += `\\textbf{${degree}} \\hfill ${dates}\\\\\n\\textit{${institution}}`
      if (edu.gpa?.trim()) body += ` \\quad GPA: ${escapeLatex(edu.gpa)}`
      body += '\n\\vspace{6pt}\n'
    }
    body += '\n'
  }

  if (data.projects?.length) {
    body += `\\section*{Key Projects}\n\\vspace{4pt}\n`
    for (const proj of data.projects) {
      if (!proj.name && !proj.description) continue
      body += `\\textbf{${escapeLatex(proj.name || 'Project')}}`
      if (proj.url?.trim()) body += ` -- \\href{${escapeLatex(proj.url)}}{Link}`
      body += '\\\\\n'
      if (proj.description?.trim()) body += `${escapeLatex(proj.description)}\n`
      if (proj.bullets?.length) {
        body += `\\begin{itemize}[leftmargin=*, itemsep=2pt]\n`
        for (const b of proj.bullets) {
          if (b?.trim()) body += `  \\item ${escapeLatex(b)}\n`
        }
        body += `\\end{itemize}\n`
      }
      body += `\\vspace{6pt}\n`
    }
    body += '\n'
  }

  if (data.skills?.length) {
    body += `\\section*{Core Competencies}\n\\vspace{4pt}\n`
    for (const sg of data.skills) {
      if (!sg.category && !sg.items?.length) continue
      const items = (sg.items || []).filter(Boolean).map(s => escapeLatex(s))
      if (items.length) {
        body += `\\textbf{${escapeLatex(sg.category || 'Skills')}}: ${items.join(', ')}\\\\\n`
      }
    }
    body += '\n'
  }

  if (data.certifications?.length) {
    body += `\\section*{Certifications}\n\\vspace{4pt}\n`
    for (const cert of data.certifications) {
      if (!cert.name && !cert.issuer) continue
      body += `\\textbf{${escapeLatex(cert.name || '')}} -- ${escapeLatex(cert.issuer || '')}${cert.date?.trim() ? ` (${escapeLatex(cert.date)})` : ''}\\\\\n`
    }
    body += '\n'
  }

  if (data.languages?.length) {
    body += `\\section*{Languages}\n\\vspace{4pt}\n`
    const langParts = data.languages
      .filter(l => l.name?.trim())
      .map(l => {
        const prof = l.proficiency?.trim() ? ` (${escapeLatex(l.proficiency)})` : ''
        return `${escapeLatex(l.name)}${prof}`
      })
    body += `${langParts.join(', ')}\n`
  }

  if (data.customSections?.length) {
    for (const section of data.customSections) {
      if (!section.title?.trim() && !section.entries?.length) continue
      body += `\\section*{${escapeLatex(section.title || 'Other')}}\n\\vspace{4pt}\n`
      for (const entry of section.entries) {
        if (!entry.primary && !entry.secondary) continue
        body += `\\textbf{${escapeLatex(entry.primary || '')}}`
        if (entry.date?.trim()) body += ` \\hfill ${escapeLatex(entry.date)}`
        body += '\\\\\n'
        if (entry.secondary?.trim()) body += `\\textit{${escapeLatex(entry.secondary)}}\n`
        if (entry.bullets?.length) {
          const nonEmpty = entry.bullets.filter(b => b?.trim())
          if (nonEmpty.length) {
            body += `\\begin{itemize}[leftmargin=*, itemsep=2pt]\n`
            for (const b of nonEmpty) {
              body += `  \\item ${escapeLatex(b)}\n`
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
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}

\\geometry{a4paper, margin=1in}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot[C]{\\thepage}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\usepackage{mathptmx}
\\renewcommand{\\familydefault}{\\rmdefault}

\\begin{document}

\\begin{center}
  {\\LARGE \\textbf{${name}}}\\\\[2pt]
  ${title ? `{\\large \\textit{${title}}}\\\\[4pt]` : ''}
  \\normalsize ${contactLine}
\\end{center}

\\vspace{16pt}

${body}
\\end{document}
`
}
