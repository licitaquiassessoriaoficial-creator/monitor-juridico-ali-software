const OAB_REGEX = /^(\d{4,6})-?([A-Z]{2})$/;
const UF_LIST = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

function normalizeOAB(oab) {
  if (!oab) return '';
  const match = oab.match(OAB_REGEX);
  if (!match) return '';
  const num = match[1];
  const uf = match[2];
  return `${num}-${uf}`;
}

function validateOAB(req, res, next) {
  const oab = (req.body.oab || '').toUpperCase().replace(/\s/g, '');
  const match = oab.match(OAB_REGEX);
  if (!match || !UF_LIST.includes(match[2])) {
    return res.status(400).json({ message: "OAB inválida. Use 6 dígitos + UF, ex: 123456-SP" });
  }
  req.body.oab = normalizeOAB(oab);
  next();
}

module.exports = { validateOAB, normalizeOAB };