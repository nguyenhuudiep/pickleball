const Member = require('../models/Member');
const MemberSkillHistory = require('../models/MemberSkillHistory');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { withMongoId, withMongoIdList } = require('../utils/apiMapper');

const normalizeOptionalString = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const getMembersVersionPayload = async () => {
  const [memberAggregateRows, historyAggregateRows] = await Promise.all([
    sequelize.query(
      `
      SELECT
        COUNT([id]) AS [total],
        MAX([updatedAt]) AS [lastUpdatedAt],
        SUM([skillLevel]) AS [skillLevelSum]
      FROM [members]
      `,
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `
      SELECT
        COUNT([id]) AS [historyTotal],
        MAX([createdAt]) AS [lastHistoryAt]
      FROM [member_skill_histories]
      `,
      { type: QueryTypes.SELECT }
    ),
  ]);

  const memberAggregate = memberAggregateRows?.[0] || null;
  const historyAggregate = historyAggregateRows?.[0] || null;

  const total = Number(memberAggregate?.total || 0);
  const skillLevelSum = Number(memberAggregate?.skillLevelSum || 0);
  const historyTotal = Number(historyAggregate?.historyTotal || 0);

  const memberUpdatedAt = memberAggregate?.lastUpdatedAt ? new Date(memberAggregate.lastUpdatedAt) : null;
  const historyUpdatedAt = historyAggregate?.lastHistoryAt ? new Date(historyAggregate.lastHistoryAt) : null;
  const parsedDate = [memberUpdatedAt, historyUpdatedAt]
    .filter((item) => item && !Number.isNaN(item.getTime()))
    .sort((first, second) => second.getTime() - first.getTime())[0] || null;
  const lastUpdatedAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null;

  return {
    total,
    lastUpdatedAt,
    historyTotal,
    version: `${total}:${historyTotal}:${skillLevelSum.toFixed(2)}:${lastUpdatedAt || '0'}`,
  };
};

exports.getMembers = async (req, res) => {
  try {
    const members = await Member.findAll({ order: [['createdAt', 'DESC']] });
    const versionPayload = await getMembersVersionPayload();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.status(200).json({ success: true, members: withMongoIdList(members), ...versionPayload });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMembersVersion = async (req, res) => {
  try {
    const versionPayload = await getMembersVersionPayload();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.status(200).json({ success: true, ...versionPayload });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPublicMembers = async (req, res) => {
  try {
    const members = await Member.findAll({
      attributes: ['id', 'name', 'membershipType', 'skillLevel', 'gender', 'status'],
      order: [['skillLevel', 'DESC'], ['name', 'ASC']],
    });
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

exports.getMemberSkillHistory = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const histories = await MemberSkillHistory.findAll({
      where: { memberId: member.id },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({ success: true, histories: withMongoIdList(histories) });
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
