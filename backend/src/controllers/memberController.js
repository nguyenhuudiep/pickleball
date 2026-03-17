const Member = require('../models/Member');
const bcrypt = require('bcryptjs');

const normalizeOptionalString = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

exports.getMembers = async (req, res) => {
  try {
    const members = await Member.find();
    res.status(200).json({ success: true, members });
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

    res.status(201).json({ success: true, member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.status(200).json({ success: true, member });
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
    
    // Lấy member hiện tại
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Cập nhật các fields khác
    Object.assign(member, updateData);

    // Cập nhật password nếu có
    const normalizedPassword = normalizeOptionalString(password);
    if (normalizedPassword) {
      if (normalizedPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
      }
      member.password = normalizedPassword;
    }

    // Lưu member (sẽ kích hoạt pre-save hook để hash password)
    await member.save();

    res.status(200).json({ success: true, member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    res.status(200).json({ success: true, message: 'Member deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
