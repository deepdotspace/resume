/**
 * Creative template — design-forward, color blocks, accent header.
 * For designers, marketers, creative roles. Not ATS-optimized.
 * Bold header bar, skill tags, portfolio-oriented layout.
 */

import type { ResumeFormData } from './types'
import { escapeLatex } from './latexEscape'

const ACCENT = '51,102,153' // blue accent (RGB)

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
  if (website) contactParts.push(`\\href{${escapeLatex(website)}}{Portfolio}`)
  if (linkedin) contactParts.push(`\\href{${escapeLatex(linkedin)}}{LinkedIn}`)
  const contactLine = contactParts.join(' \\quad $\\bullet$ \\quad ')

  let body = ''

  if (data.summary?.trim()) {
    body += `\\section*{\\colorbox{accent}{\\textcolor{white}{\\textbf{Summary}}}}\\vspace{4pt}\n${escapeLatex(data.summary)}\n\n\\vspace{12pt}\n`
  }

  if (data.experience?.length) {
    body += `\\section*{\\colorbox{accent}{\\textcolor{white}{\\textbf{Experience}}}}\\vspace{8pt}\n\n`
    for (const exp of data.experience) {
      if (!exp.company && !exp.role) continue
      const role = escapeLatex(exp.role || 'Role')
      const company = escapeLatex(exp.company || 'Company')
      const dates = `${escapeLatex(exp.startDate || '')} -- ${escapeLatex(exp.endDate || 'Present')}`
      body += `\\textbf{\\color{accent}${role}} \\hfill \\textit{${dates}}\\\\\n\\textbf{${company}}\\vspace{2pt}\n`
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
    body += `\\section*{\\colorbox{accent}{\\textcolor{white}{\\textbf{Education}}}}\\vspace{8pt}\n\n`
    for (const edu of data.education) {
      if (!edu.institution && !edu.degree) continue
      const degree = `${escapeLatex(edu.degree || 'Degree')}${edu.field?.trim() ? ` in ${escapeLatex(edu.field)}` : ''}`
      const institution = escapeLatex(edu.institution || 'Institution')
      const dates = `${escapeLatex(edu.startDate || '')} -- ${escapeLatex(edu.endDate || '')}`
      body += `\\textbf{${degree}} \\hfill \\textit{${dates}}\\\\\n\\textit{${institution}}`
      if (edu.gpa?.trim()) body += ` \\quad GPA: ${escapeLatex(edu.gpa)}`
      body += '\n\\vspace{6pt}\n'
    }
    body += '\n'
  }

  if (data.skills?.length) {
    body += `\\section*{\\colorbox{accent}{\\textcolor{white}{\\textbf{Skills}}}}\\vspace{8pt}\n\n`
    for (const sg of data.skills) {
      if (!sg.category && !sg.items?.length) continue
      const items = (sg.items || []).filter(Boolean).map(s => escapeLatex(s))
      if (items.length) {
        body += `\\textbf{${escapeLatex(sg.category || 'Skills')}}: `
        body += items.map(i => `\\fbox{\\small ${i}}`).join(' \\quad ')
        body += '\\\\[6pt]\n'
      }
    }
    body += '\n'
  }

  if (data.projects?.length) {
    body += `\\section*{\\colorbox{accent}{\\textcolor{white}{\\textbf{Projects}}}}\\vspace{8pt}\n\n`
    for (const proj of data.projects) {
      if (!proj.name && !proj.description) continue
      body += `\\textbf{\\color{accent}${escapeLatex(proj.name || 'Project')}}`
      if (proj.url?.trim()) body += ` \\href{${escapeLatex(proj.url)}}{\\underline{View}}`
      body += '\\\\\n'
      if (proj.description?.trim()) body += `\\small{${escapeLatex(proj.description)}}\n`
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

  if (data.certifications?.length) {
    body += `\\section*{\\colorbox{accent}{\\textcolor{white}{\\textbf{Certifications}}}}\\vspace{8pt}\n\n`
    for (const cert of data.certifications) {
      if (!cert.name && !cert.issuer) continue
      body += `\\textbf{${escapeLatex(cert.name || '')}} -- ${escapeLatex(cert.issuer || '')}${cert.date?.trim() ? ` (${escapeLatex(cert.date)})` : ''}\\\\\n`
    }
    body += '\n'
  }

  if (data.languages?.length) {
    body += `\\section*{\\colorbox{accent}{\\textcolor{white}{\\textbf{Languages}}}}\\vspace{8pt}\n\n`
    const langParts = data.languages
      .filter(l => l.name?.trim())
      .map(l => {
        const prof = l.proficiency?.trim() ? ` (${escapeLatex(l.proficiency)})` : ''
        return `${escapeLatex(l.name)}${prof}`
      })
    body += `${langParts.join(' \\quad $\\bullet$ \\quad ')}\n`
  }

  if (data.customSections?.length) {
    for (const section of data.customSections) {
      if (!section.title?.trim() && !section.entries?.length) continue
      body += `\\section*{\\colorbox{accent}{\\textcolor{white}{\\textbf{${escapeLatex(section.title || 'Other')}}}}}\\vspace{8pt}\n\n`
      for (const entry of section.entries) {
        if (!entry.primary && !entry.secondary) continue
        body += `\\textbf{\\color{accent}${escapeLatex(entry.primary || '')}}`
        if (entry.date?.trim()) body += ` \\hfill \\textit{${escapeLatex(entry.date)}}`
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
\\usepackage{xcolor}
\\usepackage[hidelinks]{hyperref}

\\definecolor{accent}{RGB}{${ACCENT}}
\\geometry{a4paper, margin=0.75in}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

\\begin{document}

\\noindent\\colorbox{accent}{%
  \\parbox{\\dimexpr\\textwidth-2\\fboxsep}{%
    \\vspace{12pt}%
    \\begin{center}%
      {\\Huge \\textcolor{white}{\\textbf{${name}}}}\\\\[4pt]%
      ${title ? `{\\large \\textcolor{white!90!black}{${title}}}\\\\[4pt]` : ''}%
      \\small \\textcolor{white!80!black}{${contactLine}}%
    \\end{center}%
    \\vspace{12pt}%
  }%
}\\\\[16pt]

${body}
\\end{document}
`
}
