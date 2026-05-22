import type { ActionHandler } from 'deepspace/worker'

/**
 * deleteResume — cascading delete for a resume and its version history.
 *
 * Runs with the app-owner identity (appAction bypass) so a single failed
 * row doesn't leave orphans the caller's role can no longer see. Child
 * collections cleaned up: `resume-versions`. The resume row itself is
 * removed last.
 *
 * PDF blobs embedded in resume-versions.pdfData are co-located with the
 * row and removed atomically with it.
 */
const deleteResume: ActionHandler = async ({ params, tools }) => {
  const resumeId = params.resumeId
  if (typeof resumeId !== 'string' || !resumeId) {
    return { success: false, error: 'resumeId is required' }
  }

  const cascadeCollections = ['resume-versions'] as const

  for (const collection of cascadeCollections) {
    const result = await tools.query<{ resumeId: string }>(collection, {
      where: { resumeId },
      limit: 500,
    })
    if (!result.success) {
      return { success: false, error: `Failed to query ${collection}: ${result.error ?? 'unknown'}` }
    }
    const records = result.data?.records ?? []
    for (const record of records) {
      const removal = await tools.remove(collection, record.recordId)
      if (!removal.success) {
        return {
          success: false,
          error: `Failed to remove ${collection}/${record.recordId}: ${removal.error ?? 'unknown'}`,
        }
      }
    }
  }

  const resumeRemoval = await tools.remove('resumes', resumeId)
  if (!resumeRemoval.success) {
    return { success: false, error: `Failed to remove resume: ${resumeRemoval.error ?? 'unknown'}` }
  }

  return { success: true, data: undefined }
}

export const actions: Record<string, ActionHandler> = {
  deleteResume,
}
