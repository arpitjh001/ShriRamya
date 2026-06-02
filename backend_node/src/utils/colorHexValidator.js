function validateHexCode(hexCode) {
  if (!hexCode || typeof hexCode !== 'string') {
    return false;
  }
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexCode);
}

module.exports = {
  validateHexCode
};
