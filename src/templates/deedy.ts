/**
 * Deedy Resume template — from deedy/Deedy-Resume (Apache 2.0).
 * One-page asymmetric two-column: 1/3 left (education, skills, links), 2/3 right (experience).
 * Uses standard fonts for pdflatex compatibility (original uses XeLaTeX + Lato/Raleway).
 */

import type { ResumeFormData } from './types'
import { escapeLatex } from './latexEscape'

export function generateLatex(data: ResumeFormData): string {
  const p = data.personalInfo
  const nameParts = (p?.name || 'Your Name').trim().split(/\s+/)
  const firstName = escapeLatex(nameParts[0] || 'Your')
  const lastName = escapeLatex(nameParts.slice(1).join(' ') || 'Name')
  const email = p?.email?.trim() || ''
  const phone = escapeLatex(p?.phone || '')
  const website = p?.website?.trim() || ''
  const linkedin = p?.linkedin?.trim() || ''
  const location = escapeLatex(p?.location || '')

  const contactLine = [
    website ? `\\href{${escapeLatex(website)}}{${escapeLatex(website)}}` : '',
    email ? `\\href{mailto:${escapeLatex(email)}}{${escapeLatex(email)}}` : '',
    phone,
    linkedin ? `\\href{${escapeLatex(linkedin)}}{LinkedIn}` : '',
    location,
  ]
    .filter(Boolean)
    .join(' | ')

  // Left column: Education, Skills, Links (certifications as links-like)
  let leftCol = ''

  if (data.education?.length) {
    leftCol += `\\section{Education}\n`
    for (const edu of data.education) {
      if (!edu.institution && !edu.degree) continue
      const institution = escapeLatex(edu.institution || 'Institution')
      const degree = escapeLatex(edu.degree || 'Degree')
      const field = edu.field?.trim() ? ` in ${escapeLatex(edu.field)}` : ''
      const dates = `${escapeLatex(edu.startDate || '')} | ${escapeLatex(edu.endDate || '')}`
      const gpa = edu.gpa?.trim() ? `\\\\ Cum. GPA: ${escapeLatex(edu.gpa)}` : ''
      leftCol += `\\subsection{${institution}}\n\\descript{${degree}${field}}\n\\location{${dates}}${gpa}\n\\sectionsep\n`
    }
  }

  const linkItems: string[] = []
  if (website) linkItems.push(`Website: \\href{${escapeLatex(website)}}{\\bf ${escapeLatex(website)}}`)
  if (linkedin) linkItems.push(`LinkedIn: \\href{${escapeLatex(linkedin)}}{\\bf LinkedIn}`)
  if (linkItems.length) {
    leftCol += `\\section{Links}\n${linkItems.join(' \\\\\n')}\n\\sectionsep\n`
  }

  if (data.skills?.length) {
    leftCol += `\\section{Skills}\n`
    for (const sg of data.skills) {
      if (!sg.category && !sg.items?.length) continue
      const items = (sg.items || []).filter(Boolean).map(s => escapeLatex(s))
      if (items.length) {
        leftCol += `\\subsection{${escapeLatex(sg.category || 'Skills')}}\n\\location{${items.join(' \\textbullet{} ')}}\n\\sectionsep\n`
      }
    }
  }

  if (data.languages?.length) {
    leftCol += `\\section{Languages}\n`
    for (const lang of data.languages) {
      if (!lang.name?.trim()) continue
      const prof = lang.proficiency?.trim() ? ` (${escapeLatex(lang.proficiency)})` : ''
      leftCol += `\\location{${escapeLatex(lang.name)}${prof}}\n`
    }
    leftCol += `\\sectionsep\n`
  }

  if (data.certifications?.length) {
    leftCol += `\\section{Certifications}\n`
    for (const cert of data.certifications) {
      if (!cert.name && !cert.issuer) continue
      leftCol += `\\subsection{${escapeLatex(cert.name || '')}}\n\\location{${escapeLatex(cert.issuer || '')} ${escapeLatex(cert.date || '')}}\n\\sectionsep\n`
    }
  }

  // Right column: Experience, Projects, Summary
  let rightCol = ''

  if (data.summary?.trim()) {
    rightCol += `\\section{Summary}\n${escapeLatex(data.summary)}\n\\sectionsep\n`
  }

  if (data.experience?.length) {
    rightCol += `\\section{Experience}\n`
    for (const exp of data.experience) {
      if (!exp.company && !exp.role) continue
      const company = escapeLatex(exp.company || 'Company')
      const role = escapeLatex(exp.role || 'Role')
      const dates = `${escapeLatex(exp.startDate || '')} -- ${escapeLatex(exp.endDate || 'Present')}`
      const loc = escapeLatex(p?.location || '')
      rightCol += `\\runsubsection{${company}}\n\\descript{| ${role}}\n\\location{${dates} | ${loc}}\n`
      if (exp.bullets?.length) {
        rightCol += `\\begin{tightemize}\n`
        for (const b of exp.bullets) {
          if (b?.trim()) rightCol += `\\item ${escapeLatex(b)}\n`
        }
        rightCol += `\\end{tightemize}\n`
      }
      rightCol += `\\sectionsep\n`
    }
  }

  if (data.projects?.length) {
    rightCol += `\\section{Projects}\n`
    for (const proj of data.projects) {
      if (!proj.name && !proj.description) continue
      const name = escapeLatex(proj.name || 'Project')
      const link = proj.url?.trim() ? ` -- \\href{${escapeLatex(proj.url)}}{Link}` : ''
      rightCol += `\\runsubsection{${name}${link}}\n`
      if (proj.description?.trim()) rightCol += `${escapeLatex(proj.description)}\n`
      if (proj.bullets?.length) {
        rightCol += `\\begin{tightemize}\n`
        for (const b of proj.bullets) {
          if (b?.trim()) rightCol += `\\item ${escapeLatex(b)}\n`
        }
        rightCol += `\\end{tightemize}\n`
      }
      rightCol += `\\sectionsep\n`
    }
  }

  return `% Deedy Resume - https://github.com/deedy/Deedy-Resume (Apache 2.0)
\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[hmargin=1.25cm, vmargin=0.75cm]{geometry}
\\usepackage[hidelinks]{hyperref}
\\usepackage[usenames,dvipsnames]{xcolor}
\\usepackage{titlesec}
\\usepackage{enumitem}

\\definecolor{date}{HTML}{666666}
\\definecolor{primary}{HTML}{2b2b2b}
\\definecolor{headings}{HTML}{6A6A6A}
\\definecolor{subheadings}{HTML}{333333}

\\setlength{\\parindent}{0pt}
\\titlespacing{\\section}{0pt}{0pt}{0pt}
\\titlespacing{\\subsection}{0pt}{0pt}{0pt}

\\newcommand{\\sectionsep}{\\vspace{8pt}}
\\newcommand{\\namesection}[3]{%
  \\centering{\\fontsize{28pt}{40pt}\\selectfont\\bfseries #1 #2} \\\\[5pt]
  \\centering{\\color{headings}\\small #3}\\\\
  \\noindent\\makebox[\\linewidth]{\\color{headings}\\rule{\\paperwidth}{0.4pt}}
  \\vspace{-15pt}
}
\\titleformat{\\section}{\\color{headings}\\scshape\\large\\raggedright}{}{0em}{}
\\titleformat{\\subsection}{\\color{subheadings}\\bfseries\\normalsize}{}{0em}{}
\\newcommand{\\runsubsection}[1]{\\color{subheadings}\\bfseries #1 \\normalfont}
\\newcommand{\\descript}[1]{\\color{subheadings}\\raggedright\\small #1}
\\newcommand{\\location}[1]{\\color{headings}\\raggedright\\small #1\\\\}
\\newenvironment{tightemize}{\\vspace{-\\topsep}\\begin{itemize}[itemsep=1pt, topsep=2pt]}{\\end{itemize}\\vspace{-\\topsep}}

\\begin{document}

\\namesection{${firstName}}{${lastName}}{${contactLine}}

\\noindent
\\begin{minipage}[t]{0.33\\textwidth}
\\raggedright
\\small

${leftCol}

\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.66\\textwidth}
\\raggedright

${rightCol}

\\end{minipage}

\\end{document}
`
}
