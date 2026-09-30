/* One-time progress reset. The marker is stored per browser origin, so the
     reset runs in the same browser/profile where the site is actually opened.
     Once completed, newly earned progress continues to persist normally. */
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  } catch (e) { /* older embedded browsers may not expose it */ }

  const PROGRESS_RESET_MARKER = 'adaline_progress_reset_2026_08_12_04';

  try {
    if (localStorage.getItem(PROGRESS_RESET_MARKER) !== 'done') {
      Object.keys(localStorage)
        .filter(key => key.startsWith('adaline_') || key.startsWith('purchased_'))
        .forEach(key => localStorage.removeItem(key));

      localStorage.setItem('adaline_coins', '1000');
      localStorage.setItem('adaline_gems', '1000');
      localStorage.setItem(PROGRESS_RESET_MARKER, 'done');
    }
  } catch (e) {
    /* Storage may be unavailable in a restricted browser context. */
  }

  /* ── Garden storage (localStorage) ─────────────────────────────
     Shape: [{ id, name, plantedAt }]  e.g. {id:"aloe", name:"алоэ", plantedAt: 1719999999999} */
  const GARDEN_KEY = 'adaline_garden_plants';

  function normalizeGardenPlant(plant) {
    const isMicrogreen = plant.kind === 'microgreen' || (typeof MICROGREEN_IDS !== 'undefined' && MICROGREEN_IDS.includes(plant.id));
    const wasAutoMarkedWatered = Number.isFinite(plant.plantedAt) &&
      Number.isFinite(plant.lastWatered) && plant.lastWatered === plant.plantedAt;
    if (isMicrogreen) {
      return { ...plant, kind: 'microgreen', lastWatered: wasAutoMarkedWatered ? null : plant.lastWatered };
    }
    return {
      ...plant,
      kind: 'plant',
      lastWatered: wasAutoMarkedWatered ? null : plant.lastWatered,
      growthPoints: Math.max(0, Math.min(6, Number(plant.growthPoints) || 0)),
      potLevel: Number(plant.potLevel) === 2 ? 2 : 1,
      harvestReadyAt: Number.isFinite(plant.harvestReadyAt) ? plant.harvestReadyAt : null,
    };
  }

  function getGarden() {
    try {
      const raw = localStorage.getItem(GARDEN_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeGardenPlant);
    } catch (e) {
      return [];
    }
  }

  function saveGarden(list) {
    try {
      localStorage.setItem(GARDEN_KEY, JSON.stringify(list));
    } catch (e) { /* storage unavailable — fail silently */ }
  }

  function addToGarden(id, name) {
    const garden = getGarden();
    const now = Date.now();
    const kind = MICROGREEN_IDS.includes(id) ? 'microgreen' : 'plant';
    garden.push({
      id, name, kind, plantedAt: now, lastWatered: null,
      ...(kind === 'plant' ? { growthPoints: 0, potLevel: 1, harvestReadyAt: null } : {}),
    });
    saveGarden(garden);
    return garden;
  }

  function isPlanted(id) {
    return getGarden().some(p => p.id === id);
  }

  /* Plant catalog: maps id -> Russian display name. Used to render
     the "Мой сад" pots and to filter the selection screen. */
  const PLANT_CATALOG = {
    tomato:     'томат',
    basil:      'базилик',
    lavender:   'лаванда',
    mint:       'мята',
    rosemary:   'розмарин',
    cucumber:   'огурец',
    sunflower:  'подсолнух',
    strawberry: 'клубника',
    violet:     'фиалка',
    aloe:       'алоэ',
    watermelon: 'арбуз',
    oak:        'дуб',
    cress:      'кресс-салат',
    radish_micro: 'редис',
    broccoli_micro: 'брокколи',
    shiso_micro: 'шисо Бриттон',
    turnip:      'репа',
    chamomile:   'ромашка',
    birch:       'берёза',
    blueberry:   'голубика',
    amaranth_micro: 'амарант',
  };
  // Only three plants are available before the player visits the shop.
  const BASE_PLANT_IDS = ['tomato', 'basil', 'lavender'];
  // IDs unlocked via shop purchase
  const SHOP_PLANT_IDS = [
    'mint', 'rosemary', 'cucumber', 'sunflower', 'strawberry', 'violet', 'aloe',
    'watermelon', 'oak', 'turnip', 'chamomile', 'birch', 'blueberry',
  ];
  // Free microgreens live in their own garden tab and never appear in the
  // first ordinary-plant selection screen.
  const MICROGREEN_IDS = ['cress', 'radish_micro', 'broccoli_micro', 'shiso_micro', 'amaranth_micro'];
  const ALL_PLANT_IDS  = [...BASE_PLANT_IDS, ...SHOP_PLANT_IDS, ...MICROGREEN_IDS];

  const PLANT_CATEGORY = {
    tomato: 'vegetables', cucumber: 'vegetables', watermelon: 'vegetables', turnip: 'vegetables',
    lavender: 'flowers', sunflower: 'flowers', violet: 'flowers', chamomile: 'flowers',
    oak: 'trees', birch: 'trees',
    strawberry: 'shrubs', blueberry: 'shrubs',
    basil: 'herbs', mint: 'herbs', rosemary: 'herbs', aloe: 'herbs',
  };
  const GARDEN_CATEGORY_LABEL = {
    vegetables: 'Овощи', flowers: 'Цветы', trees: 'Деревья', shrubs: 'Кустарники', herbs: 'Травы',
  };
  const LARGE_POT_PRICE = { vegetables: 55, flowers: 50, trees: 120, shrubs: 70, herbs: 45 };
  const HARVEST_WINDOW_MS = 15 * 60 * 1000;
  const HARVEST_NAMES = {
    tomato: 'томаты', basil: 'базилик', lavender: 'лаванда', mint: 'мята', rosemary: 'розмарин',
    cucumber: 'огурцы', sunflower: 'семечки', strawberry: 'клубника', violet: 'фиалки', aloe: 'алоэ',
    watermelon: 'арбузы', oak: 'жёлуди', turnip: 'репа', chamomile: 'ромашка', birch: 'берёзовые почки',
    blueberry: 'голубика',
  };
  const INVENTORY_KEY = 'adaline_inventory_v1';

  function getInventory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(INVENTORY_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) { return {}; }
  }

  function saveInventory(inventory) {
    try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)); } catch (e) { /* ignore */ }
    updateWarehouseCount();
  }

  function addHarvestToInventory(id, amount) {
    const inventory = getInventory();
    inventory[id] = Math.max(0, Number(inventory[id]) || 0) + amount;
    saveInventory(inventory);
  }

  function isOrdinaryPlant(plant) {
    return plant && plant.kind !== 'microgreen' && !MICROGREEN_IDS.includes(plant.id);
  }

  function plantNeedsPotUpgrade(plant) {
    return isOrdinaryPlant(plant) && plant.potLevel === 1 && plant.growthPoints >= 3;
  }

  function plantIsHarvestReady(plant, now = Date.now()) {
    return isOrdinaryPlant(plant) && Number.isFinite(plant.harvestReadyAt) && now < plant.harvestReadyAt + HARVEST_WINDOW_MS;
  }

  function plantIsWilted(plant, now = Date.now()) {
    return isOrdinaryPlant(plant) && Number.isFinite(plant.harvestReadyAt) && now >= plant.harvestReadyAt + HARVEST_WINDOW_MS;
  }

  function advancePlantGrowth(plant, now = Date.now()) {
    if (!isOrdinaryPlant(plant) || plantNeedsPotUpgrade(plant) || plantIsHarvestReady(plant, now) || plantIsWilted(plant, now)) return;
    plant.growthPoints = Math.min(6, (Number(plant.growthPoints) || 0) + 1);
    if (plant.potLevel === 2 && plant.growthPoints >= 6 && !Number.isFinite(plant.harvestReadyAt)) {
      plant.harvestReadyAt = now;
    }
  }

  function canWaterPlant(plant, now = Date.now()) {
    return Boolean(plant) && !plantNeedsPotUpgrade(plant) && !plantIsHarvestReady(plant, now) && !plantIsWilted(plant, now);
  }

  const MICROGREEN_TRAY_KEY = 'adaline_microgreen_trays';
  const MICROGREEN_LEVELS_KEY = 'adaline_microgreen_levels';
  const MICROGREEN_MAX_LEVEL = 10;
  const MICROGREEN_MAX_TRAYS = 12;
  const MICROGREEN_UPGRADE_COST = {
    2: 20, 3: 35, 4: 60, 5: 100, 6: 165,
    7: 260, 8: 400, 9: 620, 10: 950,
  };
  const MICROGREEN_BASE_REWARD = {
    cress: [8, 13],
    radish_micro: [10, 15],
    broccoli_micro: [12, 17],
    shiso_micro: [15, 23],
    amaranth_micro: [11, 17],
  };

  const ORDINARY_REWARD = {
    tomato: [4, 7], basil: [3, 6], lavender: [4, 8], mint: [5, 8],
    rosemary: [7, 10], cucumber: [4, 7], sunflower: [6, 9],
    strawberry: [8, 12], violet: [5, 8], aloe: [9, 13],
    watermelon: [8, 12], oak: [11, 16], turnip: [4, 4],
    chamomile: [6, 9], birch: [13, 19], blueberry: [8, 12],
  };

  const MICROGREEN_UNLOCK_PRICE = {
    radish_micro: 20,
    broccoli_micro: 20,
    amaranth_micro: 35,
  };

  function getMicrogreenTrayCount() {
    const saved = parseInt(localStorage.getItem(MICROGREEN_TRAY_KEY), 10);
    if (Number.isFinite(saved) && saved >= 1) return Math.min(saved, MICROGREEN_MAX_TRAYS);
    const migrated = isPurchased('microgreen_tray') ? 2 : 1;
    localStorage.setItem(MICROGREEN_TRAY_KEY, String(migrated));
    return migrated;
  }

  function setMicrogreenTrayCount(count) {
    localStorage.setItem(
      MICROGREEN_TRAY_KEY,
      String(Math.max(1, Math.min(count, MICROGREEN_MAX_TRAYS)))
    );
  }

  function getMicrogreenLevels() {
    try {
      const parsed = JSON.parse(localStorage.getItem(MICROGREEN_LEVELS_KEY) || '{}');
      if (parsed && typeof parsed === 'object' && Number.isFinite(parsed.cress)) return parsed;
    } catch (e) { /* use migration defaults */ }
    const migrated = {
      cress: isPurchased('cress_seeds') ? 2 : 1,
      radish_micro: 0,
      broccoli_micro: 0,
      shiso_micro: 0,
      amaranth_micro: 0,
    };
    localStorage.setItem(MICROGREEN_LEVELS_KEY, JSON.stringify(migrated));
    return migrated;
  }

  function getMicrogreenLevel(id) {
    return Math.max(0, Math.min(MICROGREEN_MAX_LEVEL, Number(getMicrogreenLevels()[id]) || 0));
  }

  function setMicrogreenLevel(id, level) {
    const levels = getMicrogreenLevels();
    levels[id] = Math.max(0, Math.min(MICROGREEN_MAX_LEVEL, level));
    localStorage.setItem(MICROGREEN_LEVELS_KEY, JSON.stringify(levels));
  }

  function microgreenNextPrice(id) {
    const level = getMicrogreenLevel(id);
    if (level >= MICROGREEN_MAX_LEVEL) return null;
    return level === 0 ? (MICROGREEN_UNLOCK_PRICE[id] || 20) : MICROGREEN_UPGRADE_COST[level + 1];
  }

  function microgreenRewardRange(id) {
    const level = Math.max(1, getMicrogreenLevel(id));
    const base = MICROGREEN_BASE_REWARD[id] || MICROGREEN_BASE_REWARD.cress;
    const bonus = Math.floor(((level - 1) * (level + 2)) / 2);
    return [base[0] + bonus, base[1] + bonus];
  }

  /* ── Watering system ──────────────────────────────────────────
     Per-plant watering interval, in minutes. Thirsty plants (tomato,
     cucumber, mint) sit at the short end; drought-tolerant ones
     (lavender, rosemary, aloe) sit at the long end. */
  const WATER_INTERVAL_MIN = {
    tomato:     2,
    basil:      3,
    lavender:   8,
    mint:       1.5,
    rosemary:   7,
    cucumber:   2.5,
    sunflower:  4,
    strawberry: 3.5,
    violet:     5,
    aloe:       10,
    watermelon: 3,
    oak:        8,
    cress:      1,
    radish_micro: 1,
    broccoli_micro: 1,
    shiso_micro: 1,
    turnip:      0.25,
    chamomile:   4,
    birch:       2,
    blueberry:   2.5,
    amaranth_micro: 1,
  };

  function waterIntervalMs(id) {
    return (WATER_INTERVAL_MIN[id] || 3) * 60 * 1000;
  }

  function msUntilNextWater(plant) {
    if (!Number.isFinite(plant.lastWatered)) return 0;
    const last = plant.lastWatered;
    const elapsed = Date.now() - last;
    return Math.max(0, waterIntervalMs(plant.id) - elapsed);
  }

  function formatMMSS(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  /* ── Coins storage (localStorage) ──────────────────────────────── */
  const COINS_KEY = 'adaline_coins';

  function getCoins() {
    const raw = localStorage.getItem(COINS_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  }

  function setCoins(n) {
    try { localStorage.setItem(COINS_KEY, String(n)); } catch (e) { /* ignore */ }
    const el = document.getElementById('coins-count');
    if (el) el.textContent = n;
  }

  function addCoins(amount) {
    setCoins(getCoins() + amount);
  }

  /* ── Gems storage (localStorage) ───────────────────────────────── */
  const GEMS_KEY = 'adaline_gems';

  function getGems() {
    const raw = localStorage.getItem(GEMS_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  }

  function setGems(n) {
    try { localStorage.setItem(GEMS_KEY, String(n)); } catch (e) { /* ignore */ }
    const el = document.getElementById('gems-count');
    if (el) el.textContent = n;
  }

  function addGems(amount) {
    setGems(getGems() + amount);
  }

  /* ── Weather system ────────────────────────────────────────────
     Weather follows real timestamps, but bonuses are applied only while
     the page is open. This keeps the schedule believable without turning
     a closed tab into an unlimited source of rewards. */
  const WEATHER_KEY = 'adaline_weather_v1';
  const WEATHER_INTRO_KEY = 'adaline_weather_intro_seen_v1';
  const WEATHER_WARNING_MS = 15 * 1000;
  const WEATHER_RAIN_REWARD_MULTIPLIER = 0.75;

  const WEATHER_CONFIG = {
    clear: {
      label: 'Ясно', title: 'Ясная погода', icon: '☀', min: 4 * 60 * 1000, max: 7 * 60 * 1000,
      description: 'Растения растут и ждут обычного ручного полива.',
    },
    cloudy: {
      label: 'Облачно', title: 'Облачная погода', icon: '☁', min: 2 * 60 * 1000, max: 4 * 60 * 1000,
      description: 'Сад отдыхает под облаками. Таймеры продолжают идти в обычном темпе.',
    },
    rain: {
      label: 'Дождь', title: 'Дождь в саду', icon: '☂', min: 60 * 1000, max: 90 * 1000,
      description: 'Готовые растения поливаются каждые 20 секунд и приносят 75% обычной награды.',
    },
    sun: {
      label: 'Тёплое солнце', title: 'Тёплое солнце', icon: '☀', min: 90 * 1000, max: 150 * 1000,
      description: 'Обычные растения ускорены на 20%, микрозелень на 15%.',
    },
    rainbow: {
      label: 'Радуга', title: 'Радуга над садом', icon: '◒', min: 45 * 1000, max: 60 * 1000,
      description: 'Следующий ручной полив каждого готового растения приносит на 50% больше монет.',
    },
  };

  let weatherState = null;
  let weatherNextRainPulseAt = null;
  let weatherLastTickAt = Date.now();
  let weatherToastTimer = null;
  let weatherPreviewMode = false;

  function weatherRandomDuration(type) {
    const config = WEATHER_CONFIG[type] || WEATHER_CONFIG.clear;
    return Math.round(config.min + Math.random() * (config.max - config.min));
  }

  function createInitialWeatherState() {
    const now = Date.now();
    return {
      version: 1,
      type: 'clear',
      startedAt: now,
      endsAt: now + 150 * 1000,
      nextType: 'rain',
      lastRainAt: 0,
      rainbowClaimed: [],
      rainMicrogreensWatered: false,
    };
  }

  function loadWeatherState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(WEATHER_KEY) || 'null');
      if (parsed && WEATHER_CONFIG[parsed.type] && Number.isFinite(parsed.endsAt)) {
        parsed.rainbowClaimed = Array.isArray(parsed.rainbowClaimed) ? parsed.rainbowClaimed : [];
        parsed.rainMicrogreensWatered = Boolean(parsed.rainMicrogreensWatered);
        return parsed;
      }
    } catch (e) { /* use a fresh weather cycle */ }
    const fresh = createInitialWeatherState();
    saveWeatherState(fresh);
    return fresh;
  }

  function saveWeatherState(state = weatherState) {
    if (!state || weatherPreviewMode) return;
    try { localStorage.setItem(WEATHER_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function chooseNextWeather(current, state = weatherState) {
    const roll = Math.random();
    if (current === 'rain') return roll < 0.08 ? 'rainbow' : 'clear';
    if (current === 'rainbow' || current === 'sun') return 'clear';
    if (current === 'cloudy') {
      if (roll < 0.5) return 'rain';
      if (roll < 0.7) return 'sun';
      return 'clear';
    }

    const rainOnCooldown = state && Date.now() - (state.lastRainAt || 0) < 5 * 60 * 1000;
    if (roll < 0.35) return 'cloudy';
    if (roll < 0.60 && !rainOnCooldown) return 'rain';
    if (roll < 0.85) return 'sun';
    return 'clear';
  }

  function weatherTransitionMessage(type) {
    return {
      clear: 'Небо прояснилось. Погода снова спокойная.',
      cloudy: 'Над садом собираются облака.',
      rain: 'Начался дождь. Готовые растения скоро будут политы.',
      sun: 'Вышло тёплое солнце. Таймеры ускорились.',
      rainbow: 'После дождя появилась радуга. Ручной полив приносит больше монет.',
    }[type] || 'Погода изменилась.';
  }

  function advanceWeather(at = Date.now(), announce = true) {
    if (!weatherState) weatherState = loadWeatherState();
    const nextType = WEATHER_CONFIG[weatherState.nextType] ? weatherState.nextType : chooseNextWeather(weatherState.type);
    weatherState.type = nextType;
    weatherState.startedAt = at;
    weatherState.endsAt = at + weatherRandomDuration(nextType);
    weatherState.rainbowClaimed = [];
    weatherState.rainMicrogreensWatered = false;
    if (nextType === 'rain') weatherState.lastRainAt = at;
    weatherState.nextType = chooseNextWeather(nextType, weatherState);
    saveWeatherState();
    weatherNextRainPulseAt = nextType === 'rain' ? Date.now() + 10 * 1000 : null;
    updateWeatherUi();
    if (announce) showWeatherToast(weatherTransitionMessage(nextType));
  }

  function syncWeatherTimeline() {
    if (!weatherState) weatherState = loadWeatherState();
    const now = Date.now();
    let guard = 0;
    while (weatherState.endsAt <= now && guard < 24) {
      advanceWeather(weatherState.endsAt, false);
      guard += 1;
    }
    if (weatherState.endsAt <= now) {
      weatherState = createInitialWeatherState();
      saveWeatherState();
    }
    weatherNextRainPulseAt = weatherState.type === 'rain' ? now + 10 * 1000 : null;
  }

  function weatherNextLabel(type) {
    return {
      clear: 'ясная погода', cloudy: 'облачность', rain: 'дождь',
      sun: 'тёплое солнце', rainbow: 'радуга',
    }[type] || 'новая погода';
  }

  function updateWeatherUi() {
    if (!weatherState) return;
    const screen = document.getElementById('screen-garden');
    const config = WEATHER_CONFIG[weatherState.type];
    const remaining = Math.max(0, weatherState.endsAt - Date.now());
    if (screen) screen.dataset.weather = weatherState.type;

    const icon = document.getElementById('weather-widget-icon');
    const name = document.getElementById('weather-widget-name');
    const status = document.getElementById('weather-widget-status');
    const detailTitle = document.getElementById('weather-details-title');
    const detailDescription = document.getElementById('weather-details-description');
    const detailNext = document.getElementById('weather-details-next');
    if (icon) icon.textContent = config.icon;
    if (name) name.textContent = config.label;
    if (status) {
      status.textContent = remaining <= WEATHER_WARNING_MS
        ? `Скоро ${weatherNextLabel(weatherState.nextType)}, ${formatMMSS(remaining)}`
        : `${weatherState.type === 'rain' || weatherState.type === 'sun' || weatherState.type === 'rainbow' ? 'Осталось' : 'Смена через'} ${formatMMSS(remaining)}`;
    }
    if (detailTitle) detailTitle.textContent = config.title;
    if (detailDescription) detailDescription.textContent = config.description;
    if (detailNext) detailNext.textContent = `Следом: ${weatherNextLabel(weatherState.nextType)}. Через ${formatMMSS(remaining)}`;
  }

  function showWeatherToast(message) {
    const toast = document.getElementById('weather-toast');
    if (!toast || !message) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(weatherToastTimer);
    weatherToastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
  }

  // Keep transient notices outside the clipped garden canvas so weather,
  // flying visitors and short mobile viewports can never cut them off.
  const globalWeatherToast = document.getElementById('weather-toast');
  if (globalWeatherToast && globalWeatherToast.parentElement !== document.body) {
    document.body.appendChild(globalWeatherToast);
  }

  function createWeatherRainDrops() {
    const rain = document.getElementById('weather-rain');
    if (!rain || rain.childElementCount) return;
    const count = window.matchMedia('(max-width: 768px)').matches ? 22 : 38;
    for (let i = 0; i < count; i++) {
      const drop = document.createElement('i');
      drop.className = 'weather-rain-drop';
      drop.style.setProperty('--rain-left', `${(i * 37 + 11) % 100}%`);
      drop.style.setProperty('--rain-delay', `${-((i * 0.17) % 1.8)}s`);
      drop.style.setProperty('--rain-speed', `${0.85 + (i % 6) * 0.11}s`);
      rain.appendChild(drop);
    }
  }

  function randomWaterReward(plant) {
    const isMicrogreen = plant.kind === 'microgreen' || MICROGREEN_IDS.includes(plant.id);
    const range = isMicrogreen
      ? microgreenRewardRange(plant.id)
      : (ORDINARY_REWARD[plant.id] || [1, 5]);
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  }

  function applyManualWeatherBonus(plant, baseReward) {
    if (!weatherState || weatherState.type !== 'rainbow') {
      return { coinReward: baseReward, gemChanceBonus: 0, rainbowBonus: false };
    }
    const claims = weatherState.rainbowClaimed || [];
    if (claims.includes(plant.id)) {
      return { coinReward: baseReward, gemChanceBonus: 0, rainbowBonus: false };
    }
    claims.push(plant.id);
    weatherState.rainbowClaimed = claims;
    saveWeatherState();
    return {
      coinReward: Math.max(1, Math.round(baseReward * 1.5)),
      gemChanceBonus: 0.08,
      rainbowBonus: true,
    };
  }

  function showWeatherRewardOnCard(index, amount) {
    const card = document.querySelector(`.garden-pot-card[data-garden-index="${index}"]`);
    if (!card) return;
    card.classList.remove('weather-watered');
    void card.offsetWidth;
    card.classList.add('weather-watered');
    const pop = document.createElement('span');
    pop.className = 'weather-reward-pop';
    pop.textContent = `+${amount} монет`;
    card.appendChild(pop);
    setTimeout(() => {
      pop.remove();
      card.classList.remove('weather-watered');
    }, 1300);
  }

  function runRainPulse() {
    if (!weatherState || weatherState.type !== 'rain') return;
    const garden = getGarden();
    const now = Date.now();
    let wateredCount = 0;
    let totalCoins = 0;
    let totalGems = 0;
    let wateredMicrogreens = false;

    garden.forEach((plant, index) => {
      const isMicrogreen = plant.kind === 'microgreen' || MICROGREEN_IDS.includes(plant.id);
      if (isMicrogreen && weatherState.rainMicrogreensWatered) return;
      if (!canWaterPlant(plant, now)) return;
      if (msUntilNextWater(plant) > 0) return;

      const reward = Math.max(1, Math.floor(randomWaterReward(plant) * WEATHER_RAIN_REWARD_MULTIPLIER));
      plant.lastWatered = now;
      advancePlantGrowth(plant, now);
      wateredCount += 1;
      totalCoins += reward;
      if (Math.random() < (isMicrogreen ? 0.10 : 0.06)) totalGems += 1;
      if (isMicrogreen) wateredMicrogreens = true;
      showWeatherRewardOnCard(index, reward);
    });

    if (!wateredCount) return;
    if (wateredMicrogreens) weatherState.rainMicrogreensWatered = true;
    saveGarden(garden);
    saveWeatherState();
    addCoins(totalCoins);
    if (totalGems) addGems(totalGems);
    if (activeGardenView === 'microgreens') renderMicrogreens();
    else renderGarden(activeGardenView);
    tickWaterTimers();
    showWeatherToast(`Дождь полил ${wateredCount} ${wateredCount === 1 ? 'растение' : 'растения'}. Получено ${totalCoins} монет${totalGems ? ` и ${totalGems} гемов` : ''}.`);
  }

  function applySunTimerBoost(now) {
    const delta = Math.min(Math.max(0, now - weatherLastTickAt), 2000);
    weatherLastTickAt = now;
    if (!weatherState || weatherState.type !== 'sun' || document.visibilityState !== 'visible' || delta <= 0) return;
    const garden = getGarden();
    let changed = false;
    garden.forEach(plant => {
      if (!Number.isFinite(plant.lastWatered)) return;
      const isMicrogreen = plant.kind === 'microgreen' || MICROGREEN_IDS.includes(plant.id);
      plant.lastWatered -= delta * (isMicrogreen ? 0.15 : 0.20);
      changed = true;
    });
    if (changed) saveGarden(garden);
  }

  function updateWeatherCardStates() {
    if (!weatherState) return;
    document.querySelectorAll('#screen-garden .garden-pot-card').forEach(card => {
      const index = parseInt(card.dataset.gardenIndex, 10);
      const plant = getGarden()[index];
      const claimed = plant && (weatherState.rainbowClaimed || []).includes(plant.id);
      card.classList.toggle(
        'weather-rainbow-ready',
        Boolean(plant && weatherState.type === 'rainbow' && !claimed && canWaterPlant(plant) && msUntilNextWater(plant) <= 0)
      );
    });
  }

  function weatherTick() {
    if (!weatherState) return;
    const now = Date.now();
    applySunTimerBoost(now);
    if (weatherState.endsAt <= now) advanceWeather(now, true);
    if (weatherState.type === 'rain' && weatherNextRainPulseAt && now >= weatherNextRainPulseAt) {
      runRainPulse();
      weatherNextRainPulseAt = now + 20 * 1000;
    }
    updateWeatherUi();
    updateWeatherCardStates();
    maybeShowWeatherIntro();
  }

  function maybeShowWeatherIntro() {
    const intro = document.getElementById('weather-intro');
    if (!intro || document.body.dataset.screen !== 'screen-garden') return;
    try {
      if (localStorage.getItem(WEATHER_INTRO_KEY) === 'done') return;
    } catch (e) { /* still show the explanation */ }
    intro.hidden = false;
  }

  function initWeatherSystem() {
    weatherState = loadWeatherState();
    syncWeatherTimeline();
    const previewParams = new URLSearchParams(window.location.search);
    const previewType = previewParams.get('weather-preview');
    if ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') && WEATHER_CONFIG[previewType]) {
      weatherPreviewMode = true;
      const now = Date.now();
      weatherState = {
        ...weatherState,
        type: previewType,
        startedAt: now,
        endsAt: now + 90 * 1000,
        nextType: chooseNextWeather(previewType, weatherState),
        rainbowClaimed: [],
        rainMicrogreensWatered: false,
      };
      weatherNextRainPulseAt = previewType === 'rain' ? now + 1000 : null;
      if (previewParams.get('weather-ready') === '1') {
        const previewGarden = getGarden().map(plant => ({ ...plant, lastWatered: null }));
        saveGarden(previewGarden);
      }
    }
    weatherLastTickAt = Date.now();
    createWeatherRainDrops();
    updateWeatherUi();

    const widget = document.getElementById('weather-widget');
    const details = document.getElementById('weather-details');
    if (widget && details) {
      widget.addEventListener('click', () => {
        const opening = details.hidden;
        details.hidden = !opening;
        widget.setAttribute('aria-expanded', String(opening));
      });
      document.addEventListener('click', event => {
        if (details.hidden || event.target.closest('.weather-control')) return;
        details.hidden = true;
        widget.setAttribute('aria-expanded', 'false');
      });
    }

    const closeIntro = document.getElementById('weather-intro-close');
    if (closeIntro) {
      closeIntro.addEventListener('click', () => {
        const intro = document.getElementById('weather-intro');
        if (intro) intro.hidden = true;
        try { localStorage.setItem(WEATHER_INTRO_KEY, 'done'); } catch (e) { /* ignore */ }
      });
    }

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !details || details.hidden) return;
      details.hidden = true;
      if (widget) {
        widget.setAttribute('aria-expanded', 'false');
        widget.focus();
      }
    });
    document.addEventListener('visibilitychange', () => { weatherLastTickAt = Date.now(); });

    if (!window.__weatherTickStarted) {
      window.__weatherTickStarted = true;
      setInterval(weatherTick, 1000);
    }

  }

  document.addEventListener('DOMContentLoaded', initWeatherSystem);

  /* ── Generic arc-flight animation ──────────────────────────────
     Launches `count` particles from fromRect → toRect.
     className: CSS class for the particle div (flying-coin or flying-gem)
     symbol:    text content of the particle
     onLand:    called once per particle when it arrives (optional)      */
  function flyBetween(fromRect, toRect, count, className, symbol, stagger, duration, onLand) {
    const startX = fromRect.left + fromRect.width  / 2;
    const startY = fromRect.top  + fromRect.height / 2;
    const endX   = toRect.left   + toRect.width    / 2;
    const endY   = toRect.top    + toRect.height   / 2;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className   = className;
        el.textContent = symbol;
        el.style.left    = (startX - 10) + 'px';
        el.style.top     = (startY - 10) + 'px';
        el.style.opacity = '0';
        document.body.appendChild(el);

        const ctrlX = (startX + endX) / 2 + (Math.random() - 0.5) * 70;
        const ctrlY = Math.min(startY, endY) - 70 - Math.random() * 40;
        let t0 = null;

        function step(ts) {
          if (!t0) t0 = ts;
          const t    = Math.min((ts - t0) / duration, 1);
          const ease = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
          const u    = 1 - ease;
          const x    = u*u*startX + 2*u*ease*ctrlX + ease*ease*endX;
          const y    = u*u*startY + 2*u*ease*ctrlY + ease*ease*endY;

          el.style.left      = (x - 10) + 'px';
          el.style.top       = (y - 10) + 'px';
          el.style.opacity   = t < 0.12 ? String(t / 0.12)
                             : t > 0.80 ? String(1 - (t - 0.80) / 0.20)
                             : '1';
          el.style.transform = `scale(${1 - t * 0.3})`;

          if (t < 1) {
            requestAnimationFrame(step);
          } else {
            el.remove();
            if (onLand) onLand();
          }
        }
        requestAnimationFrame(step);
      }, i * stagger);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setCoins(getCoins());
    setGems(getGems());
  });

  /* Final grown-form SVG markup per plant — same art used in the
     selection-screen icons, reused for the planting-screen sprout
     morph target and for the mini pots in "Мой сад". */
  const PLANT_SVG_INNER = {
    tomato: `<circle cx="28" cy="32" r="16" fill="#c0392b" opacity="0.85"/>
        <circle cx="28" cy="32" r="11" fill="#d9534f" opacity="0.6"/>
        <path d="M28 16 Q28 8 28 4" stroke="#3a6b2e" stroke-width="2" stroke-linecap="round"/>
        <path d="M28 10 Q22 6 18 8" stroke="#4a7c3a" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M28 10 Q34 6 38 8" stroke="#4a7c3a" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M28 12 Q24 9 21 11" stroke="#5e9a4a" stroke-width="1.2" stroke-linecap="round"/>`,
    basil: `<path d="M28 48 Q28 36 28 24" stroke="#3a6b2e" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="20" cy="28" rx="9" ry="6" transform="rotate(-20 20 28)" fill="#4a7c3a" opacity="0.85"/>
        <ellipse cx="36" cy="24" rx="9" ry="6" transform="rotate(20 36 24)" fill="#5e9a4a" opacity="0.8"/>
        <ellipse cx="22" cy="18" rx="8" ry="5.5" transform="rotate(-10 22 18)" fill="#4a7c3a" opacity="0.75"/>
        <ellipse cx="34" cy="14" rx="7" ry="5" transform="rotate(15 34 14)" fill="#6ea854" opacity="0.7"/>
        <ellipse cx="28" cy="10" rx="6" ry="4.5" fill="#4a7c3a" opacity="0.85"/>`,
    lavender: `<path d="M22 48 Q22 32 22 18" stroke="#3a6b2e" stroke-width="2" stroke-linecap="round"/>
        <path d="M28 48 Q28 30 28 14" stroke="#3a6b2e" stroke-width="2" stroke-linecap="round"/>
        <path d="M34 48 Q34 32 34 18" stroke="#3a6b2e" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="22" cy="14" rx="4" ry="9" fill="#9b7fc4" opacity="0.8"/>
        <ellipse cx="28" cy="10" rx="4" ry="9" fill="#8a6cb8" opacity="0.85"/>
        <ellipse cx="34" cy="14" rx="4" ry="9" fill="#9b7fc4" opacity="0.8"/>
        <ellipse cx="22" cy="14" rx="3" ry="7" fill="#b39ddb" opacity="0.6"/>
        <ellipse cx="28" cy="10" rx="3" ry="7" fill="#b39ddb" opacity="0.65"/>
        <ellipse cx="34" cy="14" rx="3" ry="7" fill="#b39ddb" opacity="0.6"/>`,
    mint: `<path d="M28 48 Q26 38 24 28 Q22 18 24 10" stroke="#3a6b2e" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="18" cy="22" rx="9" ry="5.5" transform="rotate(-30 18 22)" fill="#4a7c3a" opacity="0.85"/>
        <ellipse cx="37" cy="18" rx="9" ry="5.5" transform="rotate(25 37 18)" fill="#5e9a4a" opacity="0.8"/>
        <ellipse cx="16" cy="32" rx="8" ry="5" transform="rotate(-15 16 32)" fill="#4a7c3a" opacity="0.75"/>
        <ellipse cx="38" cy="30" rx="8" ry="5" transform="rotate(20 38 30)" fill="#5e9a4a" opacity="0.75"/>
        <ellipse cx="28" cy="38" rx="7" ry="4.5" fill="#4a7c3a" opacity="0.7"/>
        <path d="M18 22 Q20 20 22 22" stroke="#3a6b2e" stroke-width="0.8" opacity="0.4" stroke-linecap="round"/>
        <path d="M37 18 Q35 16 33 18" stroke="#3a6b2e" stroke-width="0.8" opacity="0.4" stroke-linecap="round"/>`,
    rosemary: `<path d="M28 50 Q28 36 28 22" stroke="#3a6b2e" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M28 40 Q22 36 16 34" stroke="#3a6b2e" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M28 34 Q34 30 40 28" stroke="#3a6b2e" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M28 28 Q22 24 17 22" stroke="#3a6b2e" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M28 22 Q33 18 38 16" stroke="#3a6b2e" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M16 34 Q14 32 12 33" stroke="#4a7c3a" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M40 28 Q42 26 44 27" stroke="#5e9a4a" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M17 22 Q15 20 13 21" stroke="#4a7c3a" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M38 16 Q40 14 42 15" stroke="#5e9a4a" stroke-width="1.2" stroke-linecap="round"/>
        <ellipse cx="28" cy="18" rx="3.5" ry="5" fill="#7fb568" opacity="0.75"/>`,
    cucumber: `<ellipse cx="28" cy="32" rx="10" ry="16" fill="#4a7c3a" opacity="0.85"/>
        <ellipse cx="28" cy="32" rx="7" ry="12" fill="#5e9a4a" opacity="0.55"/>
        <path d="M28 16 Q28 10 30 6" stroke="#3a6b2e" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M30 6 Q36 4 38 8" stroke="#4a7c3a" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M28 20 Q20 14 16 16" stroke="#4a7c3a" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="22" cy="28" r="1.5" fill="#3a6b2e" opacity="0.3"/>
        <circle cx="34" cy="32" r="1.5" fill="#3a6b2e" opacity="0.3"/>
        <circle cx="23" cy="38" r="1.5" fill="#3a6b2e" opacity="0.3"/>`,
    sunflower: `<path d="M28 52 Q28 38 28 26" stroke="#3a6b2e" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M28 42 Q20 38 14 40" stroke="#3a6b2e" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M28 36 Q36 32 40 34" stroke="#3a6b2e" stroke-width="1.5" stroke-linecap="round"/>
        <ellipse cx="28" cy="15" rx="4" ry="7" fill="#f2c94c" opacity="0.95"/>
        <ellipse cx="28" cy="15" rx="4" ry="7" transform="rotate(45 28 24)" fill="#f2c94c" opacity="0.9"/>
        <ellipse cx="28" cy="15" rx="4" ry="7" transform="rotate(90 28 24)" fill="#f2c94c" opacity="0.95"/>
        <ellipse cx="28" cy="15" rx="4" ry="7" transform="rotate(135 28 24)" fill="#f2c94c" opacity="0.9"/>
        <ellipse cx="28" cy="15" rx="4" ry="7" transform="rotate(-45 28 24)" fill="#f2c94c" opacity="0.85"/>
        <ellipse cx="28" cy="15" rx="4" ry="7" transform="rotate(-90 28 24)" fill="#f2c94c" opacity="0.9"/>
        <ellipse cx="28" cy="15" rx="4" ry="7" transform="rotate(-135 28 24)" fill="#f2c94c" opacity="0.85"/>
        <circle cx="28" cy="24" r="7" fill="#8a6020" opacity="0.9"/>
        <circle cx="28" cy="24" r="4.5" fill="#5a3d12" opacity="0.8"/>`,
    strawberry: `<path d="M28 16 Q18 18 16 28 Q15 38 28 46 Q41 38 40 28 Q38 18 28 16Z" fill="#d9534f" opacity="0.9"/>
        <path d="M28 16 Q20 20 19 29 Q19 37 28 43 Q37 37 37 29 Q36 20 28 16Z" fill="#e8736f" opacity="0.55"/>
        <circle cx="24" cy="30" r="1.2" fill="#f2c94c" opacity="0.8"/>
        <circle cx="32" cy="28" r="1.2" fill="#f2c94c" opacity="0.8"/>
        <circle cx="26" cy="38" r="1.2" fill="#f2c94c" opacity="0.75"/>
        <circle cx="30" cy="36" r="1.2" fill="#f2c94c" opacity="0.7"/>
        <path d="M28 16 Q24 10 20 12" stroke="#3a6b2e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M28 16 Q32 10 36 12" stroke="#3a6b2e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M28 16 Q28 8 28 6" stroke="#3a6b2e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="20" cy="11" rx="4" ry="3" transform="rotate(-20 20 11)" fill="#4a7c3a" opacity="0.8"/>
        <ellipse cx="36" cy="11" rx="4" ry="3" transform="rotate(20 36 11)" fill="#4a7c3a" opacity="0.8"/>
        <ellipse cx="28" cy="6" rx="3.5" ry="2.5" fill="#5e9a4a" opacity="0.75"/>`,
    violet: `<ellipse cx="28" cy="18" rx="5.5" ry="9" fill="#9b7fc4" opacity="0.8"/>
        <ellipse cx="28" cy="18" rx="5.5" ry="9" transform="rotate(72 28 28)" fill="#8a6cb8" opacity="0.75"/>
        <ellipse cx="28" cy="18" rx="5.5" ry="9" transform="rotate(144 28 28)" fill="#9b7fc4" opacity="0.8"/>
        <ellipse cx="28" cy="18" rx="5.5" ry="9" transform="rotate(216 28 28)" fill="#8a6cb8" opacity="0.75"/>
        <ellipse cx="28" cy="18" rx="5.5" ry="9" transform="rotate(288 28 28)" fill="#9b7fc4" opacity="0.8"/>
        <circle cx="28" cy="28" r="5" fill="#f2c94c" opacity="0.9"/>
        <circle cx="28" cy="28" r="3" fill="#f7dc8a" opacity="0.7"/>
        <ellipse cx="14" cy="42" rx="8" ry="5.5" transform="rotate(-20 14 42)" fill="#4a7c3a" opacity="0.8"/>
        <ellipse cx="42" cy="42" rx="8" ry="5.5" transform="rotate(20 42 42)" fill="#5e9a4a" opacity="0.8"/>
        <ellipse cx="28" cy="46" rx="7" ry="5" fill="#4a7c3a" opacity="0.75"/>`,
    aloe: `<path d="M28 34 Q14 28 10 16 Q16 14 22 22 Q24 26 28 28Z" fill="#4a7c3a" opacity="0.85"/>
        <path d="M28 34 Q42 28 46 16 Q40 14 34 22 Q32 26 28 28Z" fill="#5e9a4a" opacity="0.8"/>
        <path d="M28 34 Q18 44 14 52 Q20 54 26 44 Q27 40 28 36Z" fill="#4a7c3a" opacity="0.8"/>
        <path d="M28 34 Q38 44 42 52 Q36 54 30 44 Q29 40 28 36Z" fill="#5e9a4a" opacity="0.75"/>
        <path d="M28 34 Q24 20 24 8 Q30 8 32 20 Q30 28 28 34Z" fill="#3a6b2e" opacity="0.9"/>
        <path d="M10 16 L8 14" stroke="#3a6b2e" stroke-width="0.8" stroke-linecap="round" opacity="0.5"/>
        <path d="M46 16 L48 14" stroke="#3a6b2e" stroke-width="0.8" stroke-linecap="round" opacity="0.5"/>
        <path d="M14 52 L12 54" stroke="#3a6b2e" stroke-width="0.8" stroke-linecap="round" opacity="0.5"/>
        <path d="M42 52 L44 54" stroke="#3a6b2e" stroke-width="0.8" stroke-linecap="round" opacity="0.5"/>
        <circle cx="28" cy="32" r="4" fill="#5e9a4a" opacity="0.9"/>`,
    watermelon: `
        <path d="M28 48 Q28 36 28 26" stroke="#2d5a1e" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M28 34 Q18 28 14 20 Q20 17 27 26Z" fill="#3a7a28" opacity="0.85"/>
        <path d="M28 34 Q38 28 42 20 Q36 17 29 26Z" fill="#4a8e30" opacity="0.8"/>
        <path d="M14 20 Q16 18 18 19" stroke="#2d5a1e" stroke-width="0.8" stroke-linecap="round" opacity="0.6"/>
        <path d="M42 20 Q40 18 38 19" stroke="#2d5a1e" stroke-width="0.8" stroke-linecap="round" opacity="0.6"/>
        <ellipse cx="28" cy="19" rx="9" ry="6" fill="#5cb035" opacity="0.9"/>
        <path d="M22 19 Q25 17 28 19 Q31 17 34 19" stroke="#2d5a1e" stroke-width="0.7" fill="none" opacity="0.5"/>
        <ellipse cx="28" cy="10" rx="6" ry="4" fill="#e74c3c" opacity="0.85"/>
        <ellipse cx="28" cy="10" rx="4" ry="2.5" fill="#ff6b6b" opacity="0.5"/>
        <circle cx="26" cy="10" r="0.7" fill="#1a1a1a" opacity="0.7"/>
        <circle cx="30" cy="9" r="0.7" fill="#1a1a1a" opacity="0.7"/>`,
    oak: `
        <path d="M28 48 Q28 34 28 24" stroke="#5a3d1e" stroke-width="3" stroke-linecap="round"/>
        <path d="M28 36 Q20 30 18 22 Q24 19 28 28Z" fill="#4a7c3a" opacity="0.85"/>
        <ellipse cx="28" cy="20" rx="11" ry="8" fill="#5a9040"/>
        <path d="M18 22 Q19 18 22 20 Q20 16 23 17 Q22 13 25 15 Q24 11 28 12 Q32 11 31 15 Q34 13 33 17 Q36 16 34 20 Q37 18 38 22" stroke="#3a6b2e" stroke-width="0.8" fill="none" stroke-linecap="round"/>
        <ellipse cx="28" cy="14" rx="6" ry="3.5" fill="#4a7c3a" opacity="0.8"/>
        <ellipse cx="22" cy="19" rx="5" ry="3" transform="rotate(-20 22 19)" fill="#5a9040" opacity="0.75"/>
        <ellipse cx="34" cy="19" rx="5" ry="3" transform="rotate(20 34 19)" fill="#4a7c3a" opacity="0.75"/>
        <ellipse cx="28" cy="8" rx="5" ry="3.5" fill="#7b5e3a"/>
        <ellipse cx="28" cy="8" rx="4" ry="2" fill="#c8843a" opacity="0.9"/>
        <rect x="26.5" y="4" width="3" height="5" rx="1.5" fill="#5a3d1e"/>`,
    cress: `
        <path d="M2 54 Q3 36 4 23" stroke="#3a6b2e" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M8 54 Q7 31 10 17" stroke="#4a7c3a" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M14 54 Q15 35 14 20" stroke="#3a6b2e" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M20 54 Q18 29 21 14" stroke="#4a7c3a" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M26 54 Q27 33 26 18" stroke="#3a6b2e" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M32 54 Q30 30 33 15" stroke="#4a7c3a" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M38 54 Q39 35 38 21" stroke="#3a6b2e" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M44 54 Q42 31 45 18" stroke="#4a7c3a" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M50 54 Q49 36 50 22" stroke="#3a6b2e" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M55 54 Q53 34 54 25" stroke="#4a7c3a" stroke-width="1.2" stroke-linecap="round"/>
        <ellipse cx="3" cy="22" rx="4.7" ry="2.9" transform="rotate(-18 3 22)" fill="#5e9a4a" opacity="0.9"/>
        <ellipse cx="9" cy="16" rx="4.8" ry="3" transform="rotate(18 9 16)" fill="#6eaa56" opacity="0.9"/>
        <ellipse cx="14" cy="19" rx="4.8" ry="3" transform="rotate(-16 14 19)" fill="#4f8d40" opacity="0.9"/>
        <ellipse cx="21" cy="13" rx="5" ry="3.1" transform="rotate(15 21 13)" fill="#72b35a" opacity="0.95"/>
        <ellipse cx="26" cy="17" rx="4.8" ry="3" transform="rotate(-15 26 17)" fill="#5e9a4a" opacity="0.9"/>
        <ellipse cx="33" cy="14" rx="5" ry="3.1" transform="rotate(16 33 14)" fill="#72b35a" opacity="0.95"/>
        <ellipse cx="38" cy="20" rx="4.8" ry="3" transform="rotate(-16 38 20)" fill="#4f8d40" opacity="0.9"/>
        <ellipse cx="45" cy="17" rx="4.8" ry="3" transform="rotate(18 45 17)" fill="#6eaa56" opacity="0.9"/>
        <ellipse cx="50" cy="21" rx="4.7" ry="2.9" transform="rotate(-14 50 21)" fill="#5e9a4a" opacity="0.88"/>
        <ellipse cx="55" cy="24" rx="4.5" ry="2.8" transform="rotate(16 55 24)" fill="#6eaa56" opacity="0.86"/>`,
    radish_micro: `
        <path d="M2 54Q3 35 4 24 M8 54Q7 29 10 17 M14 54Q15 34 14 21 M20 54Q18 28 21 14 M26 54Q27 31 26 19 M32 54Q30 29 33 15 M38 54Q39 33 38 21 M44 54Q42 30 45 18 M50 54Q49 35 50 22 M55 54Q53 33 54 25" stroke="#557a35" stroke-width="1.45" stroke-linecap="round"/>
        <ellipse cx="3" cy="22" rx="5" ry="3.1" transform="rotate(-16 3 22)" fill="#78a84f"/><ellipse cx="9" cy="16" rx="5" ry="3.2" transform="rotate(17 9 16)" fill="#8bb85c"/><ellipse cx="14" cy="20" rx="5" ry="3.1" transform="rotate(-15 14 20)" fill="#6f9d49"/><ellipse cx="21" cy="13" rx="5.3" ry="3.2" transform="rotate(14 21 13)" fill="#91bd62"/><ellipse cx="26" cy="18" rx="5" ry="3.1" transform="rotate(-14 26 18)" fill="#78a84f"/><ellipse cx="33" cy="14" rx="5.3" ry="3.2" transform="rotate(15 33 14)" fill="#91bd62"/><ellipse cx="38" cy="20" rx="5" ry="3.1" transform="rotate(-15 38 20)" fill="#6f9d49"/><ellipse cx="45" cy="17" rx="5" ry="3.2" transform="rotate(17 45 17)" fill="#8bb85c"/><ellipse cx="50" cy="21" rx="5" ry="3.1" transform="rotate(-14 50 21)" fill="#78a84f"/><ellipse cx="55" cy="24" rx="4.6" ry="2.9" transform="rotate(15 55 24)" fill="#8bb85c"/>
        <circle cx="10" cy="20" r="1.4" fill="#b45768" opacity="0.75"/><circle cx="33" cy="18" r="1.5" fill="#b45768" opacity="0.75"/><circle cx="50" cy="25" r="1.3" fill="#b45768" opacity="0.7"/>`,
    broccoli_micro: `
        <path d="M2 54Q3 34 4 22 M8 54Q7 28 10 16 M14 54Q15 33 14 19 M20 54Q18 27 21 13 M26 54Q27 30 26 17 M32 54Q30 28 33 14 M38 54Q39 32 38 19 M44 54Q42 29 45 16 M50 54Q49 34 50 20 M55 54Q53 32 54 23" stroke="#315f3c" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M0 22Q4 16 8 22Q11 15 15 21Q18 12 23 19Q27 13 31 19Q34 12 39 19Q43 14 47 20Q51 16 56 23Q52 29 47 24Q43 30 39 23Q34 29 30 22Q26 28 22 21Q17 27 13 23Q8 29 5 24Q2 27 0 22Z" fill="#477f50"/>
        <circle cx="7" cy="20" r="2.4" fill="#5b965f"/><circle cx="15" cy="19" r="2.6" fill="#548d58"/><circle cx="23" cy="17" r="2.8" fill="#67a06a"/><circle cx="31" cy="18" r="2.5" fill="#548d58"/><circle cx="39" cy="17" r="2.8" fill="#67a06a"/><circle cx="47" cy="20" r="2.6" fill="#548d58"/><circle cx="54" cy="22" r="2.3" fill="#5b965f"/>`,
  };

  /* Wide microgreen silhouettes use a 168×56 viewBox so leaves keep their
     own proportions instead of being stretched into the same oval shape. */
  Object.assign(PLANT_SVG_INNER, {
    cress: `
      <path d="M10 54Q11 33 12 23M24 54Q22 29 25 18M38 54Q40 34 39 25M52 54Q50 27 53 16M68 54Q69 31 68 21M84 54Q82 26 85 15M100 54Q102 32 101 22M116 54Q114 28 117 17M132 54Q134 34 133 24M148 54Q146 30 149 20M158 54Q159 38 158 28" stroke="#39743b" stroke-width="2" stroke-linecap="round"/>
      <g fill="#68a95d"><ellipse cx="8" cy="22" rx="7" ry="4"/><ellipse cx="17" cy="21" rx="7" ry="4"/><ellipse cx="21" cy="17" rx="7" ry="4"/><ellipse cx="29" cy="18" rx="7" ry="4"/><ellipse cx="35" cy="24" rx="7" ry="4"/><ellipse cx="43" cy="23" rx="7" ry="4"/><ellipse cx="49" cy="15" rx="7" ry="4"/><ellipse cx="57" cy="16" rx="7" ry="4"/><ellipse cx="64" cy="20" rx="7" ry="4"/><ellipse cx="73" cy="20" rx="7" ry="4"/><ellipse cx="81" cy="14" rx="7" ry="4"/><ellipse cx="89" cy="15" rx="7" ry="4"/><ellipse cx="97" cy="21" rx="7" ry="4"/><ellipse cx="105" cy="20" rx="7" ry="4"/><ellipse cx="113" cy="16" rx="7" ry="4"/><ellipse cx="121" cy="17" rx="7" ry="4"/><ellipse cx="129" cy="23" rx="7" ry="4"/><ellipse cx="137" cy="22" rx="7" ry="4"/><ellipse cx="145" cy="19" rx="7" ry="4"/><ellipse cx="153" cy="20" rx="7" ry="4"/><ellipse cx="155" cy="27" rx="6" ry="3.6"/><ellipse cx="162" cy="28" rx="6" ry="3.6"/></g>`,
    radish_micro: `
      <path d="M14 54Q16 34 16 24M36 54Q34 29 37 18M58 54Q60 33 59 23M82 54Q80 27 83 16M106 54Q108 32 107 21M130 54Q128 29 131 18M153 54Q151 35 153 25" stroke="#a04f67" stroke-width="2.5" stroke-linecap="round"/>
      <g fill="#82b65b"><path d="M16 24C2 21 2 10 15 15C22 5 31 13 24 21C21 24 18 25 16 24Z"/><path d="M37 18C24 16 24 5 36 10C43 1 52 9 45 16C42 19 39 19 37 18Z"/><path d="M59 23C46 21 46 10 58 15C65 6 74 14 67 21C64 24 61 24 59 23Z"/><path d="M83 16C69 14 70 3 82 8C89 0 98 7 91 14C88 17 85 17 83 16Z"/><path d="M107 21C94 19 94 8 106 13C113 4 122 12 115 19C112 22 109 22 107 21Z"/><path d="M131 18C118 16 118 5 130 10C137 1 146 9 139 16C136 19 133 19 131 18Z"/><path d="M153 25C140 23 140 12 152 17C159 8 168 16 161 23C158 26 155 26 153 25Z"/></g>
      <g fill="#bb5d73" opacity="0.8"><circle cx="16" cy="30" r="2.5"/><circle cx="83" cy="22" r="2.5"/><circle cx="131" cy="24" r="2.5"/></g>`,
    broccoli_micro: `
      <path d="M10 54V31M28 54Q26 38 29 28M46 54Q48 37 47 27M64 54Q62 35 65 25M84 54Q86 36 85 26M104 54Q102 38 105 28M124 54Q126 36 125 26M144 54Q142 39 145 30M158 54V33" stroke="#285f3e" stroke-width="2.7" stroke-linecap="round"/>
      <g fill="#477f50"><circle cx="7" cy="29" r="5"/><circle cx="13" cy="27" r="6"/><circle cx="18" cy="31" r="4"/><circle cx="25" cy="26" r="5"/><circle cx="31" cy="25" r="6"/><circle cx="36" cy="29" r="4"/><circle cx="43" cy="25" r="5"/><circle cx="49" cy="23" r="6"/><circle cx="54" cy="27" r="4"/><circle cx="61" cy="23" r="5"/><circle cx="67" cy="21" r="6"/><circle cx="72" cy="25" r="4"/><circle cx="81" cy="24" r="5"/><circle cx="87" cy="22" r="6"/><circle cx="92" cy="26" r="4"/><circle cx="101" cy="26" r="5"/><circle cx="107" cy="24" r="6"/><circle cx="112" cy="28" r="4"/><circle cx="121" cy="24" r="5"/><circle cx="127" cy="22" r="6"/><circle cx="132" cy="26" r="4"/><circle cx="141" cy="28" r="5"/><circle cx="147" cy="27" r="6"/><circle cx="153" cy="31" r="4"/><circle cx="157" cy="31" r="5"/><circle cx="163" cy="30" r="5"/></g>`,
    shiso_micro: `
      <path d="M13 54Q15 34 16 24M38 54Q36 27 39 17M63 54Q66 32 65 22M88 54Q86 24 89 14M113 54Q116 31 114 20M138 54Q136 27 139 17M158 54Q156 35 158 25" stroke="#71364f" stroke-width="2.6" stroke-linecap="round"/>
      <g fill="#793f67"><path d="M16 25L7 22L10 18L5 15L12 13L10 8L17 11L21 5L24 12L31 11L27 17L32 21L24 22Z"/><path d="M39 18L30 15L33 11L28 8L35 6L34 1L41 5L45 0L48 7L55 6L51 12L56 16L48 17Z"/><path d="M65 23L56 20L59 16L54 13L61 11L60 6L67 10L71 5L74 12L81 11L77 17L82 21L74 22Z"/><path d="M89 15L80 12L83 8L78 5L85 3L84 0L91 2L95 0L98 4L105 3L101 9L106 13L98 14Z"/><path d="M114 21L105 18L108 14L103 11L110 9L109 4L116 8L120 3L123 10L130 9L126 15L131 19L123 20Z"/><path d="M139 18L130 15L133 11L128 8L135 6L134 1L141 5L145 0L148 7L155 6L151 12L156 16L148 17Z"/><path d="M158 26L149 23L152 19L147 16L154 14L153 9L160 13L164 8L167 15L168 15L166 22L168 24L166 25Z"/></g>
      <g fill="#4e7c52" opacity="0.72"><path d="M14 24L8 18L16 11L24 20Z"/><path d="M63 22L57 16L65 9L73 18Z"/><path d="M112 20L106 14L114 7L122 16Z"/></g>`,
    turnip: `
      <path d="M28 17C17 17 13 25 17 35C19 41 24 46 28 51C32 46 37 41 39 35C43 25 39 17 28 17Z" fill="#b77aa2"/>
      <path d="M28 23C22 23 20 28 22 35C23 39 26 43 28 46C30 43 33 39 34 35C36 28 34 23 28 23Z" fill="#d59abb" opacity="0.72"/>
      <path d="M28 18Q22 11 15 9M28 18Q34 10 42 9M28 18Q28 9 30 4" stroke="#39743b" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="15" cy="9" rx="8" ry="4.5" transform="rotate(18 15 9)" fill="#68a95d"/><ellipse cx="42" cy="9" rx="8" ry="4.5" transform="rotate(-18 42 9)" fill="#5b965f"/><ellipse cx="31" cy="5" rx="7" ry="4" transform="rotate(-8 31 5)" fill="#78b869"/>`,
    chamomile: `
      <path d="M28 52Q27 37 28 27M28 42Q20 37 15 40M28 36Q36 31 42 34" stroke="#39743b" stroke-width="2.3" stroke-linecap="round"/>
      <g fill="#f3f1df"><ellipse cx="28" cy="12" rx="4" ry="9"/><ellipse cx="28" cy="12" rx="4" ry="9" transform="rotate(45 28 22)"/><ellipse cx="28" cy="12" rx="4" ry="9" transform="rotate(90 28 22)"/><ellipse cx="28" cy="12" rx="4" ry="9" transform="rotate(135 28 22)"/><ellipse cx="28" cy="12" rx="4" ry="9" transform="rotate(-45 28 22)"/><ellipse cx="28" cy="12" rx="4" ry="9" transform="rotate(-90 28 22)"/><ellipse cx="28" cy="12" rx="4" ry="9" transform="rotate(-135 28 22)"/></g>
      <circle cx="28" cy="22" r="7" fill="#d6a72e"/><circle cx="28" cy="22" r="4" fill="#b9851d"/>
      <ellipse cx="15" cy="40" rx="7" ry="3.5" transform="rotate(-12 15 40)" fill="#68a95d"/><ellipse cx="42" cy="34" rx="7" ry="3.5" transform="rotate(12 42 34)" fill="#5b965f"/>`,
    birch: `
      <path d="M25 52L27 23H33L35 52Z" fill="#e7eadf" stroke="#667060" stroke-width="1"/>
      <path d="M27 30L32 29M26 38L31 37M29 45L34 44M28 25L31 25" stroke="#495046" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M29 27Q19 22 15 15M32 25Q40 21 43 14" stroke="#667060" stroke-width="2" stroke-linecap="round"/>
      <g fill="#6ea854"><circle cx="17" cy="17" r="9"/><circle cx="27" cy="12" r="10"/><circle cx="38" cy="16" r="9"/><circle cx="22" cy="23" r="8"/><circle cx="34" cy="23" r="9"/></g>
      <g fill="#8abb68" opacity="0.8"><circle cx="21" cy="12" r="6"/><circle cx="34" cy="10" r="7"/><circle cx="41" cy="20" r="5"/></g>`,
    blueberry: `
      <path d="M28 52Q27 38 28 24M28 40Q18 34 12 27M28 36Q38 29 45 23M28 29Q21 22 19 15" stroke="#4d693b" stroke-width="2.3" stroke-linecap="round"/>
      <g fill="#678f55"><ellipse cx="14" cy="25" rx="8" ry="4.5" transform="rotate(24 14 25)"/><ellipse cx="44" cy="21" rx="8" ry="4.5" transform="rotate(-22 44 21)"/><ellipse cx="19" cy="14" rx="7" ry="4" transform="rotate(18 19 14)"/><ellipse cx="33" cy="31" rx="7" ry="4" transform="rotate(-18 33 31)"/></g>
      <g fill="#506aa0"><circle cx="11" cy="32" r="5"/><circle cx="19" cy="36" r="5.5"/><circle cx="42" cy="29" r="5.5"/><circle cx="48" cy="35" r="4.5"/><circle cx="24" cy="19" r="4.5"/></g>
      <g fill="#d4d9e5" opacity="0.55"><circle cx="9" cy="30" r="1.2"/><circle cx="40" cy="27" r="1.2"/><circle cx="22" cy="17" r="1"/></g>`,
    amaranth_micro: `
      <path d="M12 54Q14 34 14 22M31 54Q29 31 32 18M51 54Q53 35 52 24M72 54Q70 28 73 16M94 54Q96 33 95 21M116 54Q114 29 117 17M138 54Q140 35 139 23M157 54Q155 37 157 27" stroke="#9a4058" stroke-width="2.3" stroke-linecap="round"/>
      <g fill="#b55368"><ellipse cx="10" cy="20" rx="9" ry="4.5" transform="rotate(-18 10 20)"/><ellipse cx="18" cy="19" rx="8" ry="4" transform="rotate(18 18 19)"/><ellipse cx="28" cy="16" rx="9" ry="4.5" transform="rotate(-18 28 16)"/><ellipse cx="37" cy="17" rx="8" ry="4" transform="rotate(18 37 17)"/><ellipse cx="48" cy="22" rx="9" ry="4.5" transform="rotate(-18 48 22)"/><ellipse cx="57" cy="21" rx="8" ry="4" transform="rotate(18 57 21)"/><ellipse cx="69" cy="14" rx="9" ry="4.5" transform="rotate(-18 69 14)"/><ellipse cx="78" cy="15" rx="8" ry="4" transform="rotate(18 78 15)"/><ellipse cx="91" cy="19" rx="9" ry="4.5" transform="rotate(-18 91 19)"/><ellipse cx="100" cy="20" rx="8" ry="4" transform="rotate(18 100 20)"/><ellipse cx="113" cy="15" rx="9" ry="4.5" transform="rotate(-18 113 15)"/><ellipse cx="122" cy="16" rx="8" ry="4" transform="rotate(18 122 16)"/><ellipse cx="135" cy="21" rx="9" ry="4.5" transform="rotate(-18 135 21)"/><ellipse cx="144" cy="22" rx="8" ry="4" transform="rotate(18 144 22)"/><ellipse cx="154" cy="25" rx="8" ry="4" transform="rotate(-18 154 25)"/><ellipse cx="162" cy="26" rx="7" ry="3.8" transform="rotate(18 162 26)"/></g>
      <g fill="#7f334c" opacity="0.72"><ellipse cx="32" cy="22" rx="5" ry="2.5"/><ellipse cx="73" cy="21" rx="5" ry="2.5"/><ellipse cx="117" cy="22" rx="5" ry="2.5"/></g>`,
  });

  function plantViewBox(id) {
    return MICROGREEN_IDS.includes(id) ? '0 0 168 56' : '0 0 56 56';
  }

  const ORDINARY_SHOP_CONFIG = {
    mint:       { category: 'herbs',   priceCoins: 30, fact: 'Мята быстро отрастает после срезки и ценится за прохладный аромат листьев.' },
    rosemary:   { category: 'herbs',   priceCoins: 55, fact: 'Розмарин медленно растёт, зато долго сохраняет аромат и хорошо переносит сухую почву.' },
    cucumber:   { category: 'veggies', priceCoins: 25, fact: 'Огурец любит частый полив и быстро формирует новые плоды.' },
    sunflower:  { category: 'flowers', priceCoins: 40, fact: 'Молодой подсолнух поворачивается вслед за солнцем в течение дня.' },
    strawberry: { category: 'shrubs',  priceCoins: 60, fact: 'Клубника образует новые кустики на длинных побегах, которые называют усами.' },
    violet:     { category: 'flowers', priceCoins: 35, fact: 'Фиалка хорошо цветёт при умеренной температуре и мягком рассеянном свете.' },
    aloe:       { category: 'herbs',   priceCoins: 70, fact: 'Алоэ запасает воду в плотных листьях и поэтому не требует частого полива.' },
    watermelon: { category: 'veggies', priceCoins: 50, fact: 'Арбуз состоит из воды более чем на девяносто процентов.' },
    oak:        { category: 'trees',   priceGems: 7,  fact: 'Дуб растёт медленно, но способен жить сотни лет.' },
    turnip:     { category: 'veggies', priceCoins: 20, fact: 'Репа неприхотлива, быстро созревает и хорошо переносит прохладную погоду.', isNew: true },
    chamomile:  { category: 'flowers', priceCoins: 40, fact: 'Ромашка раскрывает белые лепестки вокруг яркой жёлтой сердцевины.', isNew: true },
    birch:      { category: 'trees',   priceGems: 20, fact: 'Берёзу легко узнать по светлой коре с тёмными поперечными отметинами.', isNew: true },
    blueberry:  { category: 'shrubs',  priceCoins: 55, fact: 'Голубика предпочитает кислую почву и даёт ягоды с сизым восковым налётом.', isNew: true },
  };

  const NEW_MICROGREEN_META = {
    id: 'amaranth_micro',
    category: 'herbs',
    fact: 'Микрозелень амаранта выделяется малиновыми стеблями и мягким травянистым вкусом.',
  };

  function priceLabel(config) {
    return config.priceGems
      ? `💎 ${config.priceGems} гемов`
      : `🪙 ${config.priceCoins} монет`;
  }

  function appendCatalogCard(id, category, fact, tag, shopConfig) {
    const grid = document.querySelector(`#tab-${category} .catalog-grid`);
    if (!grid || document.querySelector(`.catalog-card[data-plant-id="${id}"]`)) return;
    const lockText = shopConfig ? `🔒 Доступно в Магазине за ${priceLabel(shopConfig)}` : '';
    grid.insertAdjacentHTML('beforeend', `
      <div class="catalog-card" data-plant-id="${id}" data-name="${PLANT_CATALOG[id]}" data-fact="${fact}" data-tag="${tag}"${shopConfig ? ` data-shop-id="${id}" data-locked-msg="${lockText}"` : ''}>
        <svg width="56" height="56" viewBox="${plantViewBox(id)}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${PLANT_SVG_INNER[id] || ''}</svg>
        <span class="catalog-card-name">${PLANT_CATALOG[id]}</span>
      </div>`);
  }

  function appendOrdinaryShopCard(id, config) {
    const grid = document.querySelector('#shop-panel-seeds .shop-seeds-grid');
    const reward = ORDINARY_REWARD[id] || [1, 5];
    const existing = document.querySelector(`.shop-seed-card[data-item-id="${id}"]`);
    if (!grid) return;
    if (existing) {
      if (!existing.querySelector('.shop-seed-reward')) {
        existing.querySelector('.shop-seed-price')?.insertAdjacentHTML(
          'beforebegin',
          `<span class="shop-seed-reward">${reward[0]}-${reward[1]} монет за полив</span>`
        );
      }
      return;
    }
    const priceData = config.priceGems
      ? `data-price-gems="${config.priceGems}"`
      : `data-price-coins="${config.priceCoins}"`;
    grid.insertAdjacentHTML('beforeend', `
      <div class="shop-seed-card" data-item-id="${id}" data-plant-id="${id}" ${priceData}>
        <div class="shop-seed-icon"><svg viewBox="${plantViewBox(id)}" fill="none" xmlns="http://www.w3.org/2000/svg" width="72" height="72" aria-hidden="true">${PLANT_SVG_INNER[id] || ''}</svg></div>
        <span class="shop-seed-name">${PLANT_CATALOG[id]}</span>
        <span class="shop-seed-reward">${reward[0]}-${reward[1]} монет за полив</span>
        <span class="shop-seed-price">${priceLabel(config)}</span>
        <button class="shop-buy-btn" data-action="buy">Купить</button>
        <span class="shop-insufficient">Недостаточно средств</span>
      </div>`);
  }

  function installExpandedPlantUI() {
    Object.entries(ORDINARY_SHOP_CONFIG).forEach(([id, config]) => {
      const existingCatalogCard = [...document.querySelectorAll('.catalog-card')]
        .find(card => card.dataset.name && card.dataset.name.toLocaleLowerCase('ru') === PLANT_CATALOG[id].toLocaleLowerCase('ru'));
      if (existingCatalogCard) {
        existingCatalogCard.dataset.plantId = id;
        existingCatalogCard.dataset.shopId = id;
        existingCatalogCard.dataset.lockedMsg = `🔒 Доступно в Магазине за ${priceLabel(config)}`;
      } else if (config.isNew) {
        appendCatalogCard(id, config.category, config.fact, config.category === 'veggies' ? 'овощи' : config.category === 'flowers' ? 'цветы' : config.category === 'trees' ? 'деревья' : 'кустарники', config);
      }
      appendOrdinaryShopCard(id, config);
    });

    appendCatalogCard(
      NEW_MICROGREEN_META.id,
      NEW_MICROGREEN_META.category,
      NEW_MICROGREEN_META.fact,
      'микрозелень',
      null
    );

    const microgreenGrid = document.querySelector('#shop-panel-microgreens .shop-seeds-grid');
    if (microgreenGrid && !document.querySelector('.shop-seed-card[data-plant-id="amaranth_micro"]')) {
      const reward = MICROGREEN_BASE_REWARD.amaranth_micro;
      microgreenGrid.insertAdjacentHTML('beforeend', `
        <div class="shop-seed-card" data-item-id="amaranth_micro_seeds" data-shop-kind="microgreen-culture" data-plant-id="amaranth_micro" data-price-coins="${MICROGREEN_UNLOCK_PRICE.amaranth_micro}">
          <div class="shop-seed-icon"><svg viewBox="${plantViewBox('amaranth_micro')}" fill="none" xmlns="http://www.w3.org/2000/svg" width="72" height="72" aria-hidden="true">${PLANT_SVG_INNER.amaranth_micro}</svg></div>
          <span class="shop-seed-name">Микрозелень амаранта</span>
          <span class="shop-seed-level">Не открыто</span>
          <span class="shop-seed-reward">${reward[0]}-${reward[1]} монет за полив</span>
          <span class="shop-seed-price">🪙 ${MICROGREEN_UNLOCK_PRICE.amaranth_micro} монет</span>
          <button class="shop-buy-btn" data-action="buy">Купить культуру</button>
          <span class="shop-insufficient">Недостаточно средств</span>
        </div>`);
    }
  }

  installExpandedPlantUI();

