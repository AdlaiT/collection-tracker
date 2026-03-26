<includeonly><script type="application/javascript">
'use strict'

// Widget:CollectionTrackerJS

void (() => {
  const fixedHash = '<!--{$data|default:""|regex_replace:"/[^A-Za-z0-9\-\.\+\/_]/":""}-->'
  let lastHash = ''
  let includeCollabInExpandedStatistics = true
  let currentSort = 'default'
  let nextDefaultSortOrder = 0
  const sortCollator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  })
  const expandedStatisticsStaticIcons = {
    race: {
      human: 'human',
      erune: 'erune',
      draph: 'draph',
      harvin: 'harvin',
      primal: 'primal',
      other: 'other',
    },
  }
  const expandedStatisticsConfig = {
    element: [],
    rarity: [
      { key: 'ssr', label: 'SSR', icon: 'ssr' },
      { key: 'sr', label: 'SR', icon: 'sr' },
      { key: 'r', label: 'R', icon: 'r' },
    ],
    race: [],
    gender: [
      { key: 'male', label: 'Male', icon: 'male', values: ['m', 'mf', 'mo'] },
      { key: 'female', label: 'Female', icon: 'female', values: ['f', 'mf', 'fo'] },
      { key: 'other', label: 'Other', icon: 'other gender', values: ['o', 'mo', 'fo'] },
    ],
    style: [],
    weapon: [],
    series: [],
    bonus: [],
  }

  // Save valid obtain values for filtering
  /** @type {string[]} */
  const knownObtains = Array.from(
    document.querySelectorAll('#tracker-filter-obtain .items > label'),
    (label) => label.dataset.value,
  ).filter((label) => label && label !== 'other')

  if (document.querySelectorAll('.tracker-wrap').length > 0) {
    expandedStatisticsConfig.element = getExpandedStatisticsFilterConfig('element')
    expandedStatisticsConfig.race = getExpandedStatisticsFilterConfig('race')
    expandedStatisticsConfig.style = getExpandedStatisticsFilterConfig('style')
    expandedStatisticsConfig.weapon = getExpandedStatisticsFilterConfig('weapon')
    expandedStatisticsConfig.series = getExpandedStatisticsFilterConfig('series')
    expandedStatisticsConfig.bonus = getExpandedStatisticsFilterConfig('bonus')

    window.addEventListener('hashchange', () => {
      if (location.hash !== lastHash) {
        applyHash()
        applyFilters()
      }
    }, false)

    console.time('moving')
    for (
      const element of [
        'fire',
        'water',
        'earth',
        'wind',
        'light',
        'dark',
        'any',
      ]
    ) {
      for (const rarity of ['ssr', 'sr', 'r']) {
        moveItems('c', element, rarity)
        moveItems('s', element, rarity)
      }
    }

    console.timeEnd('moving')

    // Clicking a tracker item
    addEventForChild(document, 'click', '.tracker-item', (event, item) => {
      if (event.button !== 0) return // Do nothing unless it's a left-mouse-button click
      event.preventDefault()
      if (event.target.classList.contains('tracker-uncap-star')) {
        return
      }
      console.time('Click Item')
      evolve(item, true)
      updateOwnedCounts()
      refreshExpandedStatisticsFromView()
      updateHash()
      console.timeEnd('Click Item')
    })

    // Clicking the star of a tracker item
    addEventForChild(document, 'click', '.tracker-uncap-star', (event, star) => {
      event.preventDefault()
      const item = star.closest('.tracker-item')
      let level = [...star.parentElement.children].indexOf(star) + 2
      if (
        star.classList.contains('selected') &&
        ((star.nextElementSibling == null) ||
          !star.nextElementSibling.classList.contains('selected'))
      ) {
        level -= 1
      }
      evolve(item, level)
      updateOwnedCounts()
      refreshExpandedStatisticsFromView()
    })

    addEventForChild(document, 'click', '.mw-ui-button-group > label:not(.mw-ui-disabled)', (_event, label) => {
      console.time('Click Label')
      const group = label.parentElement
      const all = group.querySelector('label[data-value="*"]')

      if (group.id === 'tracker-sort-items') {
        for (const sibling of group.querySelectorAll('label')) {
          sibling.classList.remove('mw-ui-progressive')
        }
        label.classList.add('mw-ui-progressive')
        currentSort = label.dataset.value || 'default'
        setTimeout(() => {
          console.time('Click Label Update')
          applyFilters()
          console.timeEnd('Click Label Update')
        }, 0)
        console.timeEnd('Click Label')
        return
      }

      if (label === all) {
        if (!all.classList.contains('mw-ui-progressive')) {
          for (const sibling of group.querySelectorAll('label')) {
            sibling.classList.remove('mw-ui-progressive')
          }
          all.classList.add('mw-ui-progressive')
        }
      } else if (group.childElementCount === 3) {
        for (const sibling of group.querySelectorAll('label')) {
          sibling.classList.remove('mw-ui-progressive')
        }
        label.classList.add('mw-ui-progressive')
      } else if (all) {
        all.classList.remove('mw-ui-progressive')
        label.classList.toggle('mw-ui-progressive')
        if (group.querySelectorAll('.mw-ui-progressive').length < 1) {
          all.classList.add('mw-ui-progressive')
        }
      }

      if (!label.id.startsWith('tracker-local-')) {
        setTimeout(() => {
          console.time('Click Label Update')
          applyFilters()
          updateHash()
          console.timeEnd('Click Label Update')
        }, 0)
      }

      console.timeEnd('Click Label')
    })

    addEventForChild(document, 'click', '#tracker-character-uncap, #tracker-summon-uncap', () => {
      applyUncapVisibility()
      updateHash()
    })
    addEventForChild(document, 'change', '#tracker-search', () => {
      applyFilters()
    })
    addEventForChild(document, 'keyup', '#tracker-search', () => {
      applyFilters()
    })
    addEventForChild(document, 'change', '#tracker-expanded-statistics', () => {
      applyExpandedStatisticsVisibility()
      refreshExpandedStatisticsFromView()
    })
    addEventForChild(document, 'click', '#tracker-expanded-statistics-collab .items > label', (_event, label) => {
      includeCollabInExpandedStatistics = label.dataset.value !== 'false'
      refreshExpandedStatisticsFromView()
    })

    addEventForChild(document, 'click', '#tracker-local-save', () => {
      updateHash()
      localStorage.collectionTrackerState = location.hash
    })
    addEventForChild(document, 'click', '#tracker-local-load', () => {
      location.hash = localStorage.collectionTrackerState
    })

    applyHash()
    applyFilters()
    updateOwnedCounts()
  }

  /**
   * @param {HTMLElement} parent
   * @param {string} eventName
   * @param {string} childSelector
   * @param {(event: Event, matchingChild: HTMLElement) => void} callback
   */
  function addEventForChild(parent, eventName, childSelector, callback) {
    parent.addEventListener(eventName, (event) => {
      const clickedElement = event.target
      const matchingChild = clickedElement.closest(childSelector)
      if (matchingChild) {
        callback(event, matchingChild)
      }
    })
  }
  /**
   * @param {string|number} n
   */
  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n)
  }

  /**
   * @param {HTMLElement} node
   * @param {boolean} visible
   */
  function toggleVisible(node, visible) {
    node.style.display = visible ? '' : 'none'
  }

  /**
   * @param {Uint8Array} bytes
   * @return {string}
   */
  function Uint8ArrayToBase64(bytes) {
    let binary = ''
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const result = btoa(binary)
      .replace('=', '') // Remove any trailing '='s
      .replace('+', '-') // 62nd char of encoding
      .replace('/', '_') // 63rd char of encoding
    if (result === 'AAAA') {
      return ''
    }
    return result
  }

  /**
   * @param {string} text
   * @return {UInt8Array}
   */
  function Base64ToUint8Array(text) {
    let s = text
      .replace('_', '/') // 63rd char of encoding
      .replace('-', '+') // 62nd char of encoding
    const pl = s.length % 4
    if (pl > 0) {
      s += '='.repeat(4 - pl) // Restore any trailing '='s
    }

    const binary = atob(s)
    const len = binary.length
    const result = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      result[i] = binary.charCodeAt(i)
    }
    return result
  }

  function updateHash(newHash = exportToHash()) {
    lastHash = newHash
    if (('' + newHash).charAt(0) !== '#') {
      newHash = '#' + newHash
    }
    history.replaceState('', '', newHash)
  }

  function getHash() {
    lastHash = location.hash
    return fixedHash ? fixedHash : lastHash.slice(1)
  }

  /**
   * Will call applyUncapVisibility as part of restoring options
   */
  function applyHash(hash = getHash()) {
    // format: Options.SSR Characters.SR Characters.R Characters.SSR Summons.SR Summons.R Summons
    // - Options is a base64 encoded json object
    // - Character/Summons are base64 encoded sets of bits, where each character is 3 bits offset by the counter in its ID

    // Backward compatibility with URL using semicolon (;) as separator
    const separator = hash.includes(';') ? ';' : '.'
    const parts = hash.split(separator)

    const strings = {
      'c': { 2: parts[3], 3: parts[2], 4: parts[1] },
      's': { 2: parts[6], 3: parts[5], 4: parts[4] },
    }

    // Reset current options
    for (const checkbox of document.querySelectorAll('.tracker-filter-options input[type="checkbox"]')) {
      checkbox.checked = false
    }
    for (const label of document.querySelectorAll('.tracker-filter-group label.mw-ui-progressive')) {
      label.classList.remove('mw-ui-progressive')
    }
    for (const label of document.querySelectorAll('.tracker-filter-group label[data-value="*"]')) {
      label.classList.add('mw-ui-progressive')
    }
    for (const label of document.querySelectorAll('#tracker-sort-items label.mw-ui-progressive')) {
      label.classList.remove('mw-ui-progressive')
    }
    const defaultSort = document.querySelector('#tracker-sort-items label[data-value="default"]')
    if (defaultSort != null) {
      defaultSort.classList.add('mw-ui-progressive')
    }
    currentSort = 'default'

    // load options
    const reOptions = /[g-z][0-9a-f]+/ig
    const options = parts[0].match(reOptions)
    if (options != null) {
      for (const text of options) {
        // const bits = parseInt(text.slice(1), 16)
        const bits = BigInt('0x' + text.slice(1))
        const optionSelector = `div[data-option="${text[0]}"]`

        const option = document.querySelector(optionSelector)
        if (option == null) {
          continue
        }

        const optionBits = option.querySelectorAll('[data-bit]')
        if (optionBits.length <= 0) {
          continue
        }

        for (const label of option.querySelectorAll('label')) {
          label.classList.remove('mw-ui-progressive')
        }
        for (const optionBit of optionBits) {
          // const selected = ((1 << optionBit.dataset.bit) & bits) > 0
          const bitIndex = BigInt(optionBit.dataset.bit)
          const selected = (bits & (1n << bitIndex)) !== 0n
          if (optionBit.tagName.toLowerCase() === 'input') {
            optionBit.checked = selected
          } else if (selected) {
            optionBit.classList.add('mw-ui-progressive')
          }
        }

        // verify we actually selected something
        if (option.querySelectorAll('.mw-ui-progressive').length > 0) {
          continue
        }

        // we didn't so select All label
        const all = option.querySelector('label[data-value="*"]')
        if (all != null) {
          all.classList.add('mw-ui-progressive')
        }
      }
    }

    applyUncapVisibility()

    // reset items
    for (const item of document.querySelectorAll('.tracker-item')) {
      item.dataset.evo = '0'
      item.dataset.owned = 'false'
      evolve(item, false)
    }

    // load items
    for (const type of ['c', 's']) {
      for (const rarity of [2, 3, 4]) {
        const str = strings[type][rarity] || ''
        if (str.length < 1) {
          continue
        }

        const buffer = Base64ToUint8Array(str)
        const len = buffer.length / 3
        for (let i = 0; i < len; i++) {
          const evos = 0 |
            (buffer[i * 3] << 0) |
            (buffer[i * 3 + 1] << 8) |
            (buffer[i * 3 + 2] << 16)

          for (let j = 0; j < 8; j++) {
            const evo = (evos >> (j * 3)) & 0x07
            if (evo <= 0) {
              continue
            }
            const short_id = '' + rarity + ('000' + (i * 8 + j)).slice(-3)
            const itemSelector = `.tracker-item[data-type="${type}"][data-short-id="${short_id}"]`
            for (const item of document.querySelectorAll(itemSelector)) {
              evolve(item, evo, true)
            }
          }
        }
      }
    }

    updateOwnedCounts()
  }

  function updateOwnedCounts() {
    const counts = { c: 0, s: 0 }
    for (const item of document.querySelectorAll('.tracker-item[data-owned="true"]')) {
      if (item.dataset.type === 'c' || item.dataset.type === 's') {
        counts[item.dataset.type] += 1
      }
    }

    const characterValue = document.querySelector('#tracker-owned-character-value')
    if (characterValue != null) {
      characterValue.textContent = counts.c.toString(10)
    }

    const summonValue = document.querySelector('#tracker-owned-summon-value')
    if (summonValue != null) {
      summonValue.textContent = counts.s.toString(10)
    }
  }

  function createEmptyExpandedStatistics() {
    return {
      element: Object.fromEntries(
        expandedStatisticsConfig.element.map(({ key }) => [key, { owned: 0, total: 0 }]),
      ),
      rarity: Object.fromEntries(
        expandedStatisticsConfig.rarity.map(({ key }) => [key, { owned: 0, total: 0 }]),
      ),
      race: Object.fromEntries(
        expandedStatisticsConfig.race.map(({ key }) => [key, { owned: 0, total: 0 }]),
      ),
      gender: Object.fromEntries(
        expandedStatisticsConfig.gender.map(({ key }) => [key, { owned: 0, total: 0 }]),
      ),
      style: Object.fromEntries(
        expandedStatisticsConfig.style.map(({ key }) => [key, { owned: 0, total: 0 }]),
      ),
      weapon: Object.fromEntries(
        expandedStatisticsConfig.weapon.map(({ key }) => [key, { owned: 0, total: 0 }]),
      ),
      characterSeries: Object.fromEntries(
        expandedStatisticsConfig.series.map(({ key }) => [key, { owned: 0, total: 0 }]),
      ),
      summonSeries: Object.fromEntries(
        expandedStatisticsConfig.series.map(({ key }) => [key, { owned: 0, total: 0 }]),
      ),
      bonus: Object.fromEntries(
        expandedStatisticsConfig.bonus.map(({ key }) => [key, { owned: 0, total: 0 }]),
      ),
    }
  }

  /**
   * @param {string} name
   * @return {{ key: string, label: string, icon: string | null, values: string[] }[]}
   */
  function getExpandedStatisticsFilterConfig(name) {
    return Array.from(
      document.querySelectorAll(`#tracker-filter-${name} .items > label:not([data-value="*"])`),
      (label) => {
        let icon = label.querySelector('[data-icon]')?.dataset.icon || null
        const text = label.textContent.trim() || label.dataset.value
        if (name === 'race') {
          icon = expandedStatisticsStaticIcons.race[label.dataset.value] || null
        }
        if (name === 'weapon') {
          icon = `artifact ${label.dataset.value}`
        }
        return {
          key: label.dataset.value,
          label: text,
          icon,
          values: label.dataset.value.split(';'),
        }
      },
    )
  }

  function applyExpandedStatisticsVisibility() {
    const panel = document.querySelector('#tracker-expanded-statistics-panel')
    if (panel == null) {
      return
    }

    const toggle = document.querySelector('#tracker-expanded-statistics')
    panel.style.display = toggle != null && toggle.checked ? '' : 'none'
  }

  /**
   * @param {ReturnType<typeof createEmptyExpandedStatistics>} stats
   */
  function renderExpandedStatistics(stats) {
    const panel = document.querySelector('#tracker-expanded-statistics-panel')
    if (panel == null) {
      return
    }

    applyExpandedStatisticsVisibility()

    const toggle = document.querySelector('#tracker-expanded-statistics')
    if (toggle == null || !toggle.checked) {
      return
    }

    panel.innerHTML = [
      renderExpandedStatisticsCollabToggle(),
      renderExpandedStatisticsSection('Element', expandedStatisticsConfig.element, stats.element),
      renderExpandedStatisticsSection('Rarity', expandedStatisticsConfig.rarity, stats.rarity),
      renderExpandedStatisticsSection('Race', expandedStatisticsConfig.race, stats.race),
      renderExpandedStatisticsSection('Gender', expandedStatisticsConfig.gender, stats.gender),
      renderExpandedStatisticsSection('Style', expandedStatisticsConfig.style, stats.style),
      renderExpandedStatisticsSection('Specialty', expandedStatisticsConfig.weapon, stats.weapon),
      renderExpandedStatisticsSection('Character Series', expandedStatisticsConfig.series, stats.characterSeries, true, getHiddenSeriesKeys()),
      renderExpandedStatisticsSection('Summon Series', expandedStatisticsConfig.series, stats.summonSeries, true, getHiddenSeriesKeys()),
      renderExpandedStatisticsSection('Bonus', expandedStatisticsConfig.bonus, stats.bonus, true),
    ].join('')
  }

  function refreshExpandedStatisticsFromView() {
    const stats = createEmptyExpandedStatistics()
    for (const item of document.querySelectorAll('.tracker-item')) {
      if (item.style.display === 'none') {
        continue
      }

      accumulateExpandedStatistics(stats, item)
    }
    renderExpandedStatistics(stats)
  }

  /**
   * @param {ReturnType<typeof createEmptyExpandedStatistics>} stats
   * @param {HTMLElement} item
   */
  function accumulateExpandedStatistics(stats, item) {
    const isCharacter = item.dataset.type === 'c'
    const isSummon = item.dataset.type === 's'

    if (isCharacter && !includeCollabInExpandedStatistics && isCollabCharacter(item)) {
      return
    }

    if (isCharacter && item.dataset.rarity in stats.rarity) {
      stats.rarity[item.dataset.rarity].total += 1
      if (item.dataset.owned === 'true') {
        stats.rarity[item.dataset.rarity].owned += 1
      }
    }

    if (isCharacter) {
      accumulateExpandedStatisticsGroup(stats.element, expandedStatisticsConfig.element, item.dataset.element, item.dataset.owned)

      const races = item.dataset.race.split(',')
      for (const race of races) {
        if (!(race in stats.race)) {
          continue
        }

        stats.race[race].total += 1
        if (item.dataset.owned === 'true') {
          stats.race[race].owned += 1
        }
      }

      for (const bucket of expandedStatisticsConfig.gender) {
        if (!bucket.values.includes(item.dataset.gender)) {
          continue
        }

        stats.gender[bucket.key].total += 1
        if (item.dataset.owned === 'true') {
          stats.gender[bucket.key].owned += 1
        }
      }

      accumulateExpandedStatisticsGroup(stats.style, expandedStatisticsConfig.style, item.dataset.style, item.dataset.owned)
      accumulateExpandedStatisticsGroup(stats.weapon, expandedStatisticsConfig.weapon, item.dataset.weapon, item.dataset.owned)
      accumulateExpandedStatisticsGroup(stats.bonus, expandedStatisticsConfig.bonus, item.dataset.bonus, item.dataset.owned)
      accumulateExpandedStatisticsGroup(stats.characterSeries, expandedStatisticsConfig.series, item.dataset.series, item.dataset.owned)
    } else if (isSummon) {
      accumulateExpandedStatisticsGroup(stats.summonSeries, expandedStatisticsConfig.series, item.dataset.series, item.dataset.owned)
    }
  }

  /**
   * @param {Record<string, { owned: number, total: number }>} stats
   * @param {{ key: string, values: string[] }[]} config
   * @param {string} field
   * @param {string} owned
   */
  function accumulateExpandedStatisticsGroup(stats, config, field, owned) {
    const values = field.split(',')
    for (const bucket of config) {
      if (!bucket.values.some((value) => values.includes(value))) {
        continue
      }

      stats[bucket.key].total += 1
      if (owned === 'true') {
        stats[bucket.key].owned += 1
      }
    }
  }

  /**
   * @param {HTMLElement} item
   * @return {boolean}
   */
  function isCollabCharacter(item) {
    return item.dataset.obtain.split(/[;,]/).includes('collab')
  }

  /**
   * @return {string}
   */
  function renderExpandedStatisticsCollabToggle() {
    const yesClass = includeCollabInExpandedStatistics ? ' mw-ui-progressive' : ''
    const noClass = includeCollabInExpandedStatistics ? '' : ' mw-ui-progressive'
    return `<div class="mw-ui-button-group tracker-filter-group" id="tracker-expanded-statistics-collab" style="margin-right: 12px; margin-bottom: 8px; vertical-align: top;"><label class="mw-ui-button mw-ui-disabled label">Include Collab</label><div class="items" style="display: inline-flex;"><label class="mw-ui-button${yesClass}" data-value="true">Yes</label><label class="mw-ui-button${noClass}" data-value="false">No</label></div></div>`
  }

  /**
   * @return {string[]}
   */
  function getHiddenSeriesKeys() {
    return includeCollabInExpandedStatistics ? [] : ['collab;tie-in']
  }

  /**
   * @param {string} title
   * @param {{ key: string, label: string, icon: string | null }[]} config
   * @param {Record<string, { owned: number, total: number }>} values
   * @return {string}
   */
  function renderExpandedStatisticsSection(title, config, values, hideEmpty = false, hiddenKeys = []) {
    const rows = config
      .filter(({ key }) => !hiddenKeys.includes(key))
      .filter(({ key }) => !hideEmpty || values[key].total > 0)
      .map(({ key, label, icon }) => {
        const entry = values[key]
        const labelMarkup = icon != null
          ? `<span class="icon-template icon-img mw-no-invert" data-icon="${icon}" title="${label}" style="height: 30px; width: 30px; flex: 0 0 30px;"></span>`
          : `<span title="${label}" style="display: inline-flex; align-items: center; justify-content: center; min-height: 30px; padding: 0 8px; border: 1px solid #54595d; box-sizing: border-box; white-space: nowrap;">${label}</span>`
        return `<div style="display: flex; align-items: center; gap: 6px; min-width: 0;">${labelMarkup}<span style="white-space: nowrap;">${entry.owned}/${entry.total}</span></div>`
      }).join('')

    if (rows === '') {
      return ''
    }

    return `<div class="mw-ui-button-group tracker-filter-group" style="margin-right: 12px; margin-bottom: 8px; vertical-align: top;"><label class="mw-ui-button mw-ui-disabled label">${title}</label><div class="mw-ui-button-group items" style="display: inline-flex; flex-wrap: wrap; gap: 6px; padding: 0 4px;">${rows}</div></div>`
  }

  function exportToHash() {
    // for format see readHash
    const strings = {
      'c': { 2: '', 3: '', 4: '' },
      's': { 2: '', 3: '', 4: '' },
    }
    /** @type {Record<string, Record<number, Record<number, number>>>} */
    const selected = {
      'c': { 2: {}, 3: {}, 4: {} },
      's': { 2: {}, 3: {}, 4: {} },
    }

    // store which items have been selected
    for (const item of document.querySelectorAll('.tracker-item.selected')) {
      const short_id = item.dataset.shortId
      if (short_id.length === 4) {
        const type = item.dataset.type
        const rarity = parseInt(short_id[0], 10)
        if ((rarity < 2) || (rarity > 4)) {
          return
        }
        const index = parseInt(short_id.substr(1), 10)
        selected[type][rarity][index] = parseInt(item.dataset.evo, 10)
      }
    }

    // convert to a bit array
    for (const type of ['c', 's']) {
      for (const rarity of [2, 3, 4]) {
        let high_id = 0
        const obj = selected[type][rarity]
        for (const index in obj) {
          high_id = Math.max(high_id, index)
        }

        // Group 8 items with 3 bits each
        const parts = Math.floor(high_id / 8) + 1
        const size = parts * 3
        const buffer = new Uint8Array(size)

        for (let i = 0; i <= Math.floor(high_id / 8); i++) {
          let evos = 0x000000
          for (let j = 0; j < 8; j++) {
            let evo = obj[i * 8 + j]
            if (evo == undefined) {
              evo = 0
            }
            evos |= evo << (j * 3)
          }
          buffer[i * 3] = (evos >> 0) & 0xFF
          buffer[i * 3 + 1] = (evos >> 8) & 0xFF
          buffer[i * 3 + 2] = (evos >> 16) & 0xFF
        }
        strings[type][rarity] += Uint8ArrayToBase64(buffer)
      }
    }

    // Options are stored as hex encoded bit array
    let options = ''
    for (const div of document.querySelectorAll('div[data-option]')) {
      const active = div.querySelectorAll('[data-bit].mw-ui-progressive, input[data-bit]:checked')
      if (active.length > 0) {
        // let option = 0
        // for (const bit of active) {
        //   option |= 1 << bit.dataset.bit
        // }
        let option = 0n
        for (const bit of active) {
          option |= 1n << BigInt(bit.dataset.bit)
        }
        options += div.dataset.option + option.toString(16)
      }
    }

    return [
      options,
      strings.c[4],
      strings.c[3],
      strings.c[2],
      strings.s[4],
      strings.s[3],
      strings.s[2],
    ].join('.')
  }

  /**
   * @param {HTMLElement} node
   * @param {number|boolean} levels
   * @param {boolean=} restore true when restoring saved data to prevent data loss
   */
  function evolve(node, levels, restore) {
    const toggle = !restore &&
      node.parentElement.classList.contains('tracker-hide-uncap')
    const evoMax = parseInt(node.dataset.evoMax, 10)

    let evo = parseInt(node.dataset.evo, 10)
    if (levels === false) {
      evo = 0
    } else if (toggle) {
      evo = evo > 0 ? 0 : 1
    } else if (levels === true) {
      evo += 1
      if (evo > Math.max(evoMax + 1, 1)) {
        evo = 0
      }
    } else {
      evo = levels
    }

    node.dataset.evo = evo.toString(10)
    node.dataset.owned = evo > 0 ? 'true' : 'false'
    node.classList.toggle('selected', evo > 0)
    evo -= 1
    for (const star of node.querySelectorAll('.tracker-uncap-star')) {
      star.classList.toggle('selected', evo > 0)
      evo -= 1
    }
  }

  function applyUncapVisibility() {
    for (const type of ['character', 'summon']) {
      const cb = document.querySelector(`#tracker-${type}-uncap`)
      for (const box of document.querySelectorAll(`.tracker-box[id$="-${type}s"]`)) {
        box.classList.toggle('tracker-hide-uncap', !cb.checked)
      }
    }
  }

  /**
   * @param {string} type
   * @param {string} element
   * @param {string} rarity
   */
  function moveItems(type, element, rarity) {
    const divSelector = `#tracker-${element}-${(type === 'c' ? 'characters' : 'summons')}`
    const tracker = document.querySelector(divSelector)
    if (tracker == null) {
      return
    }
    const selector = `.tracker-item[data-type="${type}"][data-element="${element}"][data-rarity="${rarity}"]`

    for (const node of document.querySelectorAll(selector)) {
      node.dataset.owned = 'false'
      node.dataset.evo = '0'
      node.dataset.sortDefault = nextDefaultSortOrder.toString(10)
      nextDefaultSortOrder += 1
      if (isNumeric(node.dataset.baseevo) && isNumeric(node.dataset.maxevo)) {
        node.dataset.evoBase = parseInt(node.dataset.baseevo, 10).toString(10)
        node.dataset.evoMax = parseInt(node.dataset.maxevo, 10).toString(10)
      } else {
        node.dataset.evoBase = '0'
        node.dataset.evoMax = '0'
      }
      tracker.appendChild(node)

      const evoBase = parseInt(node.dataset.evoBase)
      const evoMax = parseInt(node.dataset.evoMax)

      const uncapBrown = '<div class="tracker-uncap-star tracker-uncap-base"></div>'
        .repeat(evoBase)
      const uncapBlue = '<div class="tracker-uncap-star tracker-uncap-max"></div>'
        .repeat(evoMax - evoBase)
      const uncap = `<div class="tracker-uncap">${uncapBrown}${uncapBlue}</div>`
      node.insertAdjacentHTML('beforeend', uncap)
    }
  }

  /**
   * @param {string} name
   */
  function getFilter(name) {
    /** @type {string[]} */
    const result = []
    const selector = `#tracker-filter-${name} label.mw-ui-progressive`
    for (const filter of document.querySelectorAll(selector)) {
      if (filter.dataset.value === '*') {
        return true
      }

      result.push(...filter.dataset.value.split(';'))
    }
    return result
  }

  function applyFilters() {
    console.time('updating')

    const rarity = getFilter('rarity')
    const type = getFilter('type')
    const element = getFilter('element')
    const obtain = getFilter('obtain')
    const style = getFilter('style')
    const race = getFilter('race')
    const gender = getFilter('gender')
    const maxevo = getFilter('maxevo')
    const series = getFilter('series')
    const bonus = getFilter('bonus')
    const owned = getFilter('owned')
    const weapon = getFilter('weapon')
    const released = getFilter('released')
    /** @type {string} */
    const search = document.querySelector('#tracker-search').value
    /** @type {RegExp} */
    let reSearch
    const expandedStatistics = createEmptyExpandedStatistics()
    try {
      reSearch = new RegExp('.*' + search + '.*', 'i')
    } catch {
      reSearch = new RegExp(
        `.*${search.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')}.*`,
        'i',
      )
    }

    for (const item of document.querySelectorAll('.tracker-item')) {
      const visible = shouldBeVisible(item)
      toggleVisible(item, visible)
      if (visible) {
        accumulateExpandedStatistics(expandedStatistics, item)
      }
    }

    applySort()

    for (const box of document.querySelectorAll('.tracker-box')) {
      toggleVisible(box, Array.from(box.children).some((child) => child.style.display !== 'none'))
    }

    renderExpandedStatistics(expandedStatistics)

    console.timeEnd('updating')

    /** @param {HTMLElement} item */
    function shouldBeVisible(item) {
      if (rarity !== true && !rarity.includes(item.dataset.rarity)) {
        return false
      }
      if (type !== true && !type.includes(item.dataset.type)) {
        return false
      }
      if (element !== true && !element.includes(item.dataset.element)) {
        return false
      }
      if (style !== true && !style.includes(item.dataset.style)) {
        return false
      }
      if (maxevo !== true && !maxevo.includes(item.dataset.maxevo)) {
        return false
      }
      if (released !== true && !released.includes(item.dataset.released)) {
        return false
      }
      if (owned !== true && !owned.includes(item.dataset.owned)) {
        return false
      }
      if (
        gender !== true &&
        !gender.some((gender) => item.dataset.gender.includes(gender))
      ) {
        return false
      }
      if (obtain !== true) {
        if (obtain === 'other') {
          const list = item.dataset.obtain.split(';')
          if (knownObtains.every((needle) => !list.includes(needle))) {
            return false
          }
        } else if (!includes(obtain, item.dataset.obtain, ';')) {
          return false
        }
      }
      if (weapon !== true) {
        if (!includes(weapon, item.dataset.weapon)) {
          return false
        }
      }
      if (race !== true) {
        if (!includes(race, item.dataset.race)) {
          return false
        }
      }
      if (series !== true) {
        if (!includes(series, item.dataset.series)) {
          return false
        }
      }
      if (bonus !== true) {
        if (!includes(bonus, item.dataset.bonus)) {
          return false
        }
      }

      return search === '' || (reSearch.test(item.dataset.id) ||
        reSearch.test(item.dataset.name))

      /**
       * @param {string[]} candidates
       * @param {string} haystack
       */
      function includes(candidates, haystack, separator = ',') {
        const list = haystack.split(separator)
        return candidates.some((needle) => list.includes(needle))
      }
    }

    function applySort() {
      for (const box of document.querySelectorAll('.tracker-box')) {
        const items = Array.from(box.children).filter((child) =>
          child instanceof HTMLElement && child.classList.contains('tracker-item'),
        )
        items.sort(compareItems)
        for (const item of items) {
          box.appendChild(item)
        }
      }
    }

    /**
     * @param {Element} a
     * @param {Element} b
     * @return {number}
     */
    function compareItems(a, b) {
      const aVisible = a.style.display !== 'none'
      const bVisible = b.style.display !== 'none'
      if (aVisible !== bVisible) {
        return aVisible ? -1 : 1
      }

      if (!aVisible) {
        return compareByDefaultOrder(a, b)
      }

      if (currentSort === 'name-asc') {
        return compareByName(a, b) || compareByDefaultOrder(a, b)
      }
      if (currentSort === 'name-desc') {
        return compareByName(b, a) || compareByDefaultOrder(a, b)
      }
      if (currentSort === 'release-asc') {
        return compareByRelease(a, b) || compareByName(a, b) || compareByDefaultOrder(a, b)
      }
      if (currentSort === 'release-desc') {
        return compareByRelease(b, a) || compareByName(a, b) || compareByDefaultOrder(a, b)
      }
      return compareByDefaultOrder(a, b)
    }

    /**
     * @param {Element} a
     * @param {Element} b
     * @return {number}
     */
    function compareByName(a, b) {
      return sortCollator.compare(a.dataset.name || '', b.dataset.name || '')
    }

    /**
     * @param {Element} a
     * @param {Element} b
     * @return {number}
     */
    function compareByRelease(a, b) {
      const aRelease = parseReleaseValue(a.dataset.released)
      const bRelease = parseReleaseValue(b.dataset.released)
      if (aRelease != null && bRelease != null && aRelease !== bRelease) {
        return aRelease - bRelease
      }
      return sortCollator.compare(a.dataset.released || '', b.dataset.released || '')
    }

    /**
     * @param {Element} a
     * @param {Element} b
     * @return {number}
     */
    function compareByDefaultOrder(a, b) {
      return parseInt(a.dataset.sortDefault || '0', 10) - parseInt(b.dataset.sortDefault || '0', 10)
    }

    /**
     * @param {string | undefined} value
     * @return {number | null}
     */
    function parseReleaseValue(value) {
      if (value == null || value === '') {
        return null
      }

      const match = value.match(/\d+/)
      if (match == null) {
        return null
      }

      return parseInt(match[0], 10)
    }
  }
})()
</script></includeonly><noinclude>
{{#tag:source|{{:{{FULLPAGENAME}}}}|lang=javascript}}
</noinclude>
