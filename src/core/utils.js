export function shuffle(input, random = Math.random) {
  const list = [...input];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [list[index], list[randomIndex]] = [list[randomIndex], list[index]];
  }
  return list;
}

export function applyTemplate(template, variables = {}) {
  return String(template ?? "").replace(/\{(\w+)\}/g, (_match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return String(variables[key]);
    }
    return "";
  });
}

export function chunk(array, size) {
  const groups = [];
  for (let index = 0; index < array.length; index += size) {
    groups.push(array.slice(index, index + size));
  }
  return groups;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
