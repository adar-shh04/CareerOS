# ADR-008: Explainable Opportunity Score replaces resume-only match scores

- **Status:** Accepted
- **Date:** 2026-07-21

## Context

Resume similarity alone overlooks experience fit, constraints, competition, hiring signals, preferences, and relationship potential.

## Decision

CareerOS calculates an Opportunity Score from transparent components. Initial components are resume fit, experience fit, skill gap, location/work authorization fit, competition signal, hiring velocity, referral potential, and company preference. Inputs, unavailable data, confidence, and reasons must be shown; users may adjust preferences and override recommendations.

## Alternatives considered

- **Keyword match score only:** Rejected because it is too narrow and misleading.
- **Opaque AI ranking:** Rejected because users cannot assess or correct it.

## Consequences

The first version must support missing-data-safe scoring and avoid false precision. Weights are configuration with versioning, evaluation, and product documentation—not hidden constants.
