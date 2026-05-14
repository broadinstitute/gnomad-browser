/**
 * TRviz DP-based tandem repeat sequence decomposition — TypeScript port.
 *
 * Ported from the trviz library by Jonghun Park et al., with Cython
 * optimizations by Ben Weisburd (github.com/bw2/trviz).
 *
 * Original paper:
 *   Park J, Kaufman E, Valdmanis P, Bafna V. "TRviz: a Python library for
 *   decomposing and visualizing tandem repeat sequences."
 *   Bioinformatics Advances, 3(1), 2023. doi:10.1093/bioadv/vbad058
 *
 * The Cython-optimized DP implementation (decompose.pyx) was contributed by
 * Ben Weisburd in his fork at github.com/bw2/trviz. Key optimizations ported
 * here include: hoisting the max_motif_val computation outside the inner motif
 * loop, using flat Int32Array typed arrays, and the _argmax_max3 inline helper
 * for tie-breaking consistency.
 *
 * ---------------------------------------------------------------------------
 * BSD 3-Clause License
 *
 * Copyright (c) 2022, The Regents of the University of California
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 * ---------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Token types (canonical — shared with HaplotypeVariantTable)
// ---------------------------------------------------------------------------

export type MotifToken = {
  type: 'motif'
  motifIndex: number
  sequence: string
}

export type InterruptionToken = {
  type: 'interruption'
  sequence: string
}

export type SequenceToken = MotifToken | InterruptionToken

// ---------------------------------------------------------------------------
// Levenshtein distance (for classifying DP-decomposed segments)
// ---------------------------------------------------------------------------

function getLevenshteinDistance(s1: string, s2: string): number {
  if (s1.length > s2.length) {
    ;[s1, s2] = [s2, s1]
  }
  let distances: number[] = Array.from({ length: s1.length + 1 }, (_, i) => i)
  for (let i2 = 0; i2 < s2.length; i2++) {
    const c2 = s2[i2]
    const newDistances: number[] = [i2 + 1]
    for (let i1 = 0; i1 < s1.length; i1++) {
      if (s1[i1] === c2) {
        newDistances.push(distances[i1])
      } else {
        newDistances.push(1 + Math.min(distances[i1], distances[i1 + 1], newDistances[newDistances.length - 1]))
      }
    }
    distances = newDistances
  }
  return distances[distances.length - 1]
}

// ---------------------------------------------------------------------------
// Argmax/max of 3 values — first-index-wins on ties (matching Cython)
// ---------------------------------------------------------------------------

function argmaxMax3(a: number, b: number, c: number): [number, number] {
  if (a >= b) {
    if (a >= c) return [0, a]
    return [2, c]
  }
  if (b >= c) return [1, b]
  return [2, c]
}

// ---------------------------------------------------------------------------
// Core DP decomposition (port of trviz/cy/decompose.pyx)
// ---------------------------------------------------------------------------

const NEGATIVE_INF = -2147483648 // Int32 min, matching Cython

interface DPDecomposedSegment {
  sequence: string
  motifIndex: number // which motif template was aligned
}

function decomposeSequenceDP(
  sequence: string,
  motifs: string[],
  matchScore = 1,
  mismatchScore = -1,
  insertionScore = -1,
  deletionScore = -1,
): DPDecomposedSegment[] {
  const N = sequence.length
  const M = motifs.length
  const motifLengths = motifs.map((m) => m.length)
  const maxMotifLength = Math.max(...motifLengths)
  const K = maxMotifLength + 1 // j dimension size

  // Flat 3D arrays: index = i * M * K + m * K + j
  const totalSize = (N + 1) * M * K
  const s = new Int32Array(totalSize)
  const btI = new Int32Array(totalSize)
  const btM = new Int32Array(totalSize)
  const btJ = new Int32Array(totalSize)

  const idx = (i: number, m: number, j: number) => i * M * K + m * K + j

  // Boundary cases
  for (let m = 0; m < M; m++) {
    const mLen = motifLengths[m]
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= mLen; j++) {
        const p = idx(i, m, j)
        if (i === 0 && j === 0) {
          s[p] = 0
          btI[p] = 0
          btM[p] = m
          btJ[p] = 0
        } else if (i === 0 && j !== 0) {
          const prev = idx(0, m, j - 1)
          s[p] = s[prev] + insertionScore
          btI[p] = 0
          btM[p] = m
          btJ[p] = j - 1
        } else if (i !== 0 && j === 0) {
          const prev = idx(i - 1, m, 0)
          s[p] = s[prev] + insertionScore
          btI[p] = i - 1
          btM[p] = m
          btJ[p] = 0
        }
      }
    }
  }

  // Upper-case sequence for comparison
  const seqUpper = sequence.toUpperCase()
  const motifUppers = motifs.map((m) => m.toUpperCase())

  // Main DP fill
  for (let i = 1; i <= N; i++) {
    const seqChar = seqUpper.charCodeAt(i - 1)

    // Hoist max_motif_val outside the m loop (Cython optimization)
    let maxMotifVal = NEGATIVE_INF
    let maxMIndex = -1
    let maxJOfMaxM = -1
    if (i > 1) {
      for (let mi = 0; mi < M; mi++) {
        const mEnd = s[idx(i - 1, mi, motifLengths[mi])]
        if (mEnd > maxMotifVal) {
          maxMotifVal = mEnd
          maxMIndex = mi
          maxJOfMaxM = motifLengths[mi]
        }
      }
    }

    for (let m = 0; m < M; m++) {
      const motif = motifUppers[m]
      const mLen = motifLengths[m]

      for (let j = 1; j <= mLen; j++) {
        const p = idx(i, m, j)

        if (j === 1) {
          if (i === 1) {
            const match = seqChar === motif.charCodeAt(0)
            const fromDiagonal = s[idx(0, m, 0)] + (match ? matchScore : mismatchScore)
            const fromMLeft = s[idx(0, m, 1)] + insertionScore
            const fromMUp = s[idx(1, m, 0)] + deletionScore

            const [argmaxIdx, maxVal] = argmaxMax3(fromDiagonal, fromMLeft, fromMUp)
            s[p] = maxVal

            if (argmaxIdx === 0) {
              btI[p] = 0; btM[p] = m; btJ[p] = 0
            } else if (argmaxIdx === 1) {
              btI[p] = i - 1; btM[p] = m; btJ[p] = j
            } else {
              btI[p] = i; btM[p] = m; btJ[p] = 0
            }
          } else {
            // i > 1: use hoisted max_motif_val
            const match = seqChar === motif.charCodeAt(0)
            const maxFromMotifEnd = maxMotifVal + (match ? matchScore : mismatchScore)
            const fromMLeft = s[idx(i - 1, m, 1)] + insertionScore
            const fromMUp = s[idx(i, m, 0)] + deletionScore

            const [argmaxIdx, maxVal] = argmaxMax3(maxFromMotifEnd, fromMLeft, fromMUp)
            s[p] = maxVal

            if (argmaxIdx === 0) {
              btI[p] = i - 1; btM[p] = maxMIndex; btJ[p] = maxJOfMaxM
            } else if (argmaxIdx === 1) {
              btI[p] = i - 1; btM[p] = m; btJ[p] = 1
            } else {
              btI[p] = i; btM[p] = m; btJ[p] = 0
            }
          }
        } else {
          // j > 1: standard alignment step
          const match = seqChar === motif.charCodeAt(j - 1)
          const diagonal = s[idx(i - 1, m, j - 1)] + (match ? matchScore : mismatchScore)
          const fromLeft = s[idx(i - 1, m, j)] + insertionScore
          const fromUp = s[idx(i, m, j - 1)] + deletionScore

          const [argmaxIdx, maxVal] = argmaxMax3(diagonal, fromLeft, fromUp)
          s[p] = maxVal

          if (argmaxIdx === 0) {
            btI[p] = i - 1; btM[p] = m; btJ[p] = j - 1
          } else if (argmaxIdx === 1) {
            btI[p] = i - 1; btM[p] = m; btJ[p] = j
          } else {
            btI[p] = i; btM[p] = m; btJ[p] = j - 1
          }
        }
      }
    }
  }

  // Find best endpoint: max_m( s[N, m, len(m)] )
  let backtrackMax = NEGATIVE_INF
  let startI = 0
  let startM = 0
  let startJ = 0
  let found = false
  for (let m = 0; m < M; m++) {
    const val = s[idx(N, m, motifLengths[m])]
    if (val > backtrackMax) {
      backtrackMax = val
      startI = N
      startM = m
      startJ = motifLengths[m]
      found = true
    }
  }

  if (!found) {
    return []
  }

  // Backtrack following the Cython approach: walk backwards, detect motif boundaries
  // when j transitions from 1 to != 1, extract segments via sequence slicing.
  // We additionally track prev_m to know which motif each segment was aligned to.
  const segments: DPDecomposedSegment[] = []
  let curI = startI
  let curM = startM
  let curJ = startJ
  let prevI = -1
  let prevJ = -1
  let prevM = -1
  let motifEnd = N // exclusive end index for current segment

  while (true) {
    const ci = curI
    const cm = curM
    const cj = curJ

    if (prevJ === 1 && cj !== 1) {
      // Motif boundary: the segment that was being aligned to motif prevM
      // spans from prevI (adjusted to 0-based) to motifEnd
      const segStart = prevI === 0 ? 0 : prevI - 1
      segments.push({
        sequence: sequence.slice(segStart, motifEnd),
        motifIndex: prevM,
      })
      motifEnd = prevI > 0 ? prevI - 1 : motifEnd
    }

    if (ci === 0 && cj === 0) {
      break
    }

    prevI = ci
    prevJ = cj
    prevM = cm
    const p = idx(ci, cm, cj)
    curI = btI[p]
    curM = btM[p]
    curJ = btJ[p]
  }

  segments.reverse()
  return segments
}

// ---------------------------------------------------------------------------
// Classify DP segments into SequenceTokens
// ---------------------------------------------------------------------------

function classifySegments(segments: DPDecomposedSegment[], motifs: string[]): SequenceToken[] {
  return segments.map((seg) => {
    const canonical = motifs[seg.motifIndex]
    if (!canonical) {
      return { type: 'interruption' as const, sequence: seg.sequence }
    }
    const dist = getLevenshteinDistance(seg.sequence.toUpperCase(), canonical.toUpperCase())
    const threshold = Math.max(2, Math.floor(canonical.length * 0.3))
    if (dist <= threshold) {
      return { type: 'motif' as const, motifIndex: seg.motifIndex, sequence: seg.sequence }
    }
    return { type: 'interruption' as const, sequence: seg.sequence }
  })
}

// ---------------------------------------------------------------------------
// Phase 2: Greedy regex fast-path (identical to the original decomposeSequence)
// ---------------------------------------------------------------------------

function decomposeGreedy(sequence: string, motifs: string[]): SequenceToken[] {
  if (!sequence || motifs.length === 0) return []

  const sortedMotifs = [...motifs].sort((a, b) => b.length - a.length)
  const escaped = sortedMotifs.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')

  const tokens: SequenceToken[] = []
  let lastIndex = 0

  for (const match of sequence.matchAll(regex)) {
    const matchStart = match.index!
    if (matchStart > lastIndex) {
      tokens.push({ type: 'interruption', sequence: sequence.slice(lastIndex, matchStart) })
    }
    const matched = match[0].toUpperCase()
    const motifIndex = motifs.findIndex((m) => m.toUpperCase() === matched)
    tokens.push({ type: 'motif', motifIndex, sequence: match[0] })
    lastIndex = matchStart + match[0].length
  }

  if (lastIndex < sequence.length) {
    tokens.push({ type: 'interruption', sequence: sequence.slice(lastIndex) })
  }

  return tokens
}

/**
 * Check if greedy regex produced a perfect decomposition (no interruptions,
 * covers the full sequence). If so, the DP would produce the same result.
 */
