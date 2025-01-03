type RadioButtonGroupProps = {
    label: string;
    name: string;
    options: [string, string][];
    selectedValue: string;
    onChange: (value: string) => void;
};

const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({
    label,
    name,
    options,
    selectedValue,
    onChange,
}) => (
    <div className="space-y-3">
        <label className="text-yellow-100/90 text-base sm:text-lg font-semibold">{label}</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {options.map(([value, label]) => (
                <label
                    key={value}
                    className="flex items-center p-3 bg-gray-800/60 rounded-md border border-yellow-600/30 hover:border-yellow-400/50 transition-colors cursor-pointer group"
                >
                    <input
                        type="radio"
                        name={name}
                        value={value}
                        checked={selectedValue === value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-600"
                    />
                    <span className="ml-2 text-gray-300 group-hover:text-yellow-200 transition-colors text-sm sm:text-base">
                        {label}
                    </span>
                </label>
            ))}
        </div>
    </div>
);

export default RadioButtonGroup;