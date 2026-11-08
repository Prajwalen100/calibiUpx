import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { generateReportPdf, reportSections, aiTaskLabel, tierFor, num } from '../reportPdf.ts'

const logoDataUrl =
  'data:image/png;base64,' + readFileSync(join(process.cwd(), 'public', 'calibiai-logo.png')).toString('base64')

const richScores = {
  session_id: 'sess_demo123',
  total: 842, grade: 'A', percentile: 88.4, verifiable_hash: 'sha256:abcdef',
  submitted_at: '2026-09-06T10:11:55.315Z',
  english: { total: 168, listening: 45, speaking: 40, reading: 43, writing: 40, max: 200 },
  problem_solving: 170, ai_debugging: 120, ai_feature: 130, prompt_engineering: 84,
  cognitive: {
    total: 170, grid: 24, logical: 61, behavioral_total: 85, max: 200,
    behavioral: { teamwork: 80, accountability: 90, adaptability: 70, responsible_ai: 95, decision_making: 85, learning_mindset: 90 },
    traitLabels: { teamwork: 'Teamwork', accountability: 'Accountability', adaptability: 'Adaptability', responsible_ai: 'Responsible AI', decision_making: 'Decision Making', learning_mindset: 'Learning Mindset' },
  },
  detail: { listeningCorrect: 7, listeningTotal: 8, readingCorrect: 5, readingTotal: 6, problemCorrect: 9, problemTotal: 10, logicalCorrect: 6, logicalTotal: 7 },
  ai_results: {
    WRITING: { score: 82, summary: 'Well-structured essay.', improvements: ['Add real-world examples'] },
    AD1: { score: 60, summary: 'Found the pagination bug.', improvements: ['Check boundary inputs'] },
  },
}

const profile = {
  full_name: 'Priya Sharma', email: 'priya.sharma@college.edu.in', prn: '21CS1042',
  phone: '+91 98765 43210', dob: '2003-04-11', gender: 'Female',
  degree: 'B.Tech CSE', college: 'College of Engineering Pune', graduation_year: 2026, cgpa: 8.7,
  skills: 'Python, React, SQL, Docker',
  created_at: '2025-08-01T10:00:00.000Z',
}

test('generateReportPdf produces a multi-page branded PDF with the logo embedded', async () => {
  const doc = await generateReportPdf({ scores: richScores, profile, sample: false, logoDataUrl })
  const pages = doc.getNumberOfPages()
  assert.ok(pages >= 1, 'should have at least one page')
  assert.ok(pages <= 4, 'should stay within a few pages')
  const pdfCommands = JSON.stringify((doc as any).internal.pages)
  assert.match(pdfCommands, /Assessment skill map/)
  assert.match(pdfCommands, /AI-assisted Debugging/)
  const out = join(tmpdir(), `calibiai_test_${Date.now()}.pdf`)
  doc.save(out)
  const bytes = readFileSync(out)
  assert.ok(bytes.length > 50_000, 'should embed the logo image (not a text-only pdf)')
  assert.ok(bytes.subarray(0, 5).toString() === '%PDF-', 'should be a valid PDF')
})

test('generateReportPdf tolerates a minimal/partial payload', async () => {
  const doc = await generateReportPdf({
    scores: { total: 0, grade: 'D', percentile: 1, english: {}, cognitive: {} },
    profile: { full_name: 'New Student' },
    sample: false,
    logoDataUrl,
  })
  assert.ok(doc.getNumberOfPages() >= 1)
})

test('helpers stay stable for ReportModal', () => {
  assert.equal(num('12'), 12)
  assert.equal(reportSections(richScores).length, 6)
  assert.equal(aiTaskLabel('WRITING'), 'Writing Task')
  assert.equal(tierFor(842).label, 'Platinum')
  assert.equal(reportSections({ english: { total: 200 }, cognitive: { total: 200 } })[0].pct, 100)
})

