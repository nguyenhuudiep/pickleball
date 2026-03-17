export const CardStat = ({ icon: Icon, title, value, color = 'bg-blue-500' }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="text-white" size={28} />
        </div>
      </div>
    </div>
  );
};
