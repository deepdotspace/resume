/**
 * Two-column template — sidebar for contact/skills/languages, main area for experience.
 * Compact layout for information-dense single-page resumes.
 * Note: two-column layouts may have reduced ATS compatibility.
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

  // --- Sidebar content ---
  let sidebarContact = ''
  const contactItems: string[] = []
  if (email) contactItems.push(`\\href{mailto:${escapeLatexUrl(email)}}{${escapeLatex(email)}}`)
  if (phone) contactItems.push(phone)
  if (location) contactItems.push(location)
  if (website) contactItems.push(`\\href{${escapeLatexUrl(website)}}{Website}`)
  if (linkedin) contactItems.push(`\\href{${escapeLatexUrl(linkedin)}}{LinkedIn}`)
  if (contactItems.length) {
    sidebarContact = `{\\bfseries Contact}\\\\[2pt]\n\\rule{\\linewidth}{0.4pt}\\\\[4pt]\n${contactItems.join('\\\\[2pt]\n')}\n\n\\vspace{8pt}\n`
  }

  let sidebarSkills = ''
  if (data.skills?.length) {
    sidebarSkills = `{\\bfseries Skills}\\\\[2pt]\n\\rule{\\linewidth}{0.4pt}\\\\[4pt]\n`
    for (const sg of data.skills) {
      if (!sg.category && !sg.items?.length) continue
      const items = (sg.items || []).filter(Boolean).map(s => escapeLatex(s))
      if (items.length) {
        sidebarSkills += `\\textbf{${escapeLatex(sg.category || 'Skills')}}\\\\[1pt]\n${items.join(', ')}\\\\[4pt]\n`
      }
    }
    sidebarSkills += `\n\\vspace{8pt}\n`
  }

  let sidebarLangs = ''
  if (data.languages?.length) {
    sidebarLangs = `{\\bfseries Languages}\\\\[2pt]\n\\rule{\\linewidth}{0.4pt}\\\\[4pt]\n`
    for (const lang of data.languages) {
      if (!lang.name?.trim()) continue
      const prof = lang.proficiency?.trim() ? ` -- ${escapeLatex(lang.proficiency)}` : ''
      sidebarLangs += `${escapeLatex(lang.name)}${prof}\\\\[2pt]\n`
    }
    sidebarLangs += `\n\\vspace{8pt}\n`
  }

  let sidebarCerts = ''
  if (data.certifications?.length) {
    sidebarCerts = `{\\bfseries Certifications}\\\\[2pt]\n\\rule{\\linewidth}{0.4pt}\\\\[4pt]\n`
    for (const cert of data.certifications) {
      if (!cert.name && !cert.issuer) continue
      sidebarCerts += `\\textbf{${escapeLatex(cert.name || '')}}`
      if (cert.issuer?.trim()) sidebarCerts += `\\\\\n${escapeLatex(cert.issuer)}`
      if (cert.date?.trim()) sidebarCerts += `\\\\\n\\textit{${escapeLatex(cert.date)}}`
      sidebarCerts += `\\\\[4pt]\n`
    }
    sidebarCerts += `\n\\vspace{8pt}\n`
  }

  // --- Main body ---
  let mainBody = ''

  if (data.summary?.trim()) {
    mainBody += `{\\bfseries Summary}\\\\[2pt]\n\\rule{\\linewidth}{0.4pt}\\\\[4pt]\n${escapeLatex(data.summary)}\n\n\\vspace{6pt}\n`
  }

  if (data.experience?.length) {
    mainBody += `{\\bfseries Experience}\\\\[2pt]\n\\rule{\\linewidth}{0.4pt}\\\\[4pt]\n`
    for (const exp of data.experience) {
      if (!exp.company && !exp.role) continue
      const dates = `${escapeLatex(exp.startDate || '')} -- ${escapeLatex(exp.endDate || 'Present')}`
      mainBody += `\\textbf{${escapeLatex(exp.role || 'Role')}} \\hfill \\textit{${dates}}\\\\\n`
      mainBody += `\\textit{${escapeLatex(exp.company || 'Company')}}\n`
      if (exp.bullets?.length) {
        mainBody += `\\begin{itemize}[leftmargin=*, nosep, topsep=2pt]\n`
        for (const b of exp.bullets) {
          if (b?.trim()) mainBody += `  \\item \\small{${escapeLatex(b)}}\n`
        }
        mainBody += `\\end{itemize}\n`
      }
      mainBody += `\\vspace{4pt}\n`
    }
    mainBody += '\n'
  }

  if (data.education?.length) {
    mainBody += `{\\bfseries Education}\\\\[2pt]\n\\rule{\\linewidth}{0.4pt}\\\\[4pt]\n`
    for (const edu of data.education) {
      if (!edu.institution && !edu.degree) continue
      const dates = `${escapeLatex(edu.startDate || '')} -- ${escapeLatex(edu.endDate || '')}`
      const degree = `${escapeLatex(edu.degree || 'Degree')}${edu.field?.trim() ? ` in ${escapeLatex(edu.field)}` : ''}`
      mainBody += `\\textbf{${degree}} \\hfill \\textit{${dates}}\\\\\n`
      mainBody += `\\textit{${escapeLatex(edu.institution || 'Institution')}}`
      if (edu.gpa?.trim()) mainBody += ` \\quad GPA: ${escapeLatex(edu.gpa)}`
      mainBody += '\n\\vspace{4pt}\n\n'
    }
  }

  if (data.projects?.length) {
    mainBody += `{\\bfseries Projects}\\\\[2pt]\n\\rule{\\linewidth}{0.4pt}\\\\[4pt]\n`
    for (const proj of data.projects) {
      if (!proj.name && !proj.description) continue
      mainBody += `\\textbf{${escapeLatex(proj.name || 'Project')}}`
      if (proj.url?.trim()) mainBody += ` \\href{${escapeLatexUrl(proj.url)}}{[Link]}`
      mainBody += '\\\\\n'
      if (proj.description?.trim()) mainBody += `\\small{${escapeLatex(proj.description)}}\n`
      if (proj.bullets?.length) {
        mainBody += `\\begin{itemize}[leftmargin=*, nosep, topsep=2pt]\n`
        for (const b of proj.bullets) {
          if (b?.trim()) mainBody += `  \\item \\small{${escapeLatex(b)}}\n`
        }
        mainBody += `\\end{itemize}\n`
      }
      mainBody += `\\vspace{4pt}\n`
    }
    mainBody += '\n'
  }

  if (data.customSections?.length) {
    for (const section of data.customSections) {
      if (!section.title?.trim() && !section.entries?.length) continue
      mainBody += `{\\bfseries ${escapeLatex(section.title || 'Other')}}\\\\[2pt]\n\\rule{\\linewidth}{0.4pt}\\\\[4pt]\n`
      for (const entry of section.entries) {
        if (!entry.primary && !entry.secondary) continue
        mainBody += `\\textbf{${escapeLatex(entry.primary || '')}}`
        if (entry.date?.trim()) mainBody += ` \\hfill \\textit{${escapeLatex(entry.date)}}`
        mainBody += '\\\\\n'
        if (entry.secondary?.trim()) mainBody += `\\textit{${escapeLatex(entry.secondary)}}\n`
        if (entry.bullets?.length) {
          const nonEmpty = entry.bullets.filter(b => b?.trim())
          if (nonEmpty.length) {
            mainBody += `\\begin{itemize}[leftmargin=*, nosep, topsep=2pt]\n`
            for (const b of nonEmpty) {
              mainBody += `  \\item \\small{${escapeLatex(b)}}\n`
            }
            mainBody += `\\end{itemize}\n`
          }
        }
        mainBody += `\\vspace{4pt}\n`
      }
      mainBody += '\n'
    }
  }

  return `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{paracol}
\\usepackage[hidelinks]{hyperref}
\\geometry{a4paper, margin=0.5in}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}
\\setcolumnwidth{0.28\\textwidth}{0.68\\textwidth}

\\begin{document}

{\\centering
  {\\Huge \\textbf{${name}}}${title ? `\\\\[2pt]\n  {\\large ${title}}` : ''}
  \\par
}
\\vspace{14pt}

\\begin{paracol}{2}
\\raggedright
\\small
${sidebarContact}
${sidebarSkills}
${sidebarLangs}
${sidebarCerts}
\\switchcolumn
\\normalsize
\\raggedright
${mainBody}
\\end{paracol}

\\end{document}
`
}
