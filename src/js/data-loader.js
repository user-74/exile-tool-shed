// src/js/data-loader.js
const distilled = [
  "Diluted Liquid Ire",
  "Diluted Liquid Guilt",
  "Diluted Liquid Greed",
  "Liquid Paranoia",
  "Liquid Envy",
  "Liquid Disgust",
  "Liquid Despair",
  "Concentrated Liquid Fear",
  "Concentrated Liquid Suffering",
  "Concentrated Liquid Isolation"
]

const shortNames = {
  "Diluted Liquid Ire": "ire",
  "Diluted Liquid Guilt": "guilt",
  "Diluted Liquid Greed": "greed",
  "Liquid Paranoia": "paranoia",
  "Liquid Envy": "envy",
  "Liquid Disgust": "disgust",
  "Liquid Despair": "despair",
  "Concentrated Liquid Fear": "fear",
  "Concentrated Liquid Suffering": "suffering",
  "Concentrated Liquid Isolation": "isolation"
}

const fileNames = distilled.map(x => `./assets/${shortNames[x]}.webp`)

const w = [1, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683];
let prefixCache = null;
let valuesCacheKey = null;

const recipeMetadata = new Map();

function getValuesCacheKey(values) {
  return values.join(',');
}

function computePrefixSum(values) {
  const prefix = new Array(11);
  prefix[0] = 0;
  for (let i = 0; i < 10; i++) {
    prefix[i + 1] = prefix[i] + values[i] * w[i];
  }
  return prefix;
}

function precomputeRecipe(tier0, tier1, tier2) {
  const required = new Uint8Array(10);
  required[tier0]++;
  required[tier1]++;
  required[tier2]++;

  const tiers = [];
  for (let i = 0; i < 10; i++) {
    if (required[i]) tiers.push(i);
  }

  const costs = tiers.map(t => required[t] * w[t]);

  const recipeKey = [tier0, tier1, tier2].sort((a, b) => a - b).join(',');

  return {
    tiers,        // [5, 7, 9] - sorted unique tiers needed
    required,     // Uint8Array of counts per tier
    costs,        // [243, 2187, 19683] - pre-computed costs
    recipeKey     // "5,7,9" - normalized key for deduplication
  };
}

function checkAvailabilityPrecomputed(recipeIdx) {
  const meta = recipeMetadata.get(recipeIdx);

  let availableValue = 0;

  for (let i = 0; i < meta.tiers.length; i++) {
    const t = meta.tiers[i];
    const prevT = i === 0 ? 0 : meta.tiers[i - 1] + 1;

    availableValue += prefixCache[t + 1] - prefixCache[prevT];
    if (availableValue < meta.costs[i]) {
      return false;
    }

    availableValue -= meta.costs[i];
  }

  return true;
}

document.addEventListener('alpine:init', () => {
  Alpine.store('appData', {
    csv: [],
    values: new Array(distilled.length).fill(0),
    show: [],
    search: "",
    reverseSort: false,

    async init() {
      await this.loadCSV('./src/data/results.0.4.csv');
    },

    async loadCSV(path) {
      return new Promise((resolve, reject) => {
        Papa.parse(path, {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            results.data.forEach((element, idx) => {
              element.description = element.description.replaceAll('\\n', '<br>');
              const tier0 = parseInt(element[0]);
              const tier1 = parseInt(element[1]);
              const tier2 = parseInt(element[2]);
              element[0] = tier0;
              element[1] = tier1;
              element[2] = tier2;

              recipeMetadata.set(idx, precomputeRecipe(tier0, tier1, tier2));
            });

            this.csv = results.data;
            this.resetShow();
            resolve(results.data);
          },
          error: (error) => {
            console.error('CSV parsing error:', error);
            reject(error);
          },
        });
      });
    },

    resetShow() {
      this.show = new Array(this.csv.length).fill(true)
    },

    reset() {
      this.values = new Array(distilled.length).fill(0);
      this.search = "";
      this.calculate();
    },

    toggleSort() {
      this.reverseSort = !this.reverseSort;
    },

    calculate() {
      if (!this.values.some(x => x > 0) && !this.search) {
        this.resetShow();
        return;
      }

      // Recompute prefix sum if values changed
      const currentKey = getValuesCacheKey(this.values);
      if (!prefixCache || valuesCacheKey !== currentKey) {
        prefixCache = computePrefixSum(this.values);
        valuesCacheKey = currentKey;
      }

      // Check each recipe
      this.show = this.csv.map((x, idx) => {
        const hasIngredients = !this.values.some(v => v > 0) || checkAvailabilityPrecomputed(idx);
        const matchesSearch = !this.search || searchResult(this.search.trim().toLowerCase(), x);
        return hasIngredients && matchesSearch;
      });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      Alpine.store('appData').search = '';
      Alpine.store('appData').calculate();
    }
  });
});

function searchResult(search, x) {
  return x.header.toLowerCase().includes(search) || x.description.toLowerCase().includes(search)
}