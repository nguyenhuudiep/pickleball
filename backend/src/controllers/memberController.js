const Member = require('../models/Member');
const { withMongoId, withMongoIdList } = require('../utils/apiMapper');

const normalizeOptionalString = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

exports.getMembers = async (req, res) => {
  try {
    const members = await Member.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ success: true, members: withMongoIdList(members) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createMember = async (req, res) => {
  try {
    const { name, username, password, phone, address, membershipType, skillLevel, gender } = req.body;

    const normalizedUsername = normalizeOptionalString(username);
    const normalizedPassword = normalizeOptionalString(password);
    const normalizedPhone = normalizeOptionalString(phone);

    const member = await Member.create({
      name,
      username: normalizedUsername,
      password: normalizedPassword,
      phone: normalizedPhone,
      address,
      membershipType,
      skillLevel,
      gender,
    });

    res.status(201).json({ success: true, member: withMongoId(member) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMemberById = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.status(200).json({ success: true, member: withMongoId(member) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    if (Object.prototype.hasOwnProperty.call(updateData, 'username')) {
      updateData.username = normalizeOptionalString(updateData.username);
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'phone')) {
      updateData.phone = normalizeOptionalString(updateData.phone);
    }
    
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    Object.assign(member, updateData);

    // Cập nhật password nếu có
    const normalizedPassword = normalizeOptionalString(password);
    if (normalizedPassword) {
      if (normalizedPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
      }
      member.password = normalizedPassword;
    }

    await member.save();

    res.status(200).json({ success: true, member: withMongoId(member) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    await member.destroy();
    res.status(200).json({ success: true, message: 'Member deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
