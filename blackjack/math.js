"use strict";
const deck = 'A 2 3 4 5 6 7 8 9 10 J Q K'.split(' ')
const deckCount = 2
const binAlign = true
const binMultiplier = binAlign 
  ? 2 ** Math.ceil(Math.log2(deckCount * 4 + 1)) 
  : deckCount * 4 + 1

const binDeck = binFromString(deck) * 4 * deckCount

if (binDeck > Number.MAX_SAFE_INTEGER) {
  throw new RangeError("Too many decks, JS's 53 bit ints are insufficient.")
}

// console.log(countAll(binDeck) == deck.length * 4 * deckCount)
// console.log(count(binDeck, 0) == 4 * deckCount)
// console.log(count(binDeck, 8) == 4 * deckCount)
// console.log(count(binDeck, 9) == 4 * 4 * deckCount)
// console.log(value(binDeck)[0] == 85 * 4 * deckCount)
// console.log(value(binFromString('A K'))[0] == 21)
// console.log(value(binFromString('A K K'))[0] == 21)
// console.log(bustChance(0).toFixed(5) == 0.28258)

function exceededFromString(string) {
  return (String(string)
      .toUpperCase()
      .match(/10|[2-9JQKA]/g) || []
    ).find((v, i, a) => a.filter(v2 => v2 == v).length > deckCount * 4)
}

function binFromString(string) {
  return (String(string)
      .toUpperCase()
      .replace(/[JQK]/g, '10')
      .match(/10|[2-9JQKA]/g) || []
    ).map(card => binMultiplier ** deck.indexOf(card))
    .reduce((a, b) => a + b, 0)
}

function binCountAll(binCards) {
  let r = Math.trunc(binCards / binMultiplier ** 9)
  binCards = binCards % binMultiplier ** 9
  while (binCards) {
    r += binCards % binMultiplier
    binCards = Math.trunc(binCards / binMultiplier)
  }
  return r
}

function binCount(binCards, idx) {
  let r = Math.trunc(binCards / binMultiplier ** idx)
  return  idx < 9 ? r % binMultiplier : r
}

function binValue(binCards) {
  let a = binCards % binMultiplier
  let c = Math.trunc(binCards / binMultiplier ** 9)
  let r = Math.trunc(binCards / binMultiplier ** 9) * 10
  binCards = binCards % binMultiplier ** 9
  let v = 1
  while (binCards) {
    c += (binCards % binMultiplier)
    r += (binCards % binMultiplier) * v
    binCards = Math.trunc(binCards / binMultiplier)
    v++
  }
  if (c == 2 && r == 11 && a) r += .1
  return (r < 12 && a) ? [r + 10, true] : [r, false]
}

function binValueChance(binHand, binOthers = 0, soft17hit = false, target = 22, maxDepth = 10000, cache = {}, depth = 0) {
  const [v, soft] = binValue(binHand)
  if (v >= target) return 1
  if (v > 17) return 0
  if (v == 17 && (!soft17hit || !soft)) return 0
  if (depth == maxDepth) return 0
  if (cache[binHand]) return cache[binHand]
  let result = 0
  let all = 0
  let binCard = 1
  let remain = binDeck - binHand - binOthers
  for (let idx = 0; idx < 9; idx++) {
    const sel = remain % binMultiplier
    remain = Math.trunc(remain / binMultiplier)
    all += sel
    if (sel) result += sel * binValueChance(binHand + binCard, binOthers, soft17hit, target, maxDepth, cache, depth+1)
    binCard *= binMultiplier
  }
  all += remain
  if (remain) result += remain * binValueChance(binHand + binCard, binOthers, soft17hit, target, maxDepth, cache, depth+1)
  return cache[binHand] = result / all
}

function binDealerOdds(binHand, binPlayer, binOthers, soft17hit) {
  const valPlayer = binValue(binPlayer)[0]
  const bust = binValueChance(binHand, binPlayer + binOthers, soft17hit, 22)
  const win = (valPlayer < 22 ? binValueChance(binHand, binPlayer + binOthers, soft17hit, valPlayer + .01) : 1) - bust
  const loss = valPlayer < 22 ? 1 - binValueChance(binHand, binPlayer + binOthers, soft17hit, valPlayer) : 0
  const draw = 1 - win - bust - loss
  return [bust, bust + loss, draw, win]
}