test('generateReportPdf generates comprehensive report with all company assessments', async () => {
  const companyAttempts = [
    { company: 'meta', status: 'submitted', score: 5.5, verdict: 'not-yet' },
    { company: 'accenture', status: 'submitted', score: 13.3, verdict: 'borderline' },
    { company: 'tcs', status: 'submitted', score: 3.7, verdict: 'not-yet' },
    { company: 'infosys', status: 'submitted', score: 0, verdict: 'not-yet' },
  ]
  const doc = await generateReportPdf({
    scores: richScores,
    companyList: companyAttempts,
    profile,
    comprehensive: true,
    logoDataUrl,
  })
  const pages = doc.getNumberOfPages()
  assert.ok(pages >= 2, 'comprehensive report should be multi-page')
  const pdfCommands = JSON.stringify((doc as any).internal.pages)
  assert.match(pdfCommands, /All Assessment & Company Results/)
  assert.match(pdfCommands, /Meta/)
  assert.match(pdfCommands, /Accenture/)
  assert.match(pdfCommands, /Evaluator Feedback & Placement Growth Strategy/)
})

test('generateReportPdf generates full 10-assessment report with all companies and feedback', async () => {
  const a1 = { total: 72, grade: 'D', percentile: 5, english: { total: 20 }, cognitive: { total: 20 } }
  const a2 = { total: 286, grade: 'C', percentile: 25, assessment_no: 2 }
  const companyAttempts = [
    { company: 'meta', status: 'submitted', score: 5.5, verdict: 'not-yet' },
    { company: 'infosys', status: 'submitted', score: 0, verdict: 'not-yet' },
    { company: 'hexaware', status: 'submitted', score: 0, verdict: 'not-yet' },
    { company: 'accenture', status: 'submitted', score: 13.3, verdict: 'borderline' },
    { company: 'zoho', status: 'submitted', score: 2.2, verdict: 'not-yet' },
    { company: 'tcs', status: 'submitted', score: 3.7, verdict: 'not-yet' },
    { company: 'capgemini', status: 'submitted', score: 11.8, verdict: 'borderline' },
    { company: 'hcltech', status: 'submitted', score: 2.7, verdict: 'not-yet' },
  ]
  const doc = await generateReportPdf({
    scores: a1,
    scores2: a2,
    companyList: companyAttempts,
    profile: {
      full_name: 'Prajwal Gulhane',
      email: 'prajwal@example.com',
      college: 'Pimpri Chinchwad College of Engineering',
      degree: 'B.Tech Computer Engineering',
      prn: 'PRN2026PCCOE',
      cgpa: 8.5,
      graduation_year: 2026,
    },
    resume: {
      resume_score: 78,
      feedback: {
        suggestions: ['Add quantifiable metrics to project descriptions.'],
        gaps: ['Include cloud deployment and containerization experience.'],
      },
    },
    comprehensive: true,
    logoDataUrl,
  })
  const pages = doc.getNumberOfPages()
  assert.equal(pages, 3, '10 assessments should generate a 3-page comprehensive report')
  const pdfCommands = JSON.stringify((doc as any).internal.pages)
  assert.match(pdfCommands, /CalibiAI Assessment/)
  assert.match(pdfCommands, /Capgemini 2027 Mock/)
  assert.match(pdfCommands, /Meta/)
  assert.match(pdfCommands, /Infosys/)
  assert.match(pdfCommands, /Hexaware/)
  assert.match(pdfCommands, /Accenture/)
  assert.match(pdfCommands, /Zoho/)
  assert.match(pdfCommands, /TCS/)
  assert.match(pdfCommands, /HCLTech/)
  assert.match(pdfCommands, /Evaluator Feedback & Placement Growth Strategy/)
  assert.match(pdfCommands, /Demonstrated Strengths/)
  assert.match(pdfCommands, /Critical Growth Areas & Score Blockers/)
  assert.match(pdfCommands, /Actionable Placement Coaching/)
  assert.match(pdfCommands, /Resume & ATS Screening Insights/)
})
