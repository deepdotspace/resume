/**
 * Jake's Resume template — from jakegut/resume (MIT), based on sb2nov/resume.
 * Clean single-column, ATS-friendly, Education-first ordering.
 * Exact structure: Education, Experience, Projects, Technical Skills.
 */

import type { ResumeFormData } from './types'
import { escapeLatex, escapeLatexUrl } from './latexEscape'

export function generateLatex(data: ResumeFormData): string {
  const p = data.personalInfo
  const name = escapeLatex(p?.name || 'Your Name')
  const email = p?.email?.trim() || ''
  const phone = escapeLatex(p?.phone || '')
  const linkedin = p?.linkedin?.trim() || ''
  const website = p?.website?.trim() || ''

  const contactParts: string[] = []
  if (phone) contactParts.push(phone)
  if (email) contactParts.push(`\\href{mailto:${escapeLatexUrl(email)}}{\\underline{${escapeLatex(email)}}}`)
  if (linkedin) contactParts.push(`\\href{${escapeLatexUrl(linkedin)}}{\\underline{linkedin.com/in/...}}`)
  if (website) contactParts.push(`\\href{${escapeLatexUrl(website)}}{\\underline{${escapeLatex(website)}}}`)
  const contactLine = contactParts.join(' $|$ ')

  let body = ''

  // Jake's order: Education first
  if (data.education?.length) {
    body += `\\section{Education}\n  \\resumeSubHeadingListStart\n`
    for (const edu of data.education) {
      if (!edu.institution && !edu.degree) continue
      const institution = escapeLatex(edu.institution || 'Institution')
      const degree = `${escapeLatex(edu.degree || 'Degree')}${edu.field?.trim() ? ` in ${escapeLatex(edu.field)}` : ''}`
      const dates = `${escapeLatex(edu.startDate || '')} -- ${escapeLatex(edu.endDate || '')}`
      const gpa = edu.gpa?.trim() ? `; GPA: ${escapeLatex(edu.gpa)}` : ''
      body += `    \\resumeSubheading{${institution}}{${dates}}{${degree}${gpa}}{}\n`
    }
    body += `  \\resumeSubHeadingListEnd\n\n`
  }

  // Experience
  if (data.experience?.length) {
    body += `\\section{Experience}\n  \\resumeSubHeadingListStart\n`
    for (const exp of data.experience) {
      if (!exp.company && !exp.role) continue
      const role = escapeLatex(exp.role || 'Role')
      const company = escapeLatex(exp.company || 'Company')
      const dates = `${escapeLatex(exp.startDate || '')} -- ${escapeLatex(exp.endDate || 'Present')}`
      body += `    \\resumeSubheading{${role}}{${dates}}{${company}}{}\n`
      if (exp.bullets?.length) {
        body += `    \\resumeItemListStart\n`
        for (const b of exp.bullets) {
          if (b?.trim()) body += `      \\resumeItem{${escapeLatex(b)}}\n`
        }
        body += `    \\resumeItemListEnd\n`
      }
    }
    body += `  \\resumeSubHeadingListEnd\n\n`
  }

  // Projects
  if (data.projects?.length) {
    body += `\\section{Projects}\n  \\resumeSubHeadingListStart\n`
    for (const proj of data.projects) {
      if (!proj.name && !proj.description) continue
      const projName = escapeLatex(proj.name || 'Project')
      const link = proj.url?.trim() ? ` $|$ \\href{${escapeLatexUrl(proj.url)}}{\\underline{Link}}` : ''
      const desc = proj.description?.trim() ? ` $|$ \\emph{${escapeLatex(proj.description)}}` : ''
      body += `    \\resumeProjectHeading{\\textbf{${projName}}${desc}${link}}{}\n`
      if (proj.bullets?.length) {
        body += `    \\resumeItemListStart\n`
        for (const b of proj.bullets) {
          if (b?.trim()) body += `      \\resumeItem{${escapeLatex(b)}}\n`
        }
        body += `    \\resumeItemListEnd\n`
      }
    }
    body += `  \\resumeSubHeadingListEnd\n\n`
  }

  // Technical Skills (Jake's section name)
  if (data.skills?.length) {
    body += `\\section{Technical Skills}\n  \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n`
    for (const sg of data.skills) {
      if (!sg.category && !sg.items?.length) continue
      const items = (sg.items || []).filter(Boolean).map(s => escapeLatex(s))
      if (items.length) {
        body += `      \\textbf{${escapeLatex(sg.category || 'Skills')}}{: ${items.join(', ')}} \\\\\n`
      }
    }
    body += `    }}\n  \\end{itemize}\n\n`
  }

  if (data.certifications?.length) {
    body += `\\section{Certifications}\n  \\resumeSubHeadingListStart\n`
    for (const cert of data.certifications) {
      if (!cert.name && !cert.issuer) continue
      const certName = escapeLatex(cert.name || '')
      const issuer = cert.issuer?.trim() ? escapeLatex(cert.issuer) : ''
      const date = cert.date?.trim() ? escapeLatex(cert.date) : ''
      body += `    \\resumeSubheading{${certName}}{${date}}{${issuer}}{}\n`
    }
    body += `  \\resumeSubHeadingListEnd\n\n`
  }

  if (data.languages?.length) {
    body += `\\section{Languages}\n  \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n`
    const langParts = data.languages
      .filter(l => l.name?.trim())
      .map(l => {
        const prof = l.proficiency?.trim() ? ` (${escapeLatex(l.proficiency)})` : ''
        return `${escapeLatex(l.name)}${prof}`
      })
    body += `      ${langParts.join(', ')}\n`
    body += `    }}\n  \\end{itemize}\n\n`
  }

  if (data.customSections?.length) {
    for (const section of data.customSections) {
      if (!section.title?.trim() && !section.entries?.length) continue
      body += `\\section{${escapeLatex(section.title || 'Other')}}\n  \\resumeSubHeadingListStart\n`
      for (const entry of section.entries) {
        if (!entry.primary && !entry.secondary) continue
        const primary = escapeLatex(entry.primary || '')
        const secondary = entry.secondary?.trim() ? escapeLatex(entry.secondary) : ''
        const date = entry.date?.trim() ? escapeLatex(entry.date) : ''
        body += `    \\resumeSubheading{${primary}}{${date}}{${secondary}}{}\n`
        if (entry.bullets?.length) {
          const nonEmpty = entry.bullets.filter(b => b?.trim())
          if (nonEmpty.length) {
            body += `    \\resumeItemListStart\n`
            for (const b of nonEmpty) {
              body += `      \\resumeItem{${escapeLatex(b)}}\n`
            }
            body += `    \\resumeItemListEnd\n`
          }
        }
      }
      body += `  \\resumeSubHeadingListEnd\n\n`
    }
  }

  return `% Jake's Resume - https://github.com/jakegut/resume (MIT)
\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{#1 \\vspace{-2pt}}
}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
  \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
    \\textbf{#1} & #2 \\\\
    \\textit{\\small#3} & \\textit{\\small #4} \\\\
  \\end{tabular*}\\vspace{-7pt}
}
\\newcommand{\\resumeProjectHeading}[2]{
  \\item
  \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\small#1 & #2 \\\\
  \\end{tabular*}\\vspace{-7pt}
}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

\\begin{center}
  \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}
  \\small ${contactLine}
\\end{center}

${body}
\\end{document}
`
}
