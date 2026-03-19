const toPlain = (record) => {
  if (!record) return null;
  if (typeof record.get === 'function') return record.get({ plain: true });
  return record;
};

const withMongoId = (record) => {
  const plain = toPlain(record);
  if (!plain) return null;

  const mapped = { ...plain, _id: String(plain.id) };
  delete mapped.id;
  return mapped;
};

const withMongoIdList = (records) => (records || []).map(withMongoId);

module.exports = {
  toPlain,
  withMongoId,
  withMongoIdList,
};
