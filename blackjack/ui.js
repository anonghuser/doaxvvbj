function app() {
  let player = '', updatePlayer = chain(filterInput, e => player = e.target.value)
  let dealer = '', updateDealer = chain(filterInput, e => dealer = e.target.value)
  let others = '', updateOthers = chain(filterInput, e => others = e.target.value)
  let soft17hit = false
  
  function select10s(e) {
    e.redraw = false
    const el = e.target    
    const value = el.value
    let [ss, se, sd] = [el.selectionStart, el.selectionEnd, el.selectionDirection]
    const same = ss == se
    if (value[ss] == '0' && value[ss-1] == '1') {
      if (el.lastSelection && el.lastSelection[0] == ss - 1) ss++
      else ss--
    }
    if (same) {
      se = ss
    }
    if (value[se] == '0' && value[se-1] == '1') {
      if (el.lastSelection && el.lastSelection[1] == se + 1) se--
      else se++
    }
    el.setSelectionRange(ss, se, sd)
    el.lastSelection = [el.selectionStart, el.selectionEnd, el.selectionDirection]
  }

  function filterInput(e) {
    const el = e.target    
    let value = el.value
    let [ss, se, sd] = [el.selectionStart, el.selectionEnd, el.selectionDirection]
    const same = ss == se

    // the cursor did not move, assume "del" key
    const del = el.lastSelection && el.lastSelection[0] == ss && el.lastSelection[1] == ss
    // the cursor moved back 1 space, assume "backspace" key
    const bsp = el.lastSelection && el.lastSelection[0] == ss + 1 && el.lastSelection[1] == ss + 1      
    if (same && !del && !bsp) {
      // check if typed a partial 10 and expand it automatically
      const partial = value[ss-1] == '1' && value[ss] != '0' || value[ss-1] == '0' && value[ss-2] != '1'      
      if (partial) value = value.slice(0, ss-1) + '10' + value.slice(ss)
    }

    const cards = value.toUpperCase().match(/10|[2-9JQKA]/g) || []
    value = cards.join(' ')

    const delta = value.length - el.value.length
    se += delta
    if (se < 0) se = 0
    if (same) {
      if (delta < 0 && del) se = ss
      if (delta > 0 && bsp) se = ss
      ss = se
    }
    el.value = value
    el.setSelectionRange(ss, se, sd)
    el.dispatchEvent(new Event('selectionchange'))
    el.lastValue = el.value
  }

  function chain(...handlers) {
    return function (...args) {
      handlers.forEach(f => f.call(this, ...args))
    }
  }

  function value(hand) {
    return binValue(binFromString(hand))[0]
  }
  function bust(hand, others, soft17hit) {
    return binValueChance(binFromString(hand), binFromString(others), soft17hit)
  }
  function dealerOdds(hand, player, others, soft17hit) {
    if (exceededFromString(hand + player + others)) {
      return [NaN, NaN, NaN, NaN]
    }
    const [binHand, binPlayer, binOthers] = [hand, player, others].map(binFromString)
    return binDealerOdds(binHand, binPlayer, binOthers, soft17hit)
  }
  
  return {
    view: () => [
      '12345678901234567890123456789012345678901234567890123456789012345678901234567890\n',
      "    '  10|    '  20|    '  30|    '  40|    '  50|    '  60|    '  70|    '  80|\n",
      m('label', 'dealer: ', m('input', {
        value: dealer,
        oninput: updateDealer,
        onselectionchange: select10s,
      })),
      '        ',
      'value: ', value(dealer),
      dealerOdds(dealer, player, others, soft17hit).map(
        (v,i) => '\n        '+[' bust: ', ' lose: ', ' draw: ', '  win: '][i] + +(v*100).toFixed(3)+'%'
      ).join(' '),

      m('label', 'player: ', m('input', {
        value: player,
        oninput: updatePlayer,
        onselectionchange: select10s,
      })),
      '        ',
      'value: ', value(player),
      '\n        ',
      //'bust on hit: ', bustChance1(player, dealer + others),
      '\n        ',
      'bust by 17: ', bust(player, dealer + others),
      m('label', 'others: ', m('textarea', {
        rows: 3,
        value: others,
        oninput: updateOthers,
        onselectionchange: select10s,
      })),
      exceededFromString(player + dealer + others) && m('',{style:'color:red'}, '\nToo many ', exceededFromString(player + dealer + others))
    ],
  }
}
m.mount(document.body, app)

function selectionChangeEventFix(e) {
  if (e.isTrusted) {
    const el = document.activeElement
    if (!el || !("selectionStart" in el)) return
    if (el == e.target) {
      // seems like the browser supports properly targeted selectionchange events already
      console.log('selectionchange events already supported, disabling fix')
      document.removeEventListener('selectionchange', selectionChangeEventFix)
      return
    }
    el.dispatchEvent(new Event('selectionchange'))
  }
}
document.addEventListener('selectionchange', selectionChangeEventFix) 