function isGreedyPerfect(tokens: SequenceToken[], sequenceLength: number): boolean {
  if (tokens.length === 0) return false
  const coveredLength = tokens.reduce((sum, t) => sum + t.sequence.length, 0)
  if (coveredLength !== sequenceLength) return false
  return tokens.every((t) => t.type === 'motif')
}

// ---------------------------------------------------------------------------
// Phase 2: Refine decompositions (port of Decomposer.refine)
// ---------------------------------------------------------------------------

/**
 * Normalize motif boundary ambiguities across all alleles at a locus.
 *
 * For every pair of consecutive tokens, if there are multiple ways to split
 * the same concatenated sequence at the boundary, replace lower-frequency
 * pairs with the highest-frequency pair.
 */
export function refineDecompositions(tokenLists: SequenceToken[][]): SequenceToken[][] {
  // Convert token lists to string lists for the refine algorithm
  const stringLists = tokenLists.map((tokens) => tokens.map((t) => t.sequence))
  // Also track motif indices for reconstruction
  const motifIndexLists = tokenLists.map((tokens) =>
    tokens.map((t) => (t.type === 'motif' ? t.motifIndex : -1))
  )

  // Count motif pairs
  const pairCounter = new Map<string, number>() // "seq1\0seq2" -> count
  const pairStrCounter = new Map<string, number>() // concatenated string -> count
  const pairStrToPairs = new Map<string, Set<string>>() // concat -> set of pair keys

  for (const strs of stringLists) {
    for (let i = 0; i < strs.length - 1; i++) {
      const first = strs[i]
      const second = strs[i + 1]
      const pairKey = `${first}\0${second}`
      const pairStr = first + second

      pairCounter.set(pairKey, (pairCounter.get(pairKey) || 0) + 1)
      pairStrCounter.set(pairStr, (pairStrCounter.get(pairStr) || 0) + 1)

      let pairs = pairStrToPairs.get(pairStr)
      if (!pairs) {
        pairs = new Set()
        pairStrToPairs.set(pairStr, pairs)
      }
      pairs.add(pairKey)
    }
  }

  // Refine: replace low-frequency pairs with high-frequency equivalents
  const refinedTokenLists: SequenceToken[][] = []
  for (let listIdx = 0; listIdx < stringLists.length; listIdx++) {
    const strs = stringLists[listIdx]
    const indices = motifIndexLists[listIdx]

    for (let i = 0; i < strs.length - 1; i++) {
      const first = strs[i]
      const second = strs[i + 1]
      const pairKey = `${first}\0${second}`
      const pairStr = first + second

      const pairCount = pairCounter.get(pairKey) || 0
      if (pairCount === 0) continue

      const totalCount = pairStrCounter.get(pairStr) || 0
      if (pairCount < totalCount) {
        // Find highest-frequency pair with same concatenation
        let maxFreq = 0
        let bestPairKey: string | null = null
        const pairs = pairStrToPairs.get(pairStr)
        if (pairs) {
          for (const pk of pairs) {
            const freq = pairCounter.get(pk) || 0
            if (freq > maxFreq) {
              maxFreq = freq
              bestPairKey = pk
            }
          }
        }
        if (bestPairKey && bestPairKey !== pairKey) {
          const [newFirst, newSecond] = bestPairKey.split('\0')
          strs[i] = newFirst
          strs[i + 1] = newSecond
          // Motif indices stay the same — the motif template hasn't changed,
          // only the boundary position shifted
        }
      }
    }

    // Reconstruct token list from (possibly modified) strings
    const tokens: SequenceToken[] = strs.map((seq, i) => {
      const motifIdx = indices[i]
      if (motifIdx >= 0) {
        return { type: 'motif' as const, motifIndex: motifIdx, sequence: seq }
      }
      return { type: 'interruption' as const, sequence: seq }
    })
    refinedTokenLists.push(tokens)
  }

  return refinedTokenLists
}

