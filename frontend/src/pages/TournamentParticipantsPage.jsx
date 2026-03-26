import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Search } from 'lucide-react';
import { Layout } from '../components/Layout';
import { memberAPI, tournamentAPI } from '../services/api';

const normalizeId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
};

const sameId = (left, right) => normalizeId(left) === normalizeId(right);

export const TournamentParticipantsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [members, setMembers] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [pendingSelection, setPendingSelection] = useState([]);
  const [error, setError] = useState('');
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
        setMembers((membersRes.data.members || []).map((member) => ({ ...member, _id: String(member._id) })));
        const normalizedParticipants = (tournamentData.participants || []).map((participant) => ({
          memberId: normalizeId(participant.memberId?._id || participant.memberId),
          partnerMemberId: normalizeId(participant.partnerMemberId),
          rank: participant.rank || '',
          feePaid: Boolean(participant.feePaid),
          feeAmount: participant.feeAmount ?? 0,
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
      },
    ]);
    setPendingSelection([]);
  };

  const handlePairChange = (pairId, key, value) => {
    setPairs((previous) =>
      previous.map((pair) => (pair.pairId === pairId ? { ...pair, [key]: value } : pair))
    );
  };

  const pairedParticipants = useMemo(() => {
    return pairs.map((pair) => {
      const left = members.find((item) => sameId(item._id, pair.member1Id));
      const right = members.find((item) => sameId(item._id, pair.member2Id));
      return {
        leftName: left ? left.name : pair.member1Id,
        rightName: right ? right.name : pair.member2Id,
      };
    });
  }, [pairs, members]);

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
      navigate('/tournaments');
    } catch (err) {
      console.error('Error saving tournament participants:', err);
      setError(err.response?.data?.message || 'Không thể lưu danh sách VĐV');
    }
    setSaving(false);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto border rounded p-3">
            {filteredMembers.map((member) => {
              const selected = selectedMemberIds.has(String(member._id));
              return (
                <label key={member._id} className="flex items-center gap-2">
                  <input type="checkbox" checked={selected} onChange={() => handleToggleParticipant(member._id)} />
                  <span>{member.name} ({member.username})</span>
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

            {pairs.map((pair) => {
              const member1 = members.find((item) => sameId(item._id, pair.member1Id));
              const member2 = members.find((item) => sameId(item._id, pair.member2Id));
              return (
                <div key={pair.pairId} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                  <input type="text" value={member1 ? member1.name : pair.member1Id} className="input bg-gray-50" disabled />
                  <input type="text" value={member2 ? member2.name : pair.member2Id} className="input bg-gray-50" disabled />
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
                    Đã đóng phí
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Số tiền lệ phí"
                    value={pair.feeAmount ?? 0}
                    onChange={(event) => handlePairChange(pair.pairId, 'feeAmount', event.target.value)}
                    className="input"
                  />
                </div>
              );
            })}
          </div>
        )}

        {pairedParticipants.length > 0 && (
          <div className="card space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">Các Cặp VĐV Đã Ghép</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {pairedParticipants.map((pair, index) => (
                <div key={`${pair.leftName}-${pair.rightName}-${index}`} className="border rounded-lg px-3 py-2 bg-gray-50 text-sm text-gray-800">
                  {pair.leftName} - {pair.rightName}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
