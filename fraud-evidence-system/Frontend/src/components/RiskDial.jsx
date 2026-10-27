import React from 'react';

const RiskDial = ({ score, tags }) => {
  const riskLevel = score > 80 ? "High" : score > 50 ? "Moderate" : "Low";
  const color = score > 80 ? "red" : score > 50 ? "orange" : "green";

  return (
    <div className="text-center p-4 rounded-lg shadow-md border w-48">
      <div className="text-xl font-bold">Risk Score</div>
      
      <div className={`text-4xl font-extrabold text-${color}-600`}>
        {score}
      </div>

      <div className={`text-${color}-500 font-medium`}>
        {riskLevel} Risk
      </div>

      <div className="mt-2 text-sm text-gray-500">
        Confidence: {(score || 0)}%
      </div>

      <div className="mt-3 flex flex-wrap justify-center">
        {tags?.map((tag, i) => (
          <span
            key={i}
            className="bg-gray-200 text-gray-700 text-xs px-2 py-1 m-1 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default RiskDial;