// ---------------------------------------------------------------------------
// Main export: decomposeSequence (drop-in replacement)
// ---------------------------------------------------------------------------

/**
 * Decompose an allele sequence into motif tokens and interruptions.
 *
 * Strategy:
 * 1. Sequences > 10kb: fall back to greedy regex only
 * 2. Greedy regex first — if it covers 100% with no interruptions, return directly
 * 3. Otherwise, run the full DP decomposition
 */
export type DecomposeAlgorithm = 'greedy' | 'dp'

export type DecomposeResult = {
  tokens: SequenceToken[]
  algorithm: DecomposeAlgorithm
}

export function decomposeSequence(sequence: string, motifs: string[]): DecomposeResult {
  if (!sequence || motifs.length === 0) return { tokens: [], algorithm: 'greedy' }

  // Performance guard: skip DP for very long sequences
  if (sequence.length > 10000) {
    return { tokens: decomposeGreedy(sequence, motifs), algorithm: 'greedy' }
  }

  // Fast-path: try greedy regex first
  const greedyTokens = decomposeGreedy(sequence, motifs)
  if (isGreedyPerfect(greedyTokens, sequence.length)) {
    return { tokens: greedyTokens, algorithm: 'greedy' }
  }

  // Full DP decomposition
  const segments = decomposeSequenceDP(sequence, motifs)
  if (segments.length === 0) {
    // DP found nothing — fall back to greedy
    return { tokens: greedyTokens, algorithm: 'greedy' }
  }

  return { tokens: classifySegments(segments, motifs), algorithm: 'dp' }
}
