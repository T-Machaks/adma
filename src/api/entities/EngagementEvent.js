const STORAGE_KEY = "entities_engagements";

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function save(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const EngagementEvent = {
  async list(sortBy = null) {
    const items = load();
    if (sortBy) {
      const desc = sortBy.startsWith('-');
      const key = desc ? sortBy.slice(1) : sortBy;
      items.sort((a, b) => {
        if (a[key] > b[key]) return desc ? -1 : 1;
        if (a[key] < b[key]) return desc ? 1 : -1;
        return 0;
      });
    }
    return items;
  },

  async create(data) {
    const items = load();
    const newItem = { id: generateId(), ...data, created_date: new Date().toISOString() };
    items.push(newItem);
    save(items);
    return newItem;
  },

  async filter(query = {}) {
    const items = load();
    return items.filter((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    );
  },

  async filterByExhibitor(exhibitorId, exhibitorName) {
    const items = load();
    return items.filter(
      (item) => item.exhibitor_id === exhibitorId || item.exhibitor_name === exhibitorName
    );
  },
};
