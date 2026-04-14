/**
 * Awesome CV template — inspired by posquit0/Awesome-CV (CC BY-SA 4.0).
 * Feature-rich: colored section headers, FontAwesome icons, professional typography.
 * Uses pdflatex + fontawesome5 for broad compatibility.
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

  const headerInfo: string[] = []
  if (location) headerInfo.push(`\\faIcon{map-marker-alt}\\ ${location}`)
  if (phone) headerInfo.push(`\\faPhone\\ ${phone}`)
  if (email) headerInfo.push(`\\href{mailto:${escapeLatex(email)}}{\\faEnvelope\\ ${escapeLatex(email)}}`)
  if (linkedin) headerInfo.push(`\\href{${escapeLatex(linkedin)}}{\\faLinkedin\\ LinkedIn}`)
  if (website) headerInfo.push(`\\href{${escapeLatex(website)}}{\\faGlobe\\ ${escapeLatex(website)}}`)
  const headerLine = headerInfo.join(' \\quad $|$ \\quad ')

  let body = ''

  if (data.summary?.trim()) {
    body += `\\cvsection{Summary}\n${escapeLatex(data.summary)}\n\n`
  }

  if (data.experience?.length) {
    body += `\\cvsection{Work Experience}\n\\begin{cventries}\n`
    for (const exp of data.experience) {
      if (!exp.company && !exp.role) continue
      const role = escapeLatex(exp.role || 'Role')
      const company = escapeLatex(exp.company || 'Company')
      const dates = `${escapeLatex(exp.startDate || '')} -- ${escapeLatex(exp.endDate || 'Present')}`
      const loc = escapeLatex(p?.location || '')
      body += `  \\cventry{${role}}{${company}}{${loc}}{${dates}}{`
      if (exp.bullets?.length) {
        body += `\n    \\begin{cvitems}\n`
        for (const b of exp.bullets) {
          if (b?.trim()) body += `      \\item ${escapeLatex(b)}\n`
        }
        body += `    \\end{cvitems}\n  `
      }
      body += `}\n`
    }
    body += `\\end{cventries}\n\n`
  }

  if (data.education?.length) {
    body += `\\cvsection{Education}\n\\begin{cventries}\n`
    for (const edu of data.education) {
      if (!edu.institution && !edu.degree) continue
      const degree = `${escapeLatex(edu.degree || 'Degree')}${edu.field?.trim() ? ` in ${escapeLatex(edu.field)}` : ''}`
      const institution = escapeLatex(edu.institution || 'Institution')
      const dates = `${escapeLatex(edu.startDate || '')} -- ${escapeLatex(edu.endDate || '')}`
      const gpa = edu.gpa?.trim() ? `GPA: ${escapeLatex(edu.gpa)}` : ''
      body += `  \\cventry{${degree}}{${institution}}{}{${dates}}{\n`
      if (gpa) body += `    \\begin{cvitems}\\item ${gpa}\\end{cvitems}\n`
      body += `  }\n`
    }
    body += `\\end{cventries}\n\n`
  }

  if (data.projects?.length) {
    body += `\\cvsection{Projects}\n\\begin{cventries}\n`
    for (const proj of data.projects) {
      if (!proj.name && !proj.description) continue
      const projName = escapeLatex(proj.name || 'Project')
      const link = proj.url?.trim() ? ` \\href{${escapeLatex(proj.url)}}{Link}` : ''
      body += `  \\cventry{}{${projName}${link}}{}{}{\n`
      if (proj.description?.trim()) body += `    ${escapeLatex(proj.description)}\n`
      if (proj.bullets?.length) {
        body += `    \\begin{cvitems}\n`
        for (const b of proj.bullets) {
          if (b?.trim()) body += `      \\item ${escapeLatex(b)}\n`
        }
        body += `    \\end{cvitems}\n`
      }
      body += `  }\n`
    }
    body += `\\end{cventries}\n\n`
  }

  if (data.skills?.length) {
    body += `\\cvsection{Skills}\n\\begin{cvskills}\n`
    for (const sg of data.skills) {
      if (!sg.category && !sg.items?.length) continue
      const items = (sg.items || []).filter(Boolean).map(s => escapeLatex(s)).join(', ')
      body += `  \\cvskill{${escapeLatex(sg.category || 'Skills')}}{${items}}\n`
    }
    body += `\\end{cvskills}\n\n`
  }

  if (data.certifications?.length) {
    body += `\\cvsection{Certifications}\n\\begin{cventries}\n`
    for (const cert of data.certifications) {
      if (!cert.name && !cert.issuer) continue
      body += `  \\cventry{${escapeLatex(cert.name || '')}}{${escapeLatex(cert.issuer || '')}}{}{${escapeLatex(cert.date || '')}}{}\n`
    }
    body += `\\end{cventries}\n\n`
  }

  if (data.languages?.length) {
    body += `\\cvsection{Languages}\n\\begin{cvskills}\n`
    for (const lang of data.languages) {
      if (!lang.name?.trim()) continue
      const prof = lang.proficiency?.trim() ? escapeLatex(lang.proficiency) : ''
      body += `  \\cvskill{${escapeLatex(lang.name)}}{${prof}}\n`
    }
    body += `\\end{cvskills}\n\n`
  }

  return `% Awesome CV style - inspired by posquit0/Awesome-CV
\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fontawesome5}

\\geometry{left=1.4cm, top=0.8cm, right=1.4cm, bottom=1.8cm}
\\setlength{\\parindent}{0pt}
\\definecolor{awesome}{HTML}{DC3522}

\\newcommand{\\cvsection}[1]{%
  \\vspace{8pt}%
  {\\color{awesome}\\large\\bfseries #1}\\[4pt]%
  \\hrule\\vspace{6pt}%
}
\\newenvironment{cventries}{\\begin{itemize}[leftmargin=0pt, itemsep=6pt]}{\\end{itemize}}
\\newcommand{\\cventry}[5]{%
  \\item \\textbf{#1} \\hfill \\textit{#4}\\\\
  \\textit{#2} \\hfill \\textit{#3}\\\\
  #5\\vspace{2pt}%
}
\\newenvironment{cvitems}{\\begin{itemize}[leftmargin=*, topsep=2pt, itemsep=1pt]}{\\end{itemize}}
\\newenvironment{cvskills}{\\begin{itemize}[leftmargin=0pt, itemsep=4pt]}{\\end{itemize}}
\\newcommand{\\cvskill}[2]{\\item \\textbf{#1}: #2}

\\begin{document}

\\begin{center}
  {\\Huge \\textbf{${name}}}\\\\[4pt]
  ${title ? `{\\large \\textit{${title}}}\\\\[4pt]` : ''}
  \\small ${headerLine}
\\end{center}

\\vspace{4pt}

${body}
\\end{document}
`
}
