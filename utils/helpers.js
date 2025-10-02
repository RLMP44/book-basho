function formatNameForDisplay(name) {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export {
  formatNameForDisplay,
};
