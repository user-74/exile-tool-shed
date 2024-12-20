// src/js/data-loader.js
const distilled = [
  "Distilled Ire",
  "Distilled Guilt",
  "Distilled Greed",
  "Distilled Paranoia",
  "Distilled Envy",
  "Distilled Disgust",
  "Distilled Despair",
  "Distilled Fear",
  "Distilled Suffering",
  "Distilled Isolation"
]

const fileNames = distilled.map(x => `./assets/${x.toLocaleLowerCase().replace(/\s/g, '')}.webp`)

document.addEventListener('alpine:init', () => {
  Alpine.store('appData', {
    csv: [],
    values: new Array(distilled.length).fill(0),
    show: [],
    search: "",

    async init() {
      await this.loadCSV('./src/data/results.csv');
    },

    async loadCSV(path) {
      return new Promise((resolve, reject) => {
        Papa.parse(path, {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            results.data.forEach(element => {
              element.description = element.description.replaceAll('\\n', '<br>')
            });
            this.csv = results.data
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

    calculate() {
      if (!this.values.some(x => x > 0) && !this.search) {
        this.resetShow();
        return;
      }
      this.show = this.csv.map(x => (!this.values.some(x => x > 0) || checkAvailability(this.values, x)) && (!this.search.trim().toLocaleLowerCase() || searchResult(this.search, x)))
    }
  });

  // Listen for the keydown event
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      Alpine.store('appData').search = '';  // Clear the search input in the store
      Alpine.store('appData').calculate();
    }
  });
});

function checkAvailability(values, x) {
  // Create a copy of the values array to track availability
  const available = [...values];

  // Check if there are enough available values for each requested index
  for (let i = 0; i < 3; i++) {
    const index = x[i];
    if (available[index] <= 0) {
      return false; // If any index has no available items, return false
    }
    available[index]--; // Decrease the available items at that index
  }

  return true; // If loop completes, return true
}

function searchResult(search, x) {
  return x.header.toLocaleLowerCase().includes(search) || x.description.toLocaleLowerCase().includes(search)
}