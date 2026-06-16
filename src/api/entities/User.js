const STORAGE_KEY = "entities_users";

// Roles: organizer | marketing_partner | exhibitor | attendee
// organizer and marketing_partner have console access

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

export const User = {
  async list(sortBy = null) {
    const items = load();
    if (sortBy) {
      const desc = sortBy.startsWith("-");
      const key = desc ? sortBy.slice(1) : sortBy;
      items.sort((a, b) => {
        if (a[key] > b[key]) return desc ? -1 : 1;
        if (a[key] < b[key]) return desc ? 1 : -1;
        return 0;
      });
    }
    return items;
  },

  async get(id) {
    return load().find((u) => u.id === id) || null;
  },

  async findByEmail(email) {
    return load().find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null;
  },

  async create(data) {
    const items = load();
    if (items.find((u) => u.email?.toLowerCase() === data.email?.toLowerCase())) {
      throw new Error("A user with that email already exists.");
    }
    const newUser = {
      id: generateId(),
      role: "attendee",
      status: "active",
      ...data,
      created_date: new Date().toISOString(),
    };
    items.push(newUser);
    save(items);
    return newUser;
  },

  async update(id, data) {
    const items = load();
    const index = items.findIndex((u) => u.id === id);
    if (index === -1) throw new Error("User not found");
    items[index] = { ...items[index], ...data };
    save(items);
    return items[index];
  },

  async delete(id) {
    const items = load().filter((u) => u.id !== id);
    save(items);
  },

  async filter(query = {}) {
    const items = load();
    return items.filter((u) =>
      Object.entries(query).every(([key, value]) => u[key] === value)
    );
  },
};