// Local app client — no external SDK required.
// Entities use localStorage; extend this if a real backend is added later.

export const client = {
  appId: "minecon",
  isAuthenticated: () => true,
};
