/**
 * CareerOS Shared Utility Functions
 */

/**
 * Calculates Career Health Score based on ATS fit, skill coverage, and active pipeline
 */
export function calculateCareerHealthScore(params: {
  atsScore: number;
  skillCoverage: number;
  activeApplicationsCount: number;
}): number {
  const { atsScore, skillCoverage, activeApplicationsCount } = params;
  const pipelineScore = Math.min(activeApplicationsCount * 20, 100);

  const weighted = atsScore * 0.4 + skillCoverage * 0.4 + pipelineScore * 0.2;
  return Math.round(weighted);
}

/**
 * Format currency numbers for salary ranges
 */
export function formatSalary(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
