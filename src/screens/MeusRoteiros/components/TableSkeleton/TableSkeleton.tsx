import React from 'react';

interface SkeletonRowProps {
  isEven: boolean;
}

const SkeletonRow: React.FC<SkeletonRowProps> = ({ isEven }) => {
  return (
    <tr className={`${isEven ? "bg-[#f7f7f7]" : "bg-white"}`}>
      {/* Nome do Roteiro */}
      <td className="px-6 py-4">
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer bg-[length:200%_100%] w-3/4"></div>
      </td>
      {/* Data de Criação */}
      <td className="px-6 py-4">
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer bg-[length:200%_100%] w-24"></div>
      </td>
      {/* Tipo de Roteiro / Status */}
      <td className="px-6 py-4">
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer bg-[length:200%_100%] w-28"></div>
      </td>
      {/* Período da Campanha */}
      <td className="px-6 py-4">
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer bg-[length:200%_100%] w-20"></div>
      </td>
      {/* Ações */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-4 justify-end">
          <div className="h-6 w-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer bg-[length:200%_100%]"></div>
          <div className="h-6 w-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer bg-[length:200%_100%]"></div>
          <div className="h-6 w-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer bg-[length:200%_100%]"></div>
        </div>
      </td>
    </tr>
  );
};

export const TableSkeleton: React.FC = () => {
  return (
    <>
      {[...Array(8)].map((_, idx) => (
        <SkeletonRow key={idx} isEven={idx % 2 === 0} />
      ))}
    </>
  );
};
