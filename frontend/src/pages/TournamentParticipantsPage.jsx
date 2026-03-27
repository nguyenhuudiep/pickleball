import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, Clock3, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { memberAPI, tournamentAPI } from '../services/api';

const normalizeId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
};

const sameId = (left, right) => normalizeId(left) === normalizeId(right);

const formatCurrencyVND = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const formatPairingTime = (value) => {
  if (!value) return 'Vừa ghép đôi';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return 'Vừa ghép đôi';
  return dateValue.toLocaleString('vi-VN');
};

const formatSkillLevel = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric.toFixed(1);
};

const getDefaultFinanceItem = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  description: '',
  type: 'income',
  amount: 0,
});

export const TournamentParticipantsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFinance, setSavingFinance] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('participants');
  const [members, setMembers] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [pendingSelection, setPendingSelection] = useState([]);
  const [editingPairId, setEditingPairId] = useState(null);
  const [editingDraft, setEditingDraft] = useState({ member1Id: '', member2Id: '' });
  const [financeItems, setFinanceItems] = useState([getDefaultFinanceItem()]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');
        const [tournamentRes, membersRes] = await Promise.all([
          tournamentAPI.getById(id),
          memberAPI.getAll(),
        ]);

        const tournamentData = tournamentRes.data.tournament;
        setTournament(tournamentData);
        const initialFinanceItems = Array.isArray(tournamentData.financeItems) && tournamentData.financeItems.length > 0
          ? tournamentData.financeItems.map((item, index) => ({
              id: `server-${index}-${Date.now()}`,
              description: item.description || '',
              type: item.type === 'expense' ? 'expense' : 'income',
              amount: Number(item.amount || 0),
            }))
          : [
              {
                id: `legacy-income-${Date.now()}`,
                description: 'Tài trợ',
                type: 'income',
                amount: Number(tournamentData.sponsorshipAmount || 0),
              },
              {
                id: `legacy-expense-${Date.now()}`,
                description: 'Chi phí tổ chức giải',
                type: 'expense',
                amount: Number(tournamentData.expenseAmount || 0),
              },
            ];
        setFinanceItems(initialFinanceItems);
        setMembers((membersRes.data.members || []).map((member) => ({ ...member, _id: String(member._id) })));
        const normalizedParticipants = (tournamentData.participants || []).map((participant) => ({
          memberId: normalizeId(participant.memberId?._id || participant.memberId),
          partnerMemberId: normalizeId(participant.partnerMemberId),
          rank: participant.rank || '',
          feePaid: Boolean(participant.feePaid),
          feeAmount: participant.feeAmount ?? 0,
          createdAt: participant.createdAt || null,
        }));

        const initialPairs = [];
        const visited = new Set();

        for (const participant of normalizedParticipants) {
          const member1Id = participant.memberId;
          const member2Id = participant.partnerMemberId;

          if (!member1Id || !member2Id || visited.has(member1Id) || visited.has(member2Id)) {
            continue;
          }

          const partner = normalizedParticipants.find((item) => sameId(item.memberId, member2Id));
          if (!partner) {
            continue;
          }

          initialPairs.push({
            pairId: `${member1Id}-${member2Id}`,
            member1Id,
            member2Id,
            rank: participant.rank || partner.rank || '',
            feePaid: Boolean(participant.feePaid || partner.feePaid),
            feeAmount: Number(participant.feeAmount || partner.feeAmount || 0),
            pairedAt: participant.createdAt || partner.createdAt || null,
          });

          visited.add(member1Id);
          visited.add(member2Id);
        }

        setPairs(initialPairs);
        setPendingSelection([]);
      } catch (err) {
        console.error('Error loading tournament participants:', err);
        setError(err.response?.data?.message || 'Không thể tải dữ liệu giải đấu');
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const selectedMemberIds = useMemo(() => {
    const ids = new Set();
    for (const pair of pairs) {
      ids.add(pair.member1Id);
      ids.add(pair.member2Id);
    }
    for (const idValue of pendingSelection) {
      ids.add(idValue);
    }
    return ids;
  }, [pairs, pendingSelection]);

  const handleToggleParticipant = (memberId) => {
    const normalizedMemberId = normalizeId(memberId);
    const pairContainingMember = pairs.find(
      (pair) => sameId(pair.member1Id, normalizedMemberId) || sameId(pair.member2Id, normalizedMemberId)
    );

    if (pairContainingMember) {
      setPairs((previous) => previous.filter((pair) => pair.pairId !== pairContainingMember.pairId));
      return;
    }

    if (pendingSelection.some((idValue) => sameId(idValue, normalizedMemberId))) {
      setPendingSelection((previous) => previous.filter((idValue) => !sameId(idValue, normalizedMemberId)));
      return;
    }

    const nextPending = [...pendingSelection, normalizedMemberId];
    if (nextPending.length < 2) {
      setPendingSelection(nextPending);
      return;
    }

    const [member1Id, member2Id] = nextPending;
    setPairs((previous) => [
      ...previous,
      {
        pairId: `${member1Id}-${member2Id}`,
        member1Id,
        member2Id,
        rank: '',
        feePaid: false,
        feeAmount: 0,
        pairedAt: new Date().toISOString(),
      },
    ]);
    setPendingSelection([]);
  };

  const handlePairChange = (pairId, key, value) => {
    setPairs((previous) =>
      previous.map((pair) => (pair.pairId === pairId ? { ...pair, [key]: value } : pair))
    );
  };

  const handleDeletePair = (pairId) => {
    setPairs((previous) => previous.filter((pair) => pair.pairId !== pairId));
    if (editingPairId === pairId) {
      setEditingPairId(null);
      setEditingDraft({ member1Id: '', member2Id: '' });
    }
  };

  const startEditPair = (pair) => {
    setEditingPairId(pair.pairId);
    setEditingDraft({
      member1Id: pair.member1Id,
      member2Id: pair.member2Id,
    });
  };

  const cancelEditPair = () => {
    setEditingPairId(null);
    setEditingDraft({ member1Id: '', member2Id: '' });
  };

  const memberUsedInOtherPairs = (currentPairId, memberId) => {
    return pairs.some(
      (pair) =>
        pair.pairId !== currentPairId &&
        (sameId(pair.member1Id, memberId) || sameId(pair.member2Id, memberId))
    );
  };

  const saveEditPair = (pairId) => {
    if (!editingDraft.member1Id || !editingDraft.member2Id) {
      setError('Vui lòng chọn đủ 2 vận động viên cho cặp.');
      return;
    }

    if (sameId(editingDraft.member1Id, editingDraft.member2Id)) {
      setError('Hai vận động viên trong cặp không được trùng nhau.');
      return;
    }

    if (memberUsedInOtherPairs(pairId, editingDraft.member1Id) || memberUsedInOtherPairs(pairId, editingDraft.member2Id)) {
      setError('Một trong hai vận động viên đã thuộc cặp khác.');
      return;
    }

    setError('');
    setPairs((previous) =>
      previous.map((pair) =>
        pair.pairId === pairId
          ? {
              ...pair,
              pairId: `${editingDraft.member1Id}-${editingDraft.member2Id}`,
              member1Id: editingDraft.member1Id,
              member2Id: editingDraft.member2Id,
            }
          : pair
      )
    );
    cancelEditPair();
  };

  const pairedParticipants = useMemo(() => {
    return pairs.map((pair) => {
      const left = members.find((item) => sameId(item._id, pair.member1Id));
      const right = members.find((item) => sameId(item._id, pair.member2Id));
      const leftSkill = Number(left?.skillLevel);
      const rightSkill = Number(right?.skillLevel);
      const totalSkill = Number.isFinite(leftSkill) && Number.isFinite(rightSkill)
        ? leftSkill + rightSkill
        : null;

      return {
        leftName: left ? left.name : pair.member1Id,
        rightName: right ? right.name : pair.member2Id,
        leftSkill,
        rightSkill,
        totalSkill,
        pairedAt: pair.pairedAt,
        feePaid: Boolean(pair.feePaid),
      };
    });
  }, [pairs, members]);

  const totalCollectedAmount = useMemo(() => {
    return pairs.reduce((total, pair) => {
      if (!pair.feePaid) return total;
      const amount = Number(pair.feeAmount || 0);
      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [pairs]);

  const financeIncomeAmount = useMemo(
    () => financeItems.reduce((sum, item) => (item.type === 'income' ? sum + Number(item.amount || 0) : sum), 0),
    [financeItems]
  );

  const financeExpenseAmount = useMemo(
    () => financeItems.reduce((sum, item) => (item.type === 'expense' ? sum + Number(item.amount || 0) : sum), 0),
    [financeItems]
  );

  const totalIncomeAmount = useMemo(
    () => Number(financeIncomeAmount || 0) + Number(totalCollectedAmount || 0),
    [financeIncomeAmount, totalCollectedAmount]
  );

  const profitAmount = useMemo(
    () => totalIncomeAmount - Number(financeExpenseAmount || 0),
    [totalIncomeAmount, financeExpenseAmount]
  );

  const filteredMembers = useMemo(() => {
    const query = memberSearchTerm.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) =>
      (member.name || '').toLowerCase().includes(query) ||
      (member.username || '').toLowerCase().includes(query)
    );
  }, [members, memberSearchTerm]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const payloadParticipants = pairs.flatMap((pair) => {
        const rankValue = pair.rank === '' || pair.rank === null ? null : Number(pair.rank);
        const feeAmount = Number(pair.feeAmount || 0);
        const feePaid = Boolean(pair.feePaid);

        return [
          {
            memberId: pair.member1Id,
            partnerMemberId: pair.member2Id,
            rank: Number.isFinite(rankValue) ? rankValue : null,
            result: '',
            isDoublesParticipant: true,
            feePaid,
            feeAmount,
          },
          {
            memberId: pair.member2Id,
            partnerMemberId: pair.member1Id,
            rank: Number.isFinite(rankValue) ? rankValue : null,
            result: '',
            isDoublesParticipant: true,
            feePaid,
            feeAmount,
          },
        ];
      });

      await tournamentAPI.updateParticipants(id, payloadParticipants);
      setSuccessMessage('Lưu danh sách vận động viên thành công.');
    } catch (err) {
      console.error('Error saving tournament participants:', err);
      setError(err.response?.data?.message || 'Không thể lưu danh sách VĐV');
      setSuccessMessage('');
    }
    setSaving(false);
  };

  const handleSaveFinance = async () => {
    try {
      setSavingFinance(true);
      setError('');
      setSuccessMessage('');

      const payloadItems = financeItems
        .map((item) => ({
          description: String(item.description || '').trim(),
          type: item.type === 'expense' ? 'expense' : 'income',
          amount: Number(item.amount || 0),
        }))
        .filter((item) => item.description || item.amount > 0);

      const { data } = await tournamentAPI.updateFinance(id, {
        financeItems: payloadItems,
      });

      setTournament(data.tournament);
      const updatedItems = Array.isArray(data.tournament?.financeItems) && data.tournament.financeItems.length > 0
        ? data.tournament.financeItems.map((item, index) => ({
            id: `saved-${index}-${Date.now()}`,
            description: item.description || '',
            type: item.type === 'expense' ? 'expense' : 'income',
            amount: Number(item.amount || 0),
          }))
        : [getDefaultFinanceItem()];
      setFinanceItems(updatedItems);
      setSuccessMessage('Lưu thu chi giải đấu thành công.');
    } catch (err) {
      console.error('Error saving tournament finance:', err);
      setError(err.response?.data?.message || 'Không thể lưu thu chi giải đấu');
      setSuccessMessage('');
    }
    setSavingFinance(false);
  };

  const handleAddFinanceItem = () => {
    setFinanceItems((previous) => [...previous, getDefaultFinanceItem()]);
  };

  const handleDeleteFinanceItem = (itemId) => {
    setFinanceItems((previous) => {
      const remaining = previous.filter((item) => item.id !== itemId);
      return remaining.length > 0 ? remaining : [getDefaultFinanceItem()];
    });
  };

  const handleFinanceItemChange = (itemId, key, value) => {
    setFinanceItems((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [key]: key === 'amount' ? Number(value || 0) : value,
            }
          : item
      )
    );
  };

  if (loading) {
    return (
      <Layout>
        <p className="text-gray-600">Đang tải thông tin vận động viên...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Vận Động Viên Tham Gia Giải</h1>
            <p className="text-gray-600 mt-1">{tournament?.name} - {tournament?.date ? new Date(tournament.date).toLocaleDateString('vi-VN') : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/tournaments')} className="btn btn-secondary flex items-center gap-2">
              <ArrowLeft size={16} />
              Quay Lại
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2 disabled:opacity-60">
              <Save size={16} />
              {saving ? 'Đang lưu...' : 'Lưu Danh Sách'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        <div className="card p-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('participants')}
              className={`btn ${activeTab === 'participants' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Ghép Cặp VĐV
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className={`btn ${activeTab === 'finance' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Danh Sách Thu Chi
            </button>
          </div>
        </div>

        {activeTab === 'participants' && (
        <>
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Chọn Thành Viên Tham Gia</h2>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Tìm thành viên theo tên hoặc username..."
              value={memberSearchTerm}
              onChange={(event) => setMemberSearchTerm(event.target.value)}
              className="flex-1 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto border rounded p-3">
            {filteredMembers.map((member) => {
              const selected = selectedMemberIds.has(String(member._id));
              return (
                <label key={member._id} className="flex items-center gap-2">
                  <input type="checkbox" checked={selected} onChange={() => handleToggleParticipant(member._id)} />
                  <span>{member.name}</span>
                </label>
              );
            })}
          </div>
            {!!pendingSelection.length && (
              <p className="text-sm text-amber-700">Đã chọn {pendingSelection.length}/2 VĐV. Chọn thêm 1 VĐV để tạo cặp.</p>
            )}
        </div>

        {pairs.length > 0 && (
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Cặp VĐV, Lệ Phí Và Thứ Hạng</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <p className="text-sm text-green-700">Tổng số tiền đã thu</p>
              <p className="text-xl font-bold text-green-800">{formatCurrencyVND(totalCollectedAmount)}</p>
            </div>

            {pairs.map((pair) => {
              const member1 = members.find((item) => sameId(item._id, pair.member1Id));
              const member2 = members.find((item) => sameId(item._id, pair.member2Id));
              const isEditing = editingPairId === pair.pairId;

              const memberOptions = members.filter((member) => {
                if (sameId(member._id, pair.member1Id) || sameId(member._id, pair.member2Id)) {
                  return true;
                }
                return !memberUsedInOtherPairs(pair.pairId, member._id);
              });

              return (
                <div key={pair.pairId} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center border rounded-lg p-3 bg-white">
                  {isEditing ? (
                    <select
                      className="input"
                      value={editingDraft.member1Id}
                      onChange={(event) => setEditingDraft((previous) => ({ ...previous, member1Id: event.target.value }))}
                    >
                      <option value="">Chọn VĐV 1</option>
                      {memberOptions.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={member1 ? member1.name : pair.member1Id} className="input bg-gray-50" disabled />
                  )}

                  {isEditing ? (
                    <select
                      className="input"
                      value={editingDraft.member2Id}
                      onChange={(event) => setEditingDraft((previous) => ({ ...previous, member2Id: event.target.value }))}
                    >
                      <option value="">Chọn VĐV 2</option>
                      {memberOptions.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={member2 ? member2.name : pair.member2Id} className="input bg-gray-50" disabled />
                  )}
                  <input
                    type="number"
                    placeholder="Thứ hạng"
                    value={pair.rank}
                    onChange={(event) => handlePairChange(pair.pairId, 'rank', event.target.value)}
                    className="input"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700 border rounded-lg px-3 py-2 h-[42px]">
                    <input
                      type="checkbox"
                      checked={Boolean(pair.feePaid)}
                      onChange={(event) => handlePairChange(pair.pairId, 'feePaid', event.target.checked)}
                    />
                    <span className="font-bold text-gray-800">Đã đóng lệ phí</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Số tiền lệ phí"
                    value={formatCurrencyVND(pair.feeAmount)}
                    onChange={(event) => {
                      const rawNumber = Number(String(event.target.value || '').replace(/[^\d]/g, ''));
                      handlePairChange(pair.pairId, 'feeAmount', Number.isFinite(rawNumber) ? rawNumber : 0);
                    }}
                    className="input border-red-400 text-red-700 font-semibold focus:ring-red-500"
                  />

                  <div className="flex gap-2 md:justify-end">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEditPair(pair.pairId)}
                          className="btn btn-primary flex items-center gap-1"
                        >
                          <Check size={14} />
                          Lưu Sửa
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditPair}
                          className="btn btn-secondary flex items-center gap-1"
                        >
                          <X size={14} />
                          Hủy
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditPair(pair)}
                          className="btn btn-secondary flex items-center gap-1"
                        >
                          <Pencil size={14} />
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePair(pair.pairId)}
                          className="btn bg-red-500 hover:bg-red-600 text-white flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pairedParticipants.length > 0 && (
          <div className="card space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">Các Cặp VĐV Đã Ghép ({pairedParticipants.length} cặp)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {pairedParticipants.map((pair, index) => (
                <div key={`${pair.leftName}-${pair.rightName}-${index}`} className="border rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-800 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={18} className={`${pair.feePaid ? 'text-green-600' : 'text-gray-300'} mt-0.5`} />
                    <div>
                      <p className="font-medium">{pair.leftName} - {pair.rightName}</p>
                      <p className="text-xs text-gray-600">
                        Tổng điểm trình: {pair.totalSkill !== null
                          ? `${formatSkillLevel(pair.leftSkill)} + ${formatSkillLevel(pair.rightSkill)} = ${formatSkillLevel(pair.totalSkill)}`
                          : 'Chưa có dữ liệu'}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                    <Clock3 size={14} />
                    {formatPairingTime(pair.pairedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
        )}

        {activeTab === 'finance' && (
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Danh Sách Thu Chi Của Giải</h2>

            <div className="flex justify-end">
              <button type="button" onClick={handleAddFinanceItem} className="btn btn-secondary flex items-center gap-2">
                <Plus size={16} />
                Thêm Dòng Thu Chi
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">STT</th>
                    <th className="text-left py-3 px-4">Khoản Mục</th>
                    <th className="text-left py-3 px-4">Loại</th>
                    <th className="text-right py-3 px-4">Số Tiền</th>
                    <th className="text-right py-3 px-4">Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-green-50">
                    <td className="py-3 px-4 font-medium">1</td>
                    <td className="py-3 px-4 font-medium">Lệ phí VĐV đã thu</td>
                    <td className="py-3 px-4"><span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs">Thu</span></td>
                    <td className="py-3 px-4 text-right font-semibold text-green-700">{formatCurrencyVND(totalCollectedAmount)}</td>
                    <td className="py-3 px-4" />
                  </tr>
                  {financeItems.map((item, index) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-4 font-medium">{index + 2}</td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Nhập nội dung thu/chi"
                          value={item.description}
                          onChange={(event) => handleFinanceItemChange(item.id, 'description', event.target.value)}
                          className="input"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={item.type}
                          onChange={(event) => handleFinanceItemChange(item.id, 'type', event.target.value)}
                          className="input"
                        >
                          <option value="income">Thu</option>
                          <option value="expense">Chi</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatCurrencyVND(item.amount)}
                          onChange={(event) => {
                            const rawNumber = Number(String(event.target.value || '').replace(/[^\d]/g, ''));
                            handleFinanceItemChange(item.id, 'amount', Number.isFinite(rawNumber) ? rawNumber : 0);
                          }}
                          className="input text-right border-red-400 text-red-700 font-semibold focus:ring-red-500"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteFinanceItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Xóa dòng"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm text-green-700">Tổng Thu</p>
                <p className="text-lg font-bold text-green-800">{formatCurrencyVND(totalIncomeAmount)}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">Tổng Chi</p>
                <p className="text-lg font-bold text-red-800">{formatCurrencyVND(financeExpenseAmount)}</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-700">Lợi Nhuận</p>
                <p className="text-lg font-bold text-blue-800">{formatCurrencyVND(profitAmount)}</p>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleSaveFinance}
                disabled={savingFinance}
                className="btn btn-primary"
              >
                {savingFinance ? 'Đang lưu thu chi...' : 'Lưu Thu Chi Giải'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