/* ═══════════════════════════════════════════════════════════════
     SCREEN ROUTING — single source of truth
     Every screen transition goes through showScreen(id).
     ═══════════════════════════════════════════════════════════════ */

  // All screen IDs in the document (hero is the .hero section inside <main>)
  const SCREEN_IDS = ['hero', 'screen-plants', 'screen-catalog',
                      'screen-planting', 'screen-garden', 'screen-shop'];

  function showScreen(id) {
    // Screen changes must never inherit a modal scroll lock. This also
    // recovers cleanly if the user leaves a dialog through the fixed nav.
    const warehouseModal = document.getElementById('warehouse-modal');
    if (warehouseModal) warehouseModal.hidden = true;
    document.body.classList.remove('warehouse-open');
    document.body.style.overflow = '';
    const plantModal = document.getElementById('modal-overlay');
    if (plantModal) plantModal.classList.remove('active');
    const weatherDetails = document.getElementById('weather-details');
    const weatherWidget = document.getElementById('weather-widget');
    if (weatherDetails) weatherDetails.hidden = true;
    if (weatherWidget) weatherWidget.setAttribute('aria-expanded', 'false');

    SCREEN_IDS.forEach(sid => {
      const el = sid === 'hero'
        ? document.querySelector('.hero')
        : document.getElementById(sid);
      if (!el) return;
      if (sid === id) {
        el.style.display = '';
        if (sid !== 'hero') el.classList.add('active');
      } else {
        if (sid === 'hero') el.style.display = 'none';
        el.classList.remove('active');
      }
    });
    // Nav-logo visibility: hidden only on catalog screen
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo) navLogo.style.visibility = id === 'screen-catalog' ? 'hidden' : '';
    const homeButton = document.getElementById('nav-home-btn');
    if (homeButton) {
      homeButton.disabled = id === 'hero';
      homeButton.setAttribute('aria-current', id === 'hero' ? 'page' : 'false');
    }
    document.body.dataset.screen = id;
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }

  // ── Convenience wrappers used by buttons/animations ────────────
  const hero    = document.querySelector('.hero');
  const plants  = document.getElementById('screen-plants');
  const catalog = document.getElementById('screen-catalog');

  function openHome()          { showScreen('hero'); }
  function openCatalog(tab)    {
    if (tab) activateTab(tab);
    refreshCatalogLocked();
    showScreen('screen-catalog');
  }
  function openPlantSelection() {
    renderPlantSelection();
    showScreen('screen-plants');
  }
  function openGarden(view = 'vegetables') {
    if (view === 'garden') view = 'vegetables';
    renderGarden();
    renderMicrogreens();
    showScreen('screen-garden');
    setGardenView(view);
    updateWeatherUi();
    updateWeatherCardStates();
    maybeShowWeatherIntro();
  }
  function openShop(tab) {
    showScreen('screen-shop');
    bindShopUI();   // idempotent – binds tabs & back btn on first call only
    if (tab) activateShopTab(tab);
    renderShopItems();
  }

  // ── Shop item purchase state ────────────────────────────────────
  function isPurchased(itemId) {
    return localStorage.getItem('purchased_' + itemId) === 'true';
  }
  function setPurchased(itemId) {
    localStorage.setItem('purchased_' + itemId, 'true');
  }
  function isPlanted(plantId) {
    return getGarden().some(p => p.id === plantId);
  }

  function renderShopItems() {
    document.querySelectorAll('.shop-seed-card').forEach(card => {
      const itemId  = card.dataset.itemId;
      const plantId = card.dataset.plantId;
      const shopKind = card.dataset.shopKind;
      const btn     = card.querySelector('.shop-buy-btn');
      if (!btn) return;

      if (shopKind === 'microgreen-tray') {
        const count = getMicrogreenTrayCount();
        card.dataset.priceCoins = '100';
        const levelEl = card.querySelector('.shop-seed-level');
        if (levelEl) levelEl.textContent = `Лотков: ${count}`;
        btn.textContent = count >= MICROGREEN_MAX_TRAYS ? 'Достигнут максимум' : 'Купить ещё лоток';
        btn.disabled = count >= MICROGREEN_MAX_TRAYS;
        return;
      }

      if (shopKind === 'microgreen-culture') {
        const level = getMicrogreenLevel(plantId);
        const nextPrice = microgreenNextPrice(plantId);
        const premiumGemUnlock = plantId === 'shiso_micro' && level === 0;
        const reward = microgreenRewardRange(plantId);
        const levelEl = card.querySelector('.shop-seed-level');
        const priceEl = card.querySelector('.shop-seed-price');
        const rewardEl = card.querySelector('.shop-seed-reward');
        if (levelEl) levelEl.textContent = level ? `Уровень ${level} из 10` : 'Не открыто';
        if (rewardEl) rewardEl.textContent = `${reward[0]}–${reward[1]} монет за полив`;
        if (nextPrice === null) {
          priceEl.textContent = 'Максимальный уровень';
          btn.textContent = 'Уровень 10';
          btn.disabled = true;
        } else {
          if (premiumGemUnlock) {
            delete card.dataset.priceCoins;
            card.dataset.priceGems = '50';
            priceEl.textContent = '💎 50 гемов';
          } else {
            delete card.dataset.priceGems;
            card.dataset.priceCoins = String(nextPrice);
            priceEl.textContent = `🪙 ${nextPrice} монет`;
          }
          btn.textContent = level ? `Улучшить до уровня ${level + 1}` : 'Купить культуру';
          btn.disabled = false;
        }
        return;
      }

      if (plantId && isPlanted(plantId)) {
        btn.textContent = 'Уже посажено';
        btn.disabled = true;
      } else if (isPurchased(itemId)) {
        btn.textContent = 'Куплено ✓';
        btn.disabled = true;
      } else {
        btn.textContent = 'Купить';
        btn.disabled = false;
      }
    });
  }

  // Event delegation for every shop category — handles all buy buttons
  document.addEventListener('DOMContentLoaded', () => {
    const shopScreen = document.getElementById('screen-shop');
    if (!shopScreen) return;
    shopScreen.addEventListener('click', e => {
      const btn = e.target.closest('[data-action="buy"]');
      if (!btn || btn.disabled) return;
      const card       = btn.closest('.shop-seed-card');
      const itemId     = card.dataset.itemId;
      const shopKind   = card.dataset.shopKind;
      const plantId    = card.dataset.plantId;
      const priceCoins = card.dataset.priceCoins ? parseInt(card.dataset.priceCoins, 10) : null;
      const priceGems  = card.dataset.priceGems  ? parseInt(card.dataset.priceGems,  10) : null;
      const errEl      = card.querySelector('.shop-insufficient');

      function showError() {
        errEl.classList.add('visible');
        setTimeout(() => errEl.classList.remove('visible'), 2000);
      }

      // Validate balance upfront
      if (priceCoins !== null && getCoins() < priceCoins) { showError(); return; }
      if (priceGems  !== null && getGems()  < priceGems)  { showError(); return; }

      // Disable button immediately so double-clicks are ignored
      btn.disabled = true;
      btn.textContent = '...';

      // Source pill rect and card rect for the arc
      const PARTICLE_COUNT = 4;
      const STAGGER        = 80;   // ms between particles
      const DURATION       = 600;  // ms flight time

      function finalisePurchase() {
        if (priceCoins !== null) setCoins(getCoins() - priceCoins);
        if (priceGems  !== null) setGems(getGems()  - priceGems);

        if (shopKind === 'microgreen-tray') {
          setMicrogreenTrayCount(getMicrogreenTrayCount() + 1);
        } else if (shopKind === 'microgreen-culture') {
          setMicrogreenLevel(plantId, getMicrogreenLevel(plantId) + 1);
        } else {
          setPurchased(itemId);
        }

        renderShopItems();
        renderMicrogreens();
      }

      let landed = 0;
      function onLand() {
        landed++;
        if (landed === PARTICLE_COUNT) {
          finalisePurchase();
        }
      }

      if (priceCoins !== null) {
        const srcEl = document.getElementById('coins-count');
        const srcRect  = srcEl ? srcEl.getBoundingClientRect() : card.getBoundingClientRect();
        const destRect = card.getBoundingClientRect();
        flyBetween(srcRect, destRect, PARTICLE_COUNT, 'flying-coin', '✦', STAGGER, DURATION, onLand);
      } else if (priceGems !== null) {
        const srcEl = document.getElementById('gems-count');
        const srcRect  = srcEl ? srcEl.getBoundingClientRect() : card.getBoundingClientRect();
        const destRect = card.getBoundingClientRect();
        flyBetween(srcRect, destRect, PARTICLE_COUNT, 'flying-gem', '◆', STAGGER, DURATION, onLand);
      } else {
        finalisePurchase();
      }
    });
  });


  // ── Start-growing entry point ───────────────────────────────────
  function handleStartGrowing() {
    if (getGarden().length > 0) openGarden();
    else openPlantSelection();
  }

  // ── Buttons available at parse time (hero, catalog, plants) ────
  document.getElementById('btn-start').addEventListener('click', handleStartGrowing);

  const navStartButton = document.querySelector('.nav-actions > .btn-filled');
  if (navStartButton) {
    navStartButton.addEventListener('click', e => {
      e.preventDefault();
      handleStartGrowing();
    });
  }

  const navLogoLink = document.querySelector('.nav-logo');
  if (navLogoLink) {
    navLogoLink.addEventListener('click', e => {
      e.preventDefault();
      openHome();
    });
  }

  document.getElementById('btn-catalog').addEventListener('click', () => openCatalog());

  document.getElementById('btn-back').addEventListener('click', openHome);

  document.getElementById('btn-back-catalog').addEventListener('click', openHome);

  document.getElementById('nav-shop-btn').addEventListener('click', e => {
    e.preventDefault();
    openShop();
  });

  document.getElementById('nav-home-btn').addEventListener('click', openHome);

  // ── Catalog tabs ───────────────────────────────────────────────
  function activateTab(tabName) {
    const btn = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
    if (!btn) return;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById('tab-' + tabName).classList.add('active');
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Trust-strip category tags → catalog on the matching tab
  document.querySelectorAll('.trust-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => openCatalog(item.dataset.tab));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
    });
  });

  // ── Shop tabs + back button — bound lazily on first openShop() ─
  let shopUIBound = false;
  function activateShopTab(tabName) {
    const btn = document.querySelector('.shop-tab-btn[data-shop-tab="' + tabName + '"]');
    if (!btn) return;
    document.querySelectorAll('.shop-tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.shop-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const panel = document.getElementById('shop-panel-' + tabName);
    if (panel) panel.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function bindShopUI() {
    if (shopUIBound) return;
    shopUIBound = true;

    document.getElementById('btn-shop-back').addEventListener('click', () => {
      if (getGarden().length > 0) openGarden(activeGardenView);
      else openHome();
    });

    // Use event delegation on the tab strip so it always works
    const tabStrip = document.querySelector('.shop-tabs');
    if (tabStrip) {
      tabStrip.addEventListener('click', e => {
        const btn = e.target.closest('.shop-tab-btn');
        if (!btn) return;
        activateShopTab(btn.dataset.shopTab);
      });
    }
  }

  // ── Modal ──────────────────────────────────────────────────────
  const overlay   = document.getElementById('modal-overlay');
  const modalName = document.getElementById('modal-plant-name');
  const modalFact = document.getElementById('modal-plant-fact');
  const modalTag  = document.getElementById('modal-plant-tag');
  const modalIcon = document.getElementById('modal-icon');

  document.querySelectorAll('.catalog-card').forEach(card => {
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
    card.addEventListener('click', () => {
      // Shop plant that isn't purchased yet — show lock message instead
      const shopId = card.dataset.shopId;
      if (shopId && !isPurchased(shopId) && !isPlanted(shopId)) {
        modalName.textContent = card.dataset.name;
        modalFact.textContent = card.dataset.lockedMsg || '🔒 Доступно в Магазине';
        modalTag.textContent  = card.dataset.tag;
        const srcSvg = card.querySelector('svg');
        modalIcon.innerHTML = srcSvg.innerHTML;
        modalIcon.setAttribute('viewBox', srcSvg.getAttribute('viewBox'));
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        return;
      }
      modalName.textContent = card.dataset.name;
      modalFact.textContent = card.dataset.fact;
      modalTag.textContent  = card.dataset.tag;
      const srcSvg = card.querySelector('svg');
      modalIcon.innerHTML = srcSvg.innerHTML;
      modalIcon.setAttribute('viewBox', srcSvg.getAttribute('viewBox'));
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  // Apply/remove locked style on shop cards whenever the catalog opens
  function refreshCatalogLocked() {
    document.querySelectorAll('.catalog-card[data-shop-id]').forEach(card => {
      const purchased = isPurchased(card.dataset.shopId) || isPlanted(card.dataset.shopId);
      card.classList.toggle('locked', !purchased);
    });
  }

  function closeModal() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.getElementById('modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ── Plant selection ────────────────────────────────────────────
  // SVG icons for the plant-selection screen (56×56 viewBox, same style as base plants)
  const SHOP_PLANT_ICON_SVG = {
    watermelon: `
      <path d="M28 48 Q28 36 28 26" stroke="#2d5a1e" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M28 34 Q18 28 14 20 Q20 17 27 26Z" fill="#3a7a28" opacity="0.85"/>
      <path d="M28 34 Q38 28 42 20 Q36 17 29 26Z" fill="#4a8e30" opacity="0.8"/>
      <ellipse cx="28" cy="19" rx="9" ry="6" fill="#5cb035" opacity="0.9"/>
      <path d="M22 19 Q25 17 28 19 Q31 17 34 19" stroke="#2d5a1e" stroke-width="0.7" fill="none" opacity="0.5"/>
      <ellipse cx="28" cy="10" rx="6" ry="4" fill="#e74c3c" opacity="0.85"/>
      <circle cx="26" cy="10" r="0.8" fill="#1a1a1a" opacity="0.7"/>
      <circle cx="30" cy="9" r="0.8" fill="#1a1a1a" opacity="0.7"/>`,
    oak: `
      <path d="M28 48 Q28 34 28 24" stroke="#5a3d1e" stroke-width="3" stroke-linecap="round"/>
      <path d="M28 36 Q20 30 18 22 Q24 19 28 28Z" fill="#4a7c3a" opacity="0.85"/>
      <ellipse cx="28" cy="20" rx="11" ry="8" fill="#5a9040"/>
      <path d="M18 22 Q19 18 22 20 Q20 16 23 17 Q22 13 25 15 Q24 11 28 12 Q32 11 31 15 Q34 13 33 17 Q36 16 34 20 Q37 18 38 22" stroke="#3a6b2e" stroke-width="0.8" fill="none" stroke-linecap="round"/>
      <ellipse cx="28" cy="8" rx="5" ry="3.5" fill="#7b5e3a"/>
      <ellipse cx="28" cy="8" rx="4" ry="2" fill="#c8843a" opacity="0.9"/>
      <rect x="26.5" y="4" width="3" height="5" rx="1.5" fill="#5a3d1e"/>`,
  };

  function renderPlantSelection() {
    const planted = new Set(getGarden().map(p => p.id));
    const grid    = document.querySelector('#screen-plants .plants-grid');

    // Mark base plant cards as planted/not planted
    document.querySelectorAll('#screen-plants .plant-card[data-base]').forEach(card => {
      card.classList.toggle('is-planted', planted.has(card.dataset.id));
    });

    // Remove any previously injected shop cards and re-inject fresh ones
    document.querySelectorAll('#screen-plants .plant-card[data-shop]').forEach(c => c.remove());

    SHOP_PLANT_IDS.forEach(id => {
      if (!isPurchased(id)) return;          // not bought yet
      const name = PLANT_CATALOG[id];
      const icon = SHOP_PLANT_ICON_SVG[id] || PLANT_SVG_INNER[id] || '';

      const card = document.createElement('div');
      card.className = 'plant-card';
      card.dataset.id   = id;
      card.dataset.shop = '1';              // marks it as dynamically injected
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.style.cursor = 'pointer';
      if (planted.has(id)) card.classList.add('is-planted');

      card.innerHTML = `
        <svg class="plant-icon" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          ${icon}
        </svg>
        <span class="plant-name">${name}</span>`;

      card.addEventListener('click', () => {
        if (card.classList.contains('is-planted')) return;
        openPlanting(id, name);
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });

      grid.appendChild(card);
    });
  }

  // Mark all hard-coded (base) plant cards so renderPlantSelection
  // can distinguish them from shop-injected ones
  document.querySelectorAll('#screen-plants .plant-card').forEach(card => {
    if (!BASE_PLANT_IDS.includes(card.dataset.id)) {
      card.remove();
      return;
    }
    card.dataset.base = '1';
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      if (card.classList.contains('is-planted')) return;
      openPlanting(card.dataset.id, card.querySelector('.plant-name').textContent);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  let currentPlantingId = null;

  function openPlanting(plantId, plantName) {
    currentPlantingId = plantId;
    const isMicrogreen = MICROGREEN_IDS.includes(plantId);
    document.getElementById('screen-planting').classList.toggle('is-microgreen', isMicrogreen);
    document.querySelector('.planting-hint').textContent = isMicrogreen
      ? 'перетащи пакетик семян к лотку'
      : 'перетащи пакетик семян к горшку';
    document.getElementById('back-planting-label').textContent = isMicrogreen
      ? 'Назад к микрозелени' : 'Назад к растениям';
    document.getElementById('seed-label').textContent = plantName;
    document.getElementById('btn-plant-more').textContent = 'Посадить ещё';
    const seedPlantSvg = document.getElementById('seed-plant-svg');
    if (seedPlantSvg) {
      seedPlantSvg.innerHTML = PLANT_SVG_INNER[plantId] || '';
      seedPlantSvg.setAttribute('viewBox', plantViewBox(plantId));
    }
    const finalPlantSvg = document.getElementById('plant-final-svg');
    finalPlantSvg.setAttribute('viewBox', plantViewBox(plantId));
    finalPlantSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    showScreen('screen-planting');
    resetPlanting();
  }

  // ── Planting-screen drag & drop (deferred — element is below this script) ─
  document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('btn-back-planting').addEventListener('click', () => {
      if (MICROGREEN_IDS.includes(currentPlantingId)) openGarden('microgreens');
      else openPlantSelection();
    });

    const seedEl  = document.getElementById('seed-bag');
    const potZone = document.getElementById('pot-zone');

    let dragging = false;
    let pointerOffsetX = 0, pointerOffsetY = 0;
    let originLeft = 0, originTop = 0;

    function setSeedFixed() {
      const rect = seedEl.getBoundingClientRect();
      originLeft = rect.left;
      originTop  = rect.top;
      seedEl.style.position = 'fixed';
      seedEl.style.left = originLeft + 'px';
      seedEl.style.top  = originTop  + 'px';
      seedEl.style.margin = '0';
    }

    function onPointerDown(e) {
      if (seedEl.dataset.done === '1') return;
      e.preventDefault();
      dragging = true;
      const rect = seedEl.getBoundingClientRect();
      pointerOffsetX = e.clientX - rect.left;
      pointerOffsetY = e.clientY - rect.top;
      setSeedFixed();
      seedEl.style.transition = 'none';
      seedEl.style.zIndex = '9999';
      seedEl.classList.add('dragging');
      document.addEventListener('pointermove', onPointerMove, { passive: false });
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(e) {
      if (!dragging) return;
      if (e.cancelable) e.preventDefault();
      seedEl.style.left = (e.clientX - pointerOffsetX) + 'px';
      seedEl.style.top  = (e.clientY - pointerOffsetY) + 'px';
      const potRect  = potZone.getBoundingClientRect();
      const seedRect = seedEl.getBoundingClientRect();
      const overlap  = !(seedRect.right < potRect.left || seedRect.left > potRect.right ||
                         seedRect.bottom < potRect.top || seedRect.top > potRect.bottom);
      seedEl.classList.toggle('over-pot', overlap);
    }

    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      const potRect  = potZone.getBoundingClientRect();
      const seedRect = seedEl.getBoundingClientRect();
      const overlap  = !(seedRect.right < potRect.left || seedRect.left > potRect.right ||
                         seedRect.bottom < potRect.top || seedRect.top > potRect.bottom);
      seedEl.classList.remove('over-pot', 'dragging');
      if (overlap) {
        triggerPlanting();
      } else {
        seedEl.style.transition = 'left 0.3s ease, top 0.3s ease';
        seedEl.style.left = originLeft + 'px';
        seedEl.style.top  = originTop  + 'px';
        setTimeout(() => {
          seedEl.style.position = '';
          seedEl.style.left = '';
          seedEl.style.top  = '';
          seedEl.style.margin = '';
          seedEl.style.transition = '';
          seedEl.style.zIndex = '';
        }, 320);
      }
    }

    seedEl.addEventListener('pointerdown', onPointerDown);

    function positionSeedStream() {
      const soilEl = document.getElementById(
        MICROGREEN_IDS.includes(currentPlantingId) ? 'microgreen-soil' : 'pot-soil'
      );
      const pourPointEl = document.getElementById('seed-pour-point');
      const streamEl = document.getElementById('seeds-anim');
      if (!soilEl || !pourPointEl || !streamEl) return;

      const zoneRect = potZone.getBoundingClientRect();
      const soilRect = soilEl.getBoundingClientRect();
      const pourRect = pourPointEl.getBoundingClientRect();
      const startX = pourRect.left + pourRect.width / 2 - zoneRect.left;
      const startY = pourRect.top + pourRect.height / 2 - zoneRect.top;
      const soilY = soilRect.top + soilRect.height / 2 - zoneRect.top;

      streamEl.style.left = startX + 'px';
      streamEl.style.top = startY + 'px';
      streamEl.style.height = Math.max(36, soilY - startY) + 'px';
    }

    function alignFinalPlantToSoil() {
      const finalEl = document.getElementById('plant-final-anim');
      const soilEl = document.getElementById(
        MICROGREEN_IDS.includes(currentPlantingId) ? 'microgreen-soil' : 'pot-soil'
      );
      if (!finalEl || !soilEl) return;
      const zoneRect = potZone.getBoundingClientRect();
      const soilRect = soilEl.getBoundingClientRect();
      const soilLine = soilRect.top + soilRect.height / 2;
      finalEl.style.bottom = Math.max(0, zoneRect.bottom - soilLine) + 'px';
    }

    function triggerPlanting() {
      seedEl.dataset.done = '1';
      seedEl.style.pointerEvents = 'none';
      document.getElementById('screen-planting').classList.add('is-pouring');
      const soilEl = document.getElementById(
        MICROGREEN_IDS.includes(currentPlantingId) ? 'microgreen-soil' : 'pot-soil'
      );
      const soilRect = soilEl.getBoundingClientRect();
      const seedRect = seedEl.getBoundingClientRect();

      // Move the upright packet directly above the soil. Its centre stays
      // aligned to the pot while the following rotation creates the pour.
      seedEl.style.transition = 'left 0.32s ease, top 0.32s ease';
      seedEl.style.left = (soilRect.left + soilRect.width / 2 - seedRect.width / 2) + 'px';
      seedEl.style.top  = (soilRect.top - seedRect.height + 4) + 'px';
      setTimeout(() => {
        seedEl.classList.add('tilting');
        setTimeout(() => {
          positionSeedStream();
          document.getElementById('seeds-anim').classList.add('active');
          setTimeout(() => {
            seedEl.style.opacity = '0';
            setTimeout(() => {
              document.getElementById('seeds-anim').classList.remove('active');
              const finalEl  = document.getElementById('plant-final-anim');
              const finalSvg = document.getElementById('plant-final-svg');
              finalSvg.innerHTML = (currentPlantingId && PLANT_SVG_INNER[currentPlantingId])
                ? PLANT_SVG_INNER[currentPlantingId] : '';
              Array.from(finalSvg.children).forEach((part, index) => {
                part.style.setProperty('--plant-part-delay', Math.min(index, 10) * 55 + 'ms');
                part.style.setProperty('--plant-part-opacity', part.getAttribute('opacity') || '1');
              });

              alignFinalPlantToSoil();
              document.getElementById('pot-svg').classList.add('sprouting');
              finalEl.classList.add('active', 'growing');

              const PLANT_GROW_MS = 1550;
              setTimeout(() => {
                finalEl.classList.remove('growing');
                finalEl.classList.add('grown');
                if (currentPlantingId) {
                  addToGarden(currentPlantingId, PLANT_CATALOG[currentPlantingId] || currentPlantingId);
                }
                updatePlantingSuccessActions();
                document.getElementById('planting-success').classList.add('active');
              }, PLANT_GROW_MS);
            }, 800);
          }, 780);
        }, 650);
      }, 340);
    }

    window.resetPlanting = function() {
      seedEl.classList.remove('tilting', 'over-pot', 'dragging');
      ['transform','transition','position','left','top','margin','zIndex','opacity','pointerEvents']
        .forEach(p => { seedEl.style[p] = ''; });
      delete seedEl.dataset.done;
      document.getElementById('screen-planting').classList.remove('is-pouring');
      const seedStream = document.getElementById('seeds-anim');
      seedStream.classList.remove('active');
      seedStream.style.left = '';
      seedStream.style.top = '';
      seedStream.style.height = '';
      const finalEl = document.getElementById('plant-final-anim');
      finalEl.classList.remove('active', 'growing', 'grown');
      finalEl.style.bottom = '';
      document.getElementById('plant-final-svg').innerHTML = '';
      document.getElementById('planting-success').classList.remove('active');
      document.getElementById('pot-svg').classList.remove('sprouting');
    };

    // ── Initial screen on load ────────────────────────────────────
    // Run here (inside DOMContentLoaded) so ALL screens are in the DOM,
    // including #screen-shop which is defined after this script block.
    if (getGarden().length > 0) openGarden();
    else openHome();
  });

  if (typeof window.resetPlanting !== 'function') {
    window.resetPlanting = function () {};
  }
  function resetPlanting() { window.resetPlanting(); }

/* ── Planting success buttons ───────────────────────────────── */
  function updatePlantingSuccessActions() {
    const isMicrogreen = MICROGREEN_IDS.includes(currentPlantingId);
    const planted = new Set(getGarden().map(plant => plant.id));
    const canPlantAnother = isMicrogreen
      ? getGarden().filter(plant => MICROGREEN_IDS.includes(plant.id)).length < getMicrogreenTrayCount() &&
        MICROGREEN_IDS.some(id => getMicrogreenLevel(id) > 0 && !planted.has(id))
      : [...BASE_PLANT_IDS, ...SHOP_PLANT_IDS.filter(id => isPurchased(id))]
        .some(id => !planted.has(id));
    const plantMoreButton = document.getElementById('btn-plant-more');
    plantMoreButton.hidden = !canPlantAnother;
    plantMoreButton.disabled = !canPlantAnother;
    plantMoreButton.textContent = 'Посадить ещё';
  }

  document.getElementById('btn-plant-more').addEventListener('click', () => {
    if (MICROGREEN_IDS.includes(currentPlantingId)) openGarden('microgreens');
    else openPlantSelection();
  });

  document.getElementById('btn-go-garden').addEventListener('click', () => {
    openGarden(MICROGREEN_IDS.includes(currentPlantingId)
      ? 'microgreens'
      : (PLANT_CATEGORY[currentPlantingId] || 'vegetables'));
  });

  /* ── "Мой сад" screen ──────────────────────────────────────── */
  function potSvgMarkup(plant) {
    // Same pot shape/colors as the planting screen, scaled down via viewBox.
    const inner = PLANT_SVG_INNER[plant.id] || '';
    const isLarge = plant.potLevel === 2;
    const growthStage = Math.max(0, Math.min(6, Number(plant.growthPoints) || 0));
    const potMarkup = isLarge
      ? `<path d="M22 55 L39 177 C40 184, 61 188, 90 188 C119 188, 140 184, 141 177 L158 55 Z" fill="#cf6b31"/>
         <path d="M20 55 C20 45, 51 38, 90 38 C129 38, 160 45, 160 55 C160 65, 129 73, 90 73 C51 73, 20 65, 20 55Z" fill="#e2854a"/>
         <ellipse cx="90" cy="54" rx="57" ry="13" fill="#3e2a1c"/>`
      : `<path d="M32 59 L46 175 C47 180, 65 183, 90 183 C115 183, 133 180, 134 175 L148 59 Z" fill="#dd7536"/>
         <path d="M32 59 C32 51, 58 45, 90 45 C122 45, 148 51, 148 59 C148 67, 122 73, 90 73 C58 73, 32 67, 32 59Z" fill="#e2854a"/>
         <ellipse cx="90" cy="58" rx="46" ry="11" fill="#3e2a1c"/>`;
    return `
      <svg class="garden-pot-svg${isLarge ? ' garden-pot-svg--large' : ''}" viewBox="0 0 180 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="90" cy="186" rx="55" ry="7" fill="#0a1d08" opacity="0.10"/>
        ${potMarkup}
      </svg>
      <div class="garden-plant garden-growth-stage-${growthStage}${isLarge ? ' in-large-pot' : ''}">
        <svg class="garden-plant-svg" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">${inner}</svg>
      </div>
    `;
  }

  function renderGarden(category = activeGardenView) {
    const grid = document.getElementById('garden-grid');
    const empty = document.getElementById('garden-empty');
    const garden = getGarden();
    const ordinaryPlants = garden
      .map((plant, index) => ({ plant, index }))
      .filter(({ plant }) => isOrdinaryPlant(plant) && PLANT_CATEGORY[plant.id] === category);

    if (!ordinaryPlants.length) {
      grid.innerHTML = '';
      empty.textContent = `В разделе «${GARDEN_CATEGORY_LABEL[category] || 'Сад'}» пока пусто. Посади первое растение.`;
      empty.style.display = 'block';
      grid.style.display = 'none';
    } else {
      empty.style.display = 'none';
      grid.style.display = 'grid';

      grid.innerHTML = ordinaryPlants.map(({ plant: p, index: i }) => {
        const needsPot = plantNeedsPotUpgrade(p);
        const harvestReady = plantIsHarvestReady(p);
        const wilted = plantIsWilted(p);
        const categoryId = PLANT_CATEGORY[p.id] || 'herbs';
        const potPrice = LARGE_POT_PRICE[categoryId] || 55;
        const stateClass = wilted ? ' is-wilted' : harvestReady ? ' is-harvest-ready' : needsPot ? ' needs-pot-upgrade' : '';
        const action = needsPot
          ? `<button class="garden-state-action" data-garden-action="upgrade-pot" type="button">Большой горшок · ${potPrice} монет</button>`
          : harvestReady
            ? `<button class="garden-state-action garden-state-action--harvest" data-garden-action="harvest" type="button">Собрать урожай</button>`
            : wilted
              ? `<button class="garden-state-action garden-state-action--muted" data-garden-action="clear-wilted" type="button">Убрать увядшее</button>`
              : '';
        return `
        <div class="garden-pot-card${stateClass}" data-garden-index="${i}">
          <div class="garden-pot-zone">${potSvgMarkup(p)}</div>
          <span class="garden-pot-name">${PLANT_CATALOG[p.id] || p.name}</span>
          <span class="growth-caption">${p.potLevel === 2 ? 'большой горшок' : 'маленький горшок'} · рост ${Math.min(6, p.growthPoints || 0)}/6</span>
          <span class="water-timer-pill" id="water-timer-${i}">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M5 1C5 1 8 4.6 8 6.5C8 8.2 6.6 9 5 9C3.4 9 2 8.2 2 6.5C2 4.6 5 1 5 1Z" fill="#3b82c4" opacity="0.85"/>
            </svg>
            <span class="water-timer-text"></span>
          </span>
          ${action}
        </div>
      `; }).join('');
    }

    tickWaterTimers();

    // "Посадить ещё" — disable when all *available* plants are planted
    // Available = base 10 + any shop plants the user has purchased
    const availableIds = [...BASE_PLANT_IDS,
                          ...SHOP_PLANT_IDS.filter(id => isPurchased(id))];
    const plantedSet   = new Set(garden.map(p => p.id));
    const remaining    = availableIds.filter(id => !plantedSet.has(id)).length;
    const btnMore = document.getElementById('btn-garden-plant-more');
    if (remaining <= 0) {
      btnMore.textContent = 'Все растения посажены 🌿';
      btnMore.disabled = true;
    } else {
      btnMore.textContent = 'Посадить ещё';
      btnMore.disabled = false;
    }
  }

  function microgreenTrayMarkup(plant) {
    const inner = plant ? (PLANT_SVG_INNER[plant.id] || '') : '';
    return `
      <div class="microgreen-tray-zone">
        ${plant ? `<div class="microgreen-canopy"><svg viewBox="${plantViewBox(plant.id)}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${inner}</svg></div>` : ''}
        <svg class="microgreen-tray-svg" viewBox="0 0 360 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <ellipse cx="180" cy="164" rx="138" ry="10" fill="#0a1d08" opacity="0.09"/>
          <path d="M34 78 H326 L306 148 Q304 156 294 156 H66 Q56 156 54 148Z" fill="#c86f38"/>
          <rect x="22" y="56" width="316" height="48" rx="18" fill="#df8250"/>
          <rect x="42" y="67" width="276" height="25" rx="12.5" fill="#3e2a1c"/>
          <path d="M46 103 H314" stroke="#b95f30" stroke-width="3" opacity="0.55"/>
        </svg>
      </div>`;
  }

  function renderMicrogreens() {
    const grid = document.getElementById('microgreens-grid');
    if (!grid) return;
    const trayCount = getMicrogreenTrayCount();
    const microgreens = getGarden()
      .map((plant, index) => ({ plant, index }))
      .filter(({ plant }) => plant.kind === 'microgreen' || MICROGREEN_IDS.includes(plant.id));

    grid.innerHTML = Array.from({ length: trayCount }, (_, slotIndex) => {
      const entry = microgreens[slotIndex];
      if (!entry) {
        return `<div class="microgreen-tray-card is-empty">
          ${microgreenTrayMarkup(null)}
          <span class="microgreen-empty-label">свободный лоток</span>
        </div>`;
      }

      const p = entry.plant;
      const i = entry.index;
      const level = Math.max(1, getMicrogreenLevel(p.id));
      const reward = microgreenRewardRange(p.id);
      return `<div class="microgreen-tray-card garden-pot-card" data-garden-index="${i}">
          ${microgreenTrayMarkup(p)}
          <span class="microgreen-tray-name">${PLANT_CATALOG[p.id] || p.name}</span>
          <span class="microgreen-tray-meta">уровень ${level} · ${reward[0]}–${reward[1]} монет</span>
          <span class="water-timer-pill" id="water-timer-${i}">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M5 1C5 1 8 4.6 8 6.5C8 8.2 6.6 9 5 9C3.4 9 2 8.2 2 6.5C2 4.6 5 1 5 1Z" fill="#3b82c4" opacity="0.85"/>
            </svg>
            <span class="water-timer-text"></span>
          </span>
        </div>`;
    }).join('');

    const actions = document.getElementById('microgreen-actions');
    const plantedIds = new Set(microgreens.map(({ plant }) => plant.id));
    const unlockedUnplanted = MICROGREEN_IDS.filter(id =>
      getMicrogreenLevel(id) > 0 && !plantedIds.has(id)
    );
    const hasFreeTray = microgreens.length < trayCount;

    if (hasFreeTray && unlockedUnplanted.length) {
      actions.innerHTML = unlockedUnplanted.map(id =>
        `<button class="btn btn-filled" data-microgreen-action="plant" data-plant-id="${id}">Посадить ${PLANT_CATALOG[id]}</button>`
      ).join('');
    } else if (!hasFreeTray) {
      actions.innerHTML = `<button class="btn btn-ghost" data-microgreen-action="shop">Купить ещё лоток</button>`;
    } else if (MICROGREEN_IDS.some(id => getMicrogreenLevel(id) === 0)) {
      actions.innerHTML = `<button class="btn btn-ghost" data-microgreen-action="shop">Открыть новую культуру</button>`;
    } else {
      actions.innerHTML = `<button class="btn btn-ghost" disabled>Все доступные культуры посажены</button>`;
    }
    tickWaterTimers();
  }

  let activeGardenView = 'vegetables';
  function setGardenView(view) {
    if (view === 'garden') view = 'vegetables';
    activeGardenView = view === 'microgreens' || GARDEN_CATEGORY_LABEL[view] ? view : 'vegetables';
    const gardenActive = activeGardenView !== 'microgreens';
    document.querySelectorAll('[data-garden-view]').forEach(button => {
      const active = button.dataset.gardenView === activeGardenView;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.getElementById('garden-view-panel').classList.toggle('active', gardenActive);
    document.getElementById('microgreens-view-panel').classList.toggle('active', !gardenActive);
    if (gardenActive) renderGarden(activeGardenView);
    else renderMicrogreens();
  }

  document.querySelector('.garden-view-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-garden-view]');
    if (button) setGardenView(button.dataset.gardenView);
  });
  document.getElementById('microgreen-actions').addEventListener('click', e => {
    const btn = e.target.closest('[data-microgreen-action]');
    if (!btn || btn.disabled) return;
    if (btn.dataset.microgreenAction === 'shop') {
      openShop('microgreens');
      return;
    }
    const plantId = btn.dataset.plantId;
    if (plantId && getMicrogreenLevel(plantId) > 0 && !isPlanted(plantId)) {
      openPlanting(plantId, PLANT_CATALOG[plantId]);
    }
  });

  /* Recomputes every visible timer from real timestamps (not an internal
     counter), so it stays correct even after the tab/site was closed and
     reopened. Runs once a second; cheap no-op when the garden screen
     isn't showing any cards. */
  function tickWaterTimers() {
    const garden = getGarden();
    garden.forEach((p, i) => {
      const pillText = document.querySelector('#water-timer-' + i + ' .water-timer-text');
      const pill = document.getElementById('water-timer-' + i);
      const card = pill ? pill.closest('.garden-pot-card') : null;
      if (!pillText || !pill || !card) return;

      if (plantIsWilted(p)) {
        if (!card.classList.contains('is-wilted') && activeGardenView !== 'microgreens') {
          renderGarden(activeGardenView);
          return;
        }
        pillText.textContent = 'урожай увял';
        pill.classList.remove('water-timer-pill--ready');
        card.classList.remove('ready-to-water');
        return;
      }
      if (plantIsHarvestReady(p)) {
        const timeLeft = p.harvestReadyAt + HARVEST_WINDOW_MS - Date.now();
        pillText.textContent = `собрать: ${formatMMSS(timeLeft)}`;
        pill.classList.add('water-timer-pill--harvest');
        pill.classList.remove('water-timer-pill--ready');
        card.classList.remove('ready-to-water');
        return;
      }
      if (plantNeedsPotUpgrade(p)) {
        pillText.textContent = 'тесно в горшке';
        pill.classList.remove('water-timer-pill--ready', 'water-timer-pill--harvest');
        card.classList.remove('ready-to-water');
        return;
      }

      const remaining = msUntilNextWater(p);
      if (remaining <= 0) {
        pillText.textContent = 'полить!';
        pill.classList.add('water-timer-pill--ready');
        pill.classList.remove('water-timer-pill--harvest');
        card.classList.add('ready-to-water');
      } else {
        pillText.textContent = formatMMSS(remaining);
        pill.classList.remove('water-timer-pill--ready', 'water-timer-pill--harvest');
        card.classList.remove('ready-to-water');
      }
    });
  }

  if (!window.__waterTickStarted) {
    window.__waterTickStarted = true;
    setInterval(tickWaterTimers, 1000);
  }

  document.getElementById('btn-garden-plant-more').addEventListener('click', () => {
    if (getGarden().length >= ALL_PLANT_IDS.length) return;
    openPlantSelection();
  });

  function harvestYield(plant) {
    const category = PLANT_CATEGORY[plant.id];
    if (category === 'trees') return 1;
    if (category === 'shrubs' || category === 'vegetables') return 2;
    return 3;
  }

  document.getElementById('garden-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-garden-action]');
    const card = event.target.closest('.garden-pot-card');
    if (!button || !card) return;
    const index = Number(card.dataset.gardenIndex);
    const garden = getGarden();
    const plant = garden[index];
    if (!plant) return;

    if (button.dataset.gardenAction === 'upgrade-pot') {
      if (!plantNeedsPotUpgrade(plant)) return;
      const price = LARGE_POT_PRICE[PLANT_CATEGORY[plant.id]] || 55;
      if (getCoins() < price) {
        showWeatherToast(`Для большого горшка нужно ${price} монет.`);
        return;
      }
      setCoins(getCoins() - price);
      plant.potLevel = 2;
      plant.lastWatered = Date.now();
      saveGarden(garden);
      showWeatherToast(`${PLANT_CATALOG[plant.id]} пересажен в большой горшок.`);
    } else if (button.dataset.gardenAction === 'harvest') {
      if (plantIsWilted(plant)) {
        renderGarden(activeGardenView);
        return;
      }
      if (!plantIsHarvestReady(plant)) return;
      const amount = harvestYield(plant);
      addHarvestToInventory(plant.id, amount);
      plant.growthPoints = 3;
      plant.harvestReadyAt = null;
      plant.lastWatered = Date.now();
      saveGarden(garden);
      showWeatherToast(`Урожай собран: ${HARVEST_NAMES[plant.id] || PLANT_CATALOG[plant.id]} × ${amount}.`);
    } else if (button.dataset.gardenAction === 'clear-wilted') {
      if (!plantIsWilted(plant)) return;
      plant.growthPoints = 3;
      plant.harvestReadyAt = null;
      plant.lastWatered = Date.now();
      saveGarden(garden);
      showWeatherToast('Увядший урожай убран. Растение снова может расти.');
    }
    renderGarden(activeGardenView);
  });

  function updateWarehouseCount() {
    const count = Object.values(getInventory()).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const badge = document.getElementById('warehouse-count');
    if (badge) badge.textContent = String(count);
  }

  function renderWarehouse() {
    const list = document.getElementById('warehouse-list');
    if (!list) return;
    const entries = Object.entries(getInventory()).filter(([, amount]) => Number(amount) > 0);
    if (!entries.length) {
      list.innerHTML = `<div class="warehouse-empty"><strong>Склад пока пуст</strong><span>Выращивай растения до зрелости и собирай урожай.</span></div>`;
      return;
    }
    list.innerHTML = entries.map(([id, amount]) => `
      <div class="warehouse-item">
        <div class="warehouse-item-plant"><svg viewBox="0 0 56 56" aria-hidden="true">${PLANT_SVG_INNER[id] || ''}</svg></div>
        <span>${HARVEST_NAMES[id] || PLANT_CATALOG[id] || id}</span>
        <strong>× ${amount}</strong>
      </div>`).join('');
  }

  let warehouseReturnFocus = null;
  function setWarehouseOpen(open) {
    const modal = document.getElementById('warehouse-modal');
    if (!modal) return;
    if (open) warehouseReturnFocus = document.activeElement;
    modal.hidden = !open;
    document.body.classList.toggle('warehouse-open', open);
    if (open) {
      renderWarehouse();
      requestAnimationFrame(() => modal.querySelector('.warehouse-close')?.focus());
    } else if (warehouseReturnFocus && document.contains(warehouseReturnFocus)) {
      warehouseReturnFocus.focus();
      warehouseReturnFocus = null;
    }
  }

  document.getElementById('warehouse-button').addEventListener('click', () => setWarehouseOpen(true));
  document.getElementById('warehouse-modal').addEventListener('click', event => {
    if (event.target.closest('[data-warehouse-close]')) setWarehouseOpen(false);
  });
  document.addEventListener('keydown', event => {
    const modal = document.getElementById('warehouse-modal');
    if (event.key === 'Escape' && modal && !modal.hidden) setWarehouseOpen(false);
  });
  updateWarehouseCount();

  /* Small garden visitors. They are occasional, clickable moments rather
     than a second timer system, so the garden stays calm between visits. */
  let gardenVisitorTimer = null;
  function scheduleGardenVisitor(delay) {
    clearTimeout(gardenVisitorTimer);
    gardenVisitorTimer = setTimeout(spawnGardenVisitor, delay || (45000 + Math.random() * 45000));
  }

  function spawnGardenVisitor(forcedType) {
    const screen = document.getElementById('screen-garden');
    const warehouseOpen = document.getElementById('warehouse-modal') && !document.getElementById('warehouse-modal').hidden;
    if (!screen || !screen.classList.contains('active') || warehouseOpen || screen.querySelector('.garden-visitor')) {
      scheduleGardenVisitor(20000);
      return;
    }
    const type = forcedType || (Math.random() < 0.55 ? 'butterfly' : 'bee');
    const visitor = document.createElement('button');
    visitor.type = 'button';
    visitor.className = `garden-visitor garden-visitor--${type}`;
    visitor.setAttribute('aria-label', type === 'bee' ? 'Поймать пчелу' : 'Поймать бабочку');
    const minY = 170;
    const maxY = Math.max(minY + 70, Math.min(420, Math.round(screen.clientHeight * 0.48)));
    visitor.style.setProperty('--visitor-y', `${minY + Math.round(Math.random() * (maxY - minY))}px`);
    visitor.textContent = type === 'bee' ? '🐝' : '🦋';
    screen.appendChild(visitor);
    let caught = false;
    visitor.addEventListener('click', () => {
      if (caught) return;
      caught = true;
      if (type === 'bee') {
        const reward = 8 + Math.floor(Math.random() * 6);
        addCoins(reward);
        showWeatherToast(`Пчела принесла ${reward} монет.`);
      } else {
        addGems(1);
        showWeatherToast('Бабочка принесла 1 гем.');
      }
      visitor.classList.add('is-caught');
      setTimeout(() => visitor.remove(), 350);
    });
    setTimeout(() => visitor.remove(), 15000);
    scheduleGardenVisitor();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    const preview = params.get('event-preview');
    if ((preview === 'bee' || preview === 'butterfly') && ['localhost', '127.0.0.1'].includes(location.hostname)) {
      setTimeout(() => spawnGardenVisitor(preview), 1200);
    } else {
      scheduleGardenVisitor();
    }
  });

  /* ── Watering can: drag & drop ──────────────────────────────────
     Mirrors the seed-bag drag mechanic (mousedown/mousemove/mouseup,
     position:fixed while dragging), but the drop target is dynamic —
     any currently rendered garden-pot-card, tested with a generous
     margin so the user doesn't have to land pixel-perfect. */
  document.addEventListener('DOMContentLoaded', () => {
    const canEl = document.getElementById('watering-can');
    if (!canEl) return;

    const DROP_MARGIN = 50; // px of slack around each card's rect

    // .nav-extras has its own CSS transform, which makes it the containing
    // block for any `position: fixed` descendant — so a fixed watering-can
    // left inside it does NOT track the viewport/cursor correctly. We
    // detach the element to <body> for the duration of the drag (and put
    // it back where it belongs once it's home again) to sidestep that.
    const homeParent = canEl.parentNode;
    const homeNextSibling = canEl.nextSibling;

    let dragging = false;
    let pointerOffsetX = 0, pointerOffsetY = 0;
    let originLeft = 0, originTop = 0;

    function rectsOverlap(a, b, margin) {
      return !(a.right  < b.left  - margin ||
               a.left   > b.right + margin ||
               a.bottom < b.top   - margin ||
               a.top    > b.bottom + margin);
    }

    function findDropCard(canRect) {
      const cards = document.querySelectorAll('#screen-garden.active .garden-pot-card');
      for (const card of cards) {
        if (rectsOverlap(canRect, card.getBoundingClientRect(), DROP_MARGIN)) return card;
      }
      return null;
    }

    function spawnDrops(targetRect) {
      const baseX = targetRect.left + targetRect.width / 2;
      const baseY = targetRect.top + targetRect.height * 0.35;
      for (let i = 0; i < 4; i++) {
        const drop = document.createElement('div');
        drop.className = 'water-drop';
        drop.style.left = (baseX - 10 + Math.random() * 20) + 'px';
        drop.style.top  = (baseY - 10) + 'px';
        drop.style.animationDelay = (i * 90) + 'ms';
        document.body.appendChild(drop);
        setTimeout(() => drop.remove(), 800 + i * 90);
      }
    }

    function returnCanHome() {
      canEl.style.transition = 'left 0.3s ease, top 0.3s ease, transform 0.18s ease';
      canEl.style.left = originLeft + 'px';
      canEl.style.top  = originTop  + 'px';
      setTimeout(() => {
        // Put it back into its original spot in the nav, then clear all
        // the inline positioning styles we added for the drag.
        if (homeNextSibling) {
          homeParent.insertBefore(canEl, homeNextSibling);
        } else {
          homeParent.appendChild(canEl);
        }
        canEl.style.position = '';
        canEl.style.left = '';
        canEl.style.top  = '';
        canEl.style.margin = '';
        canEl.style.transition = '';
        canEl.style.zIndex = '';
      }, 300);
    }

    /* The reward always lands quickly. Large payouts are grouped into at
       most six visual particles instead of spawning one particle per coin. */
    function flyCoinsToNav(fromRect, count) {
      const coinsPill = document.getElementById('coins-count');
      if (!coinsPill) { addCoins(count); return; }

      const targetRect = coinsPill.getBoundingClientRect();
      const targetX = targetRect.left + targetRect.width  / 2;
      const targetY = targetRect.top  + targetRect.height / 2;

      // Origin: centre of the plant zone
      const startX = fromRect.left + fromRect.width  / 2;
      const startY = fromRect.top  + fromRect.height / 2;

      const particleCount = Math.min(6, Math.max(1, count));
      const baseChunk = Math.floor(count / particleCount);
      const remainder = count % particleCount;

      for (let i = 0; i < particleCount; i++) {
        const delay = i * 70;
        const landedAmount = baseChunk + (i < remainder ? 1 : 0);

        setTimeout(() => {
          const coin = document.createElement('div');
          coin.className = 'flying-coin';
          coin.textContent = '✦';
          coin.style.left = (startX - 10) + 'px';
          coin.style.top  = (startY - 10) + 'px';
          coin.style.opacity = '0';
          document.body.appendChild(coin);

          // Arc flight via rAF. We animate along a quadratic Bézier:
          //   P(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
          // where P1 is a control point above and to the side of the path,
          // giving a natural upward-then-descending arc.
          const DURATION = 680; // ms
          const ctrlX = (startX + targetX) / 2 + (Math.random() - 0.5) * 80;
          const ctrlY = Math.min(startY, targetY) - 80 - Math.random() * 40;

          let startTime = null;

          function step(ts) {
            if (!startTime) startTime = ts;
            const elapsed = ts - startTime;
            const t = Math.min(elapsed / DURATION, 1);
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out

            const u = 1 - ease;
            const x = u * u * startX + 2 * u * ease * ctrlX + ease * ease * targetX;
            const y = u * u * startY + 2 * u * ease * ctrlY + ease * ease * targetY;

            coin.style.left = (x - 10) + 'px';
            coin.style.top  = (y - 10) + 'px';
            // Fade in quickly, then fade out only in the last 20% of travel
            coin.style.opacity = t < 0.12
              ? String(t / 0.12)
              : t > 0.80
              ? String(1 - (t - 0.80) / 0.20)
              : '1';
            coin.style.transform = `scale(${1 - t * 0.35})`;

            if (t < 1) {
              requestAnimationFrame(step);
            } else {
              coin.remove();
              addCoins(landedAmount);
            }
          }

          requestAnimationFrame(step);
        }, delay);
      }
    }

    /* ── Watering sound via Web Audio API ──────────────────────────
       Pink-ish noise through a lowpass filter, shaped by a gain
       envelope: quick attack → sustain → fade out. No external files. */
    /* ── Flying gems animation ──────────────────────────────────── */
    function flyGemsToNav(fromRect, count) {
      const gemsPill = document.getElementById('gems-count');
      if (!gemsPill) { addGems(count); return; }

      const targetRect = gemsPill.getBoundingClientRect();
      const targetX = targetRect.left + targetRect.width  / 2;
      const targetY = targetRect.top  + targetRect.height / 2;
      const startX  = fromRect.left + fromRect.width  / 2;
      const startY  = fromRect.top  + fromRect.height / 2;

      for (let i = 0; i < count; i++) {
        const delay = i * 120;
        setTimeout(() => {
          const gem = document.createElement('div');
          gem.className   = 'flying-gem';
          gem.textContent = '◆';
          gem.style.left    = (startX - 10) + 'px';
          gem.style.top     = (startY - 10) + 'px';
          gem.style.opacity = '0';
          document.body.appendChild(gem);

          const DURATION = 700;
          const ctrlX = (startX + targetX) / 2 + (Math.random() - 0.5) * 70;
          const ctrlY = Math.min(startY, targetY) - 90 - Math.random() * 35;
          let startTime = null;

          function step(ts) {
            if (!startTime) startTime = ts;
            const t    = Math.min((ts - startTime) / DURATION, 1);
            const ease = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
            const u    = 1 - ease;
            const x    = u*u*startX + 2*u*ease*ctrlX + ease*ease*targetX;
            const y    = u*u*startY + 2*u*ease*ctrlY + ease*ease*targetY;

            gem.style.left      = (x - 10) + 'px';
            gem.style.top       = (y - 10) + 'px';
            gem.style.opacity   = t < 0.12 ? String(t / 0.12)
                                : t > 0.80 ? String(1 - (t - 0.80) / 0.20)
                                : '1';
            gem.style.transform = `scale(${1 - t * 0.35})`;

            if (t < 1) {
              requestAnimationFrame(step);
            } else {
              gem.remove();
              addGems(1);
            }
          }
          requestAnimationFrame(step);
        }, delay);
      }
    }

    /* ── Core watering action — shared by hover and mouseup paths ── */
    function waterPlant(card) {
      const index = parseInt(card.dataset.gardenIndex, 10);
      const garden = getGarden();
      const plant = garden[index];
      if (!plant) return false;
      if (!canWaterPlant(plant)) return false;
      if (msUntilNextWater(plant) > 0) return false;

      const plantZone = card.querySelector('.microgreen-canopy') ||
                        card.querySelector('.microgreen-tray-zone') ||
                        card.querySelector('.garden-plant') ||
                        card.querySelector('.garden-pot-zone');
      const fromRect  = plantZone.getBoundingClientRect();

      spawnDrops(fromRect);

      const wateredAt = Date.now();
      plant.lastWatered = wateredAt;
      advancePlantGrowth(plant, wateredAt);
      saveGarden(garden);

      const isMicrogreen = plant.kind === 'microgreen' || MICROGREEN_IDS.includes(plant.id);
      const weatherBonus = applyManualWeatherBonus(plant, randomWaterReward(plant));
      flyCoinsToNav(fromRect, weatherBonus.coinReward);

      if (weatherBonus.rainbowBonus) {
        showWeatherToast(`Радуга усилила полив. Получено ${weatherBonus.coinReward} монет.`);
      }

      if (Math.random() < (isMicrogreen ? 0.20 : 0.13) + weatherBonus.gemChanceBonus) {
        flyGemsToNav(fromRect, Math.floor(Math.random() * 3) + 1);
      }

      if (isMicrogreen) renderMicrogreens();
      else renderGarden(activeGardenView);
      tickWaterTimers();

      return true;
    }

    /* ── Watering can drag (hover-to-water mechanic) ────────────────
       mousedown  → detach can to <body>, follow cursor
       mousemove  → update can position; if over a ready card → water
                    it; drag continues so user can water the next plant
       mouseup    → end drag, return can home */
    let lastWateredCard = null; // prevents re-firing while hovering same card

    function onPointerDown(e) {
      e.preventDefault();
      dragging = true;
      lastWateredCard = null;

      const rect = canEl.getBoundingClientRect();
      originLeft     = rect.left;
      originTop      = rect.top;
      pointerOffsetX = e.clientX - rect.left;
      pointerOffsetY = e.clientY - rect.top;

      // Detach to <body> to escape the transformed .nav-extras container
      document.body.appendChild(canEl);
      canEl.style.position   = 'fixed';
      canEl.style.left       = originLeft + 'px';
      canEl.style.top        = originTop  + 'px';
      canEl.style.margin     = '0';
      canEl.style.transition = 'none';
      canEl.style.zIndex     = '9999';
      canEl.classList.add('dragging');

      document.addEventListener('pointermove', onPointerMove, { passive: false });
      document.addEventListener('pointerup',   onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(e) {
      if (!dragging) return;
      if (e.cancelable) e.preventDefault();

      // Follow cursor
      canEl.style.left = (e.clientX - pointerOffsetX) + 'px';
      canEl.style.top  = (e.clientY - pointerOffsetY) + 'px';

      // Check if the cursor (not the can rect) is over any garden card
      const cards = document.querySelectorAll('#screen-garden.active .garden-pot-card');
      for (const card of cards) {
        const r = card.getBoundingClientRect();
        const inCard = e.clientX >= r.left - DROP_MARGIN &&
                       e.clientX <= r.right  + DROP_MARGIN &&
                       e.clientY >= r.top    - DROP_MARGIN &&
                       e.clientY <= r.bottom + DROP_MARGIN;
        if (inCard) {
          // Only water if the timer has expired and we haven't just watered this card
          if (card !== lastWateredCard) {
            const watered = waterPlant(card);
            if (watered) lastWateredCard = card;
          }
          return;
        } else if (card === lastWateredCard) {
          // Cursor left the card we just watered — reset so it can be
          // watered again next time its timer expires
          lastWateredCard = null;
        }
      }
    }

    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup',   onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      canEl.classList.remove('dragging');
      // Mouseup without hitting a ready plant — just return home
      returnCanHome();
    }

    canEl.addEventListener('pointerdown', onPointerDown);
  });
