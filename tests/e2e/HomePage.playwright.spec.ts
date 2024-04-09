import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/gene/ENSG00000169174?dataset=gnomad_r4')

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/PCSK9 | gnomAD v4.0.0 | gnomAD/)
})
