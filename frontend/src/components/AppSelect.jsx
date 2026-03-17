import Select from 'react-select';

const selectClassNames = {
  control: (state) =>
    [
      '!min-h-[42px] !rounded-lg !border',
      state.isFocused ? '!border-blue-500 !ring-2 !ring-blue-500/20' : '!border-gray-300',
      '!bg-white !shadow-none',
    ].join(' '),
  valueContainer: () => '!px-3 !py-0',
  placeholder: () => '!text-gray-400',
  singleValue: () => '!text-gray-800',
  menu: () => '!mt-1 !rounded-lg !border !border-gray-200 !shadow-lg !z-50',
  menuList: () => '!py-1',
  option: (state) =>
    [
      '!px-3 !py-2 !text-sm !cursor-pointer',
      state.isFocused ? '!bg-gray-100' : '',
      state.isSelected ? '!bg-teal-600 !text-white' : '!text-gray-800',
    ].join(' '),
  indicatorsContainer: () => '!pr-2',
  dropdownIndicator: () => '!text-gray-500 hover:!text-gray-700',
  clearIndicator: () => '!text-gray-400 hover:!text-gray-600',
};

export const AppSelect = ({
  options,
  value,
  onChange,
  placeholder,
  isSearchable = false,
  isClearable = false,
  className,
  ...restProps
}) => {
  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      isSearchable={isSearchable}
      isClearable={isClearable}
      className={className}
      classNames={selectClassNames}
      classNamePrefix="app-select"
      {...restProps}
    />
  );
};
